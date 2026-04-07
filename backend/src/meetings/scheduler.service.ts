// backend/src/meetings/scheduler.service.ts
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Meeting } from './entities/meeting.entity';

@Injectable()
export class SchedulerService {
    constructor(
        @InjectRepository(Meeting)
        private meetingRepository: Repository<Meeting>,
    ) { }

    @Cron(CronExpression.EVERY_MINUTE)
    async checkScheduledMeetings() {
        const now = new Date();
        const upcomingMeetings = await this.meetingRepository.find({
            where: {
                scheduledTime: now,
                type: 'scheduled',
                isActive: true,
            },
        });

        for (const meeting of upcomingMeetings) {
            // Send email notifications
            await this.sendMeetingReminder(meeting);
        }
    }

    private async sendMeetingReminder(meeting: Meeting) {
        // Implement email notification logic
        console.log(`Reminder: Meeting ${meeting.roomId} starts now`);
    }
}