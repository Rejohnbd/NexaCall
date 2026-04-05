import { Controller, Get, Post, Body, Patch, Param, Delete, UseInterceptors, UploadedFile, UploadedFiles } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { SuccessException } from '../common/exceptions/http.exception';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Post()
  async create(@Body() createUserDto: CreateUserDto) {
    const user = await this.usersService.create(createUserDto);
    throw new SuccessException(user, 'User created successfully', 201);
  }

  @Get()
  async findAll() {
    const users = await this.usersService.findAll();
    throw new SuccessException(users, 'Users fetched successfully');
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(+id, updateUserDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(+id);
  }
  
  @Post(':id/avatar')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    const result = await this.usersService.uploadAvatar(id, file);
    throw new SuccessException(result, 'Avatar uploaded successfully');
  }

  @Post(':id/files')
  @UseInterceptors(FilesInterceptor('files'))
  async uploadMultipleFiles(@Param('id') id: string, @UploadedFiles() files: Express.Multer.File[]) {
    const result = await this.usersService.uploadMultipleFiles(id, files);
    throw new SuccessException(result, 'Files uploaded successfully');
  }

  @Delete(':id/avatar')
  async deleteAvatar(@Param('id') id: string) {
    const result = await this.usersService.deleteAvatar(id);
    throw new SuccessException(result, 'Avatar deleted successfully');
  }
}
