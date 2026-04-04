import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
    imports: [
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => ({
                type: 'postgres',
                host: configService.get('database.host'),
                port: configService.get('database.port'),
                username: configService.get('database.username'),
                password: configService.get('database.password'),
                database: configService.get('database.database'),
                entities: [__dirname + '/../**/*.entity{.ts,.js}'],
                synchronize: process.env.NODE_ENV !== 'production', // Development only
                logging: process.env.NODE_ENV === 'development',
                // Connection pool settings
                extra: {
                    max: 10,
                    connectionTimeoutMillis: 5000,
                },
            }),
            inject: [ConfigService],
        }),
    ],
})
export class DatabaseModule { }