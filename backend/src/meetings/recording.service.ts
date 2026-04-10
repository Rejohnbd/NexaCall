import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Meeting } from './entities/meeting.entity';
import * as path from 'path';
import * as fs from 'fs';
import { spawn, ChildProcess } from 'child_process';
import * as puppeteer from 'puppeteer';

@Injectable()
export class RecordingService {
    private readonly logger = new Logger(RecordingService.name);
    private activeRecordings = new Map<string, {
        browser: puppeteer.Browser;
        ffmpeg: ChildProcess;
        filePath: string;
        startTime: Date;
    }>();

    constructor(
        @InjectRepository(Meeting)
        private meetingRepository: Repository<Meeting>,
    ) {
        // Ensure recordings directory exists
        const recordingsDir = path.join(process.cwd(), 'recordings');
        if (!fs.existsSync(recordingsDir)) {
            fs.mkdirSync(recordingsDir, { recursive: true });
        }
    }

    async startRecording(roomId: string) {
        if (this.activeRecordings.has(roomId)) {
            this.logger.warn(`Recording already in progress for room: ${roomId}`);
            return;
        }

        try {
            this.logger.log(`Starting composite recording for room: ${roomId}`);

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const fileName = `${timestamp}-${roomId}-${Math.random().toString(36).substring(7)}.mp4`;
            const filePath = path.join(process.cwd(), 'recordings', fileName);

            // 1. Launch Browser
            const browser = await puppeteer.launch({
                headless: false, // Must be false to render to Xvfb for x11grab
                acceptInsecureCerts: true, // Ignore SSL certificate errors
                executablePath: process.env.CHROME_BIN || '/usr/bin/chromium',
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--ignore-certificate-errors', // Specifically for Chromium
                    '--window-size=1920,1080',
                    '--autoplay-policy=no-user-gesture-required',
                ],
            });

            const page = await browser.newPage();
            await page.setViewport({ width: 1920, height: 1080 });

            // Set DISPLAY for Puppeteer just in case
            if (process.env.DISPLAY) {
                this.logger.log(`Puppeteer using DISPLAY: ${process.env.DISPLAY}`);
            }

            // 2. Navigate to room in Recorder Mode
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            const targetUrl = `${frontendUrl}/meeting/${roomId}?recorder=true`;

            this.logger.log(`Bot navigating to: ${targetUrl}`);
            await page.goto(targetUrl, { waitUntil: 'networkidle2' });

            // 3. Start FFmpeg to capture Xvfb
            // xvfb-run defaults to display :99. Try to get it from env or default to :99.0
            const display = process.env.DISPLAY || ':99.0';

            const ffmpegArgs = [
                '-f', 'x11grab',
                '-video_size', '1920x1080',
                '-framerate', '30',
                '-i', display,
                '-f', 'lavfi',
                '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100',
                '-c:v', 'libx264',
                '-preset', 'ultrafast',
                '-pix_fmt', 'yuv420p',
                '-c:a', 'aac',
                '-ac', '2',
                '-ar', '44100',
                '-y',
                filePath
            ];

            this.logger.log(`Spawning FFmpeg on display ${display}...`);
            const ffmpeg = spawn('ffmpeg', ffmpegArgs);

            ffmpeg.stderr.on('data', (data) => {
                const message = data.toString().trim();
                // We log everything for debugging, but prefix errors specifically
                if (message.toLowerCase().includes('error') || message.toLowerCase().includes('failed')) {
                    this.logger.error(`FFmpeg Error: ${message}`);
                } else {
                    this.logger.verbose(`FFmpeg Status: ${message}`);
                }
            });

            ffmpeg.on('close', (code) => {
                this.logger.warn(`FFmpeg process for ${roomId} exited with code ${code}`);
                if (code !== 0 && code !== 255) { // 255 is normal exit for manual kill
                    this.meetingRepository.update({ roomId }, { recordingStatus: 'failed' }).catch(e => { });
                }
            });

            this.activeRecordings.set(roomId, {
                browser,
                ffmpeg,
                filePath,
                startTime: new Date(),
            });

            // Update Meeting Status
            await this.meetingRepository.update({ roomId }, {
                recordingStatus: 'recording',
                recordingStartedAt: new Date(),
            });

            this.logger.log(`Recording started for ${roomId}. Saving to ${fileName}`);
        } catch (error) {
            this.logger.error(`Failed to start recording for ${roomId}: ${error.stack}`);
            await this.meetingRepository.update({ roomId }, { recordingStatus: 'failed' });
        }
    }

    async stopRecording(roomId: string) {
        const recording = this.activeRecordings.get(roomId);
        if (!recording) return;

        this.logger.log(`Stopping recording for room: ${roomId}`);

        try {
            // 1. Stop FFmpeg gracefully
            recording.ffmpeg.stdin?.write('q');
            await new Promise(resolve => setTimeout(resolve, 2000));
            recording.ffmpeg.kill('SIGINT');

            // 2. Close Browser
            await recording.browser.close();

            const endTime = new Date();
            const duration = Math.floor((endTime.getTime() - recording.startTime.getTime()) / 1000);

            // 3. Update Database (Only if file exists)
            if (fs.existsSync(recording.filePath)) {
                await this.meetingRepository.update({ roomId }, {
                    videoPath: recording.filePath,
                    recordingStatus: 'completed',
                    isActive: false,
                    recordingEndedAt: endTime,
                    duration: duration
                });
                this.logger.log(`Recording saved for ${roomId}: ${recording.filePath}`);
            } else {
                this.logger.error(`Recording file not found after stopping FFmpeg: ${recording.filePath}`);
                await this.meetingRepository.update({ roomId }, {
                    recordingStatus: 'failed',
                    isActive: false,
                    recordingEndedAt: endTime
                });
            }

            this.activeRecordings.delete(roomId);
        } catch (error) {
            this.logger.error(`Error stopping recording for ${roomId}: ${error.message}`);
        }
    }
}