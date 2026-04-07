import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MeetingsService } from './meetings.service';
import { MeetingsController } from './meetings.controller';
import { Meeting } from './entities/meeting.entity';
import { MeetingGateway } from './meeting.gateway';
import { MediasoupService } from './mediasoup.service';
import { RecordingService } from './recording.service';

@Module({
  imports: [TypeOrmModule.forFeature([Meeting])],
  controllers: [MeetingsController],
  providers: [MeetingsService, MeetingGateway, MediasoupService, RecordingService],
})
export class MeetingsModule { }
