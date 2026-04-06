import { IsOptional, IsString, IsEnum, IsDateString, IsBoolean } from 'class-validator';

export class CreateMeetingDto {
    @IsOptional()
    @IsString()
    title?: string;

    @IsEnum(['instant', 'scheduled'])
    type: 'instant' | 'scheduled';

    @IsOptional()
    @IsDateString()
    scheduledTime?: string;

    @IsOptional()
    @IsString()
    hostName?: string;

    @IsOptional()
    @IsString()
    hostEmail?: string;

    @IsOptional()
    @IsBoolean()
    autoRecord?: boolean;
}