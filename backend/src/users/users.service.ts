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
  ErrorException,
} from '../common/exceptions/http.exception';
import * as bcrypt from 'bcryptjs';
import * as fs from 'fs/promises';
import * as path from 'path';

// Multer File interface (custom definition)
interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
  buffer: Buffer;
}

interface UploadedFileInfo {
  originalName: string;
  filename: string;
  url: string;
  size: number;
  type: string;
}

interface UploadErrorInfo {
  filename: string;
  error: string;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) { }

  // create(createUserDto: CreateUserDto) {
  //   return 'This action adds a new user';
  // }

  async create(createUserDto: CreateUserDto) {
    const existingUser = await this.usersRepository.findOne({
      where: [
        { email: createUserDto.email },
        { username: createUserDto.username },
      ],
    });

    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    const user = this.usersRepository.create(createUserDto);
    const savedUser = await this.usersRepository.save(user);
    const { password, ...result } = savedUser;

    return result;
  }

  async findAll() {
    const users = await this.usersRepository.find();
    return users.map(({ password, ...user }) => user);
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

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email },
      select: ['id', 'email', 'username', 'password', 'is_active', 'is_admin']
    });
  }


  async uploadAvatar(userId: string, file: Express.Multer.File) {
    try {
      const user = await this.usersRepository.findOne({ where: { id: userId } });
      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
      if (!allowedTypes.includes(file.mimetype)) {
        throw new ErrorException('Invalid file type. Only JPEG, PNG, WEBP are allowed');
      }

      // Validate file size (max 2MB)
      const maxSize = 2 * 1024 * 1024; // 2MB
      if (file.size > maxSize) {
        throw new ErrorException('File too large. Maximum size is 2MB');
      }

      // Generate unique filename
      const fileExtension = path.extname(file.originalname);
      const fileName = `${userId}_${Date.now()}${fileExtension}`;
      const uploadPath = path.join('./uploads/avatars', fileName);

      // Create directory if not exists
      await fs.mkdir(path.dirname(uploadPath), { recursive: true });

      // Save file
      await fs.writeFile(uploadPath, file.buffer);
      console.log(`Avatar saved: ${uploadPath}`);

      // Delete old avatar if exists
      if (user.avatar) {
        try {
          const oldAvatarPath = path.join('./uploads/avatars', user.avatar);
          await fs.unlink(oldAvatarPath);
          console.log(`🗑️ Old avatar deleted: ${user.avatar}`);
        } catch (error) {
          console.error('Failed to delete old avatar:', error.message);
        }
      }

      // Update user with avatar path
      user.avatar = fileName;
      const updatedUser = await this.usersRepository.save(user);
      const { password, ...result } = updatedUser;

      return {
        user: result,
        avatar: {
          filename: fileName,
          url: `/uploads/avatars/${fileName}`,
          size: file.size,
        },
      };

    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new ErrorException('Failed to upload avatar', error.message);
    }
  }

  async uploadMultipleFiles(userId: string, files: Express.Multer.File[]) {
    try {
      const user = await this.usersRepository.findOne({ where: { id: userId } });
      if (!user) {
        throw new NotFoundException('User not found');
      }

      const uploadedFiles: UploadedFileInfo[] = [];
      const errors: UploadErrorInfo[] = [];

      for (const file of files) {
        try {
          // Validate each file
          const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
          if (!allowedTypes.includes(file.mimetype)) {
            errors.push({ filename: file.originalname, error: 'Invalid file type' });
            continue;
          }

          // Generate unique filename
          const fileExtension = path.extname(file.originalname);
          const fileName = `${userId}_${Date.now()}_${Math.random().toString(36).substring(7)}${fileExtension}`;
          const uploadPath = path.join('./uploads/documents', fileName);

          // Save file
          await fs.mkdir(path.dirname(uploadPath), { recursive: true });
          await fs.writeFile(uploadPath, file.buffer);

          uploadedFiles.push({
            originalName: file.originalname,
            filename: fileName,
            url: `/uploads/documents/${fileName}`,
            size: file.size,
            type: file.mimetype,
          });

        } catch (fileError) {
          errors.push({ filename: file.originalname, error: fileError.message });
        }
      }

      return {
        uploaded: uploadedFiles,
        failed: errors,
        total: files.length,
        successCount: uploadedFiles.length,
        failedCount: errors.length,
      };

    } catch (error) {
      throw new ErrorException('Failed to upload files', error.message);
    }
  }

  async deleteAvatar(userId: string) {
    try {
      const user = await this.usersRepository.findOne({ where: { id: userId } });
      if (!user) {
        throw new NotFoundException('User not found');
      }

      if (!user.avatar) {
        throw new ErrorException('No avatar found to delete');
      }

      // Delete file from filesystem
      const avatarPath = path.join('./uploads/avatars', user.avatar);
      try {
        await fs.unlink(avatarPath);
        console.log(`Avatar deleted: ${user.avatar}`);
      } catch (error) {
        console.error('File deletion error:', error.message);
        // File doesn't exist or other error - continue to update database
      }

      // Update user
      user.avatar = '';
      const updatedUser = await this.usersRepository.save(user);
      const { password, ...result } = updatedUser;

      return result;

    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new ErrorException('Failed to delete avatar', error.message);
    }
  }
}




