import { DataSource, DataSourceOptions } from 'typeorm';
import { SeederOptions } from 'typeorm-extension';
import { User } from './src/users/entities/user.entity';

const options: DataSourceOptions & SeederOptions = {
    type: 'postgres',
    host: process.env.DB_HOST || 'postgres',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USER || 'nexacall_user',
    password: process.env.DB_PASSWORD || 'nexacall_password',
    database: process.env.DB_NAME || 'nexacall_db',
    entities: [User],
    synchronize: true,

    // Seeder and Factory Location
    seeds: ['src/database/seeds/**/*{.ts,.js}'],
    factories: ['src/database/factories/**/*{.ts,.js}'],
};

export const dataSource = new DataSource(options);