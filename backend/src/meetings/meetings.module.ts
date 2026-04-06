import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MeetingsService } from './meetings.service';
import { MeetingsController } from './meetings.controller';
import { Meeting } from './entities/meeting.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Meeting])],
  controllers: [MeetingsController],
  providers: [MeetingsService],
})
export class MeetingsModule {}
