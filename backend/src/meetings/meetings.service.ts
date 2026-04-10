import { Injectable } from '@nestjs/common';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Meeting } from './entities/meeting.entity';
import { Repository } from 'typeorm';
import { NotFoundException } from 'src/common/exceptions/http.exception';

@Injectable()
export class MeetingsService {
  constructor(
    @InjectRepository(Meeting)
    private meetingRepository: Repository<Meeting>,
  ) {}

  async create(createMeetingDto: CreateMeetingDto) {
    // Generate unique room ID
    const roomId = this.generateRoomId();

    // Generate meeting URL
    const meetingUrl = `/meeting/${roomId}`;

    const meeting = this.meetingRepository.create({
      ...createMeetingDto,
      roomId,
      meetingUrl,
      scheduledTime: createMeetingDto.scheduledTime
        ? new Date(createMeetingDto.scheduledTime)
        : null,
      settings: {
        autoRecord: createMeetingDto.autoRecord || false,
        allowScreenShare: true,
        maxParticipants: 100,
      },
    });

    const savedMeeting = await this.meetingRepository.save(meeting);

    return {
      id: savedMeeting.id,
      roomId: savedMeeting.roomId,
      title: savedMeeting.title,
      type: savedMeeting.type,
      scheduledTime: savedMeeting.scheduledTime,
      isActive: savedMeeting.isActive,
      hostName: savedMeeting.hostName,
      joinUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}${meetingUrl}`,
      createdAt: savedMeeting.createdAt,
    };
  }

  async findByRoomId(roomId: string) {
    const meeting = await this.meetingRepository.findOne({
      where: { roomId },
    });

    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }

    return meeting;
  }

  async findAll() {
    return await this.meetingRepository.find({
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async getRecordingPath(roomId: string): Promise<string> {
    const meeting = await this.findByRoomId(roomId);
    if (!meeting || !meeting.videoPath) {
      throw new NotFoundException('Recording not found');
    }
    return meeting.videoPath;
  }

  async setInactive(roomId: string) {
    return await this.meetingRepository.update({ roomId }, {
      isActive: false
    });
  }

  private generateRoomId(): string {
    // Generate a unique 6-character room ID
    const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += characters.charAt(
        Math.floor(Math.random() * characters.length),
      );
    }
    return result;
  }
}
