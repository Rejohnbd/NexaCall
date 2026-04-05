import { Seeder, SeederFactoryManager } from 'typeorm-extension';
import { DataSource } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import * as bcrypt from 'bcryptjs';

export default class UserSeeder implements Seeder {
    public track = true; // একবার রান হবে, বারবার না

    public async run(
        dataSource: DataSource,
        factoryManager: SeederFactoryManager,
    ): Promise<any> {
        const userRepository = dataSource.getRepository(User);

        // 1. Fixed Admin User
        const adminEmail = 'admin@nexacall.com';
        const existingAdmin = await userRepository.findOne({ where: { email: adminEmail } });

        if (!existingAdmin) {
            const adminUser = userRepository.create({
                username: 'admin',
                email: adminEmail,
                name: 'System Administrator',
                // password: await bcrypt.hash('admin123', 10),
                password: 'admin123',
                is_active: true,
                is_admin: true,
            });
            await userRepository.save(adminUser);
            console.log('Admin user created');
        }

        // 2. Fixed Test User
        const testEmail = 'test@nexacall.com';
        const existingTest = await userRepository.findOne({ where: { email: testEmail } });

        if (!existingTest) {
            const testUser = userRepository.create({
                username: 'testuser',
                email: testEmail,
                name: 'Test User',
                // password: await bcrypt.hash('test123', 10),
                password: 'test123',
                is_active: true,
                is_admin: false,
            });
            await userRepository.save(testUser);
            console.log('Test user created');
        }

        // 3. Generate 20 random users using factory
        const userFactory = factoryManager.get(User);
        await userFactory.saveMany(20);
        console.log('20 random users created');
    }
}