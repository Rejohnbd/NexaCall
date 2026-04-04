import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    BeforeInsert,
    BeforeUpdate,
} from 'typeorm';
import * as bcrypt from 'bcryptjs';

@Entity('users')
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 100, unique: true, nullable: true })
    username: string;

    @Column({ type: 'varchar', length: 255, unique: true })
    email: string;

    @Column({ type: 'varchar', length: 255, select: false })
    password: string;

    @Column({ type: 'varchar', length: 100, nullable: true })
    name: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    remember_token: string;

    @Column({ type: 'timestamp', nullable: true })
    email_verified_at: Date;

    @Column({ type: 'boolean', default: false })
    is_active: boolean;

    @Column({ type: 'boolean', default: false })
    is_admin: boolean;

    @Column({ type: 'text', nullable: true })
    avatar: string;

    @Column({ type: 'varchar', length: 20, nullable: true })
    phone: string;

    @Column({ type: 'text', nullable: true })
    address: string;

    @CreateDateColumn({ type: 'timestamp' })
    created_at: Date;

    @UpdateDateColumn({ type: 'timestamp' })
    updated_at: Date;

    // Before Insert Hook - macking password hash
    @BeforeInsert()
    async hashPasswordBeforeInsert() {
        if (this.password) {
            const salt = await bcrypt.genSalt(10);
            this.password = await bcrypt.hash(this.password, salt);
        }
    }

    // Before Update Hook - macking password hash if password is changed
    @BeforeUpdate()
    async hashPasswordBeforeUpdate() {
        if (this.password && this.password.length < 60) {
            // if password is not hashed yet
            const salt = await bcrypt.genSalt(10);
            this.password = await bcrypt.hash(this.password, salt);
        }
    }

    // password verification method
    async comparePassword(plainPassword: string): Promise<boolean> {
        return bcrypt.compare(plainPassword, this.password);
    }
}
