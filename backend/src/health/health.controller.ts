import { Controller, Get } from '@nestjs/common';
import { InjectConnection } from '@nestjs/typeorm';
import { Connection } from 'typeorm';

@Controller('health')
export class HealthController {
    constructor(
        @InjectConnection()
        private connection: Connection,
    ) { }

    @Get()
    async getHealth() {
        let databaseStatus = 'checking';
        let databaseError = null;

        try {
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Connection timeout')), 5000)
            );

            const queryPromise = this.connection.query('SELECT 1 as connected');

            await Promise.race([queryPromise, timeoutPromise]);
            databaseStatus = 'connected';
        } catch (error) {
            databaseStatus = 'disconnected';
            databaseError = error.message;
        }

        return {
            app: 'running',
            database: {
                status: databaseStatus,
                error: databaseError,
                // config: {
                //     host: process.env.DB_HOST,
                //     port: process.env.DB_PORT,
                //     database: process.env.DB_NAME,
                // },
            },
            timestamp: new Date().toISOString(),
        };
    }
}