
import { Controller, Post, Body } from '@nestjs/common';
import { MeetingsService } from './meetings.service';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { SuccessException } from 'src/common/exceptions/http.exception';

@Controller('meetings')
export class MeetingsController {
  constructor(private readonly meetingsService: MeetingsService) { }

  @Post()
  async create(@Body() createMeetingDto: CreateMeetingDto) {
    const meeting = await this.meetingsService.create(createMeetingDto);
    throw new SuccessException(meeting, 'Meeting created successfully', 201);
  }

}
