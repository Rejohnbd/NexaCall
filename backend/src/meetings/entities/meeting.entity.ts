import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity('meetings')
export class Meeting {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    roomId: string;

    @Column({ nullable: true })
    title?: string;

    @Column({ type: 'varchar', default: 'instant' })
    type: string;  // 'instant' or 'scheduled'

    @Column({ type: 'timestamp', nullable: true })
    scheduledTime?: Date | null;

    @Column({ default: true })
    isActive: boolean;

    @Column({ nullable: true })
    hostName?: string;  // host name (without login)

    @Column({ nullable: true })
    hostEmail?: string; // host email (optional)

    @Column({ nullable: true })
    meetingUrl?: string;

    @Column({ type: 'jsonb', nullable: true, default: {} })
    settings: {
        autoRecord?: boolean;
        allowScreenShare?: boolean;
        maxParticipants?: number;
    };

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}