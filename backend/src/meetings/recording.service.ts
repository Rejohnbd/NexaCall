import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class RecordingService {
    private recordings: Map<string, { writer: any; path: string }> = new Map();

    startRecording(roomId: string, producerId: string) {
        const filePath = path.join(__dirname, 'recordings', `${roomId}_${Date.now()}.webm`);
        const writer = fs.createWriteStream(filePath);

        this.recordings.set(producerId, { writer, path: filePath });
        return writer;
    }

    stopRecording(producerId: string) {
        const recording = this.recordings.get(producerId);
        if (recording) {
            recording.writer.end();
            this.recordings.delete(producerId);
            return recording.path;
        }
        return null;
    }
}