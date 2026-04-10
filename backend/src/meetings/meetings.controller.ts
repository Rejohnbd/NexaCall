import { Controller, Post, Body, Get, Param, Res, StreamableFile } from '@nestjs/common';
import { MeetingsService } from './meetings.service';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { SuccessException, NotFoundException } from 'src/common/exceptions/http.exception';
import { Public } from 'src/common/decorators/public.decorator';
import * as express from 'express';
import { createReadStream, existsSync } from 'fs';

@Controller('meetings')
export class MeetingsController {
  constructor(private readonly meetingsService: MeetingsService) { }

  @Post()
  async create(@Body() createMeetingDto: CreateMeetingDto) {
    const meeting = await this.meetingsService.create(createMeetingDto);
    throw new SuccessException(meeting, 'Meeting created successfully', 201);
  }

  @Public()
  @Get('room/:roomId')
  async findByRoomId(@Param('roomId') roomId: string) {
    const meeting = await this.meetingsService.findByRoomId(roomId);
    throw new SuccessException(meeting, 'Meeting details fetched successfully');
  }

  @Public()
  @Get()
  async findAll() {
    const meetings = await this.meetingsService.findAll();
    throw new SuccessException(meetings, 'Meeting list fetched successfully');
  }

  @Public()
  @Get('video/:roomId')
  async downloadVideo(
    @Param('roomId') roomId: string,
    @Res({ passthrough: true }) res: express.Response,
  ) {
    const videoPath = await this.meetingsService.getRecordingPath(roomId);
    
    if (!existsSync(videoPath)) {
      throw new NotFoundException('Recording file not found on server');
    }

    const file = createReadStream(videoPath);
    
    res.set({
      'Content-Type': 'video/mp4',
      'Content-Disposition': `attachment; filename="recording-${roomId}.mp4"`,
    });

    return new StreamableFile(file);
  }
}
