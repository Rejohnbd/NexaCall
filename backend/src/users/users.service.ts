import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import {
  SuccessException,
  NotFoundException,
  ConflictException,
} from '../common/exceptions/http.exception';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) { }

  create(createUserDto: CreateUserDto) {
    return 'This action adds a new user';
  }

  // async create(createUserDto: CreateUserDto) {
  //   const existingUser = await this.usersRepository.findOne({
  //     where: [
  //       { email: createUserDto.email },
  //       { username: createUserDto.username },
  //     ],
  //   });

  //   if (existingUser) {
  //     throw new ConflictException('User already exists');
  //   }

  //   const user = this.usersRepository.create(createUserDto);
  //   const savedUser = await this.usersRepository.save(user);
  //   const { password, ...result } = savedUser;

  //   throw new SuccessException(result, 'User created successfully', 201);
  // }

  async findAll() {
    const users = await this.usersRepository.find();
    const usersWithoutPassword = users.map(({ password, ...user }) => user);
    throw new SuccessException(usersWithoutPassword, 'Users fetched successfully');
  }

  findOne(id: number) {
    return `This action returns a #${id} user`;
  }


  // async findOne(id: string) {
  //   const user = await this.usersRepository.findOne({ where: { id } });
  //   if (!user) {
  //     throw new NotFoundException('User not found');
  //   }
  //   const { password, ...result } = user;
  //   throw new SuccessException(result, 'User fetched successfully');
  // }

  update(id: number, updateUserDto: UpdateUserDto) {
    return `This action updates a #${id} user`;
  }

  // async update(id: string, updateUserDto: UpdateUserDto) {
  //   const user = await this.usersRepository.findOne({ where: { id } });
  //   if (!user) {
  //     throw new NotFoundException('User not found');
  //   }

  //   if (updateUserDto.password) {
  //     updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
  //   }

  //   Object.assign(user, updateUserDto);
  //   const updatedUser = await this.usersRepository.save(user);
  //   const { password, ...result } = updatedUser;

  //   throw new SuccessException(result, 'User updated successfully');
  // }


  remove(id: number) {
    return `This action removes a #${id} user`;
  }

  // async remove(id: string) {
  //   const result = await this.usersRepository.delete(id);
  //   if (result.affected === 0) {
  //     throw new NotFoundException('User not found');
  //   }
  //   throw new SuccessException(null, 'User deleted successfully');
  // }
}




