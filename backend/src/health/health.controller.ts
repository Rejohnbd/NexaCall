import { Controller, Get } from '@nestjs/common';
import { InjectConnection } from '@nestjs/typeorm';
import { Connection } from 'typeorm';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { HealthLogger } from './health-logger.service';

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

        let packageJson: any = {};
        try {
            const pkgPath = path.join(process.cwd(), 'package.json');
            packageJson = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        } catch (e) {}

        const freeMem = os.freemem();
        const totalMem = os.totalmem();

        return {
            app: 'running',
            version: packageJson.version || 'unknown',
            environment: process.env.NODE_ENV || 'development',
            system: {
                uptimeSeconds: os.uptime(),
                totalMemoryMB: Math.round(totalMem / 1024 / 1024),
                freeMemoryMB: Math.round(freeMem / 1024 / 1024),
                cpuLoad: os.loadavg(),
            },
            process: {
                uptimeSeconds: process.uptime(),
                memoryUsageMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
            },
            database: {
                status: databaseStatus,
                error: databaseError,
            },
            logs: HealthLogger.getRecentLogs(),
            timestamp: new Date().toISOString(),
        };
    }
}