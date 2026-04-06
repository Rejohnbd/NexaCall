
import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { MeetingsService } from './meetings.service';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { SuccessException } from 'src/common/exceptions/http.exception';
import { Public } from 'src/common/decorators/public.decorator';

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
}
