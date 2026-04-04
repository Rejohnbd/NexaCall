import { setSeederFactory } from 'typeorm-extension';
import { User } from '../../users/entities/user.entity';
import * as bcrypt from 'bcryptjs';

export default setSeederFactory(User, async (faker) => {
    const user = new User();

    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();

    user.username = faker.internet.username({ firstName, lastName });
    user.email = faker.internet.email({ firstName, lastName });
    user.name = faker.person.fullName({ firstName, lastName });
    user.password = await bcrypt.hash('password123', 10);
    user.phone = faker.phone.number().substring(0, 20);
    user.address = faker.location.streetAddress();
    user.is_active = faker.datatype.boolean(0.9);
    user.is_admin = faker.datatype.boolean(0.1);

    return user;
});