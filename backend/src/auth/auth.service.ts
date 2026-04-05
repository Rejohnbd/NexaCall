import { Injectable } from '@nestjs/common';
import { LoginDto } from './dto/login.dto';
import { UsersService } from 'src/users/users.service';
import { ConflictException, UnauthorizedException } from '../common/exceptions/http.exception';
import { compare } from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcryptjs';


@Injectable()
export class AuthService {
    constructor(
        private readonly usersService: UsersService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
    ) { }

    async register(registerDto: RegisterDto) {
        // Check if user exists
        const existingUser = await this.usersService.findByEmail(registerDto.email);
        if (existingUser) {
            throw new ConflictException('User already exists');
        }

        // Create user
        // Note: Password hashing is handled by the User entity @BeforeInsert hook
        const user = await this.usersService.create({
            email: registerDto.email,
            username: registerDto.username,
            password: registerDto.password,
            name: registerDto.name,
        });

        // Generate tokens
        const tokens = await this.generateTokens(user.id, user.email);

        return {
            status: true,
            message: 'User registered successfully',
            data: {
                user: { id: user.id, email: user.email, username: user.username },
                ...tokens,
            },
        };
    }

    async login(loginDto: LoginDto) {
        if (!loginDto) {
            throw new UnauthorizedException('Invalid credentials');
        }
        const user = await this.usersService.findByEmail(loginDto.email);

        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        // Check if user has password field
        if (!user.password) {
            throw new UnauthorizedException('Invalid credentials');
        }

        // Verify password
        const isPasswordValid = await compare(loginDto.password, user.password);

        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        // Generate tokens
        const tokens = await this.generateTokens(user.id, user.email);

        return {
            status: true,
            message: 'Login successful',
            data: {
                user: { id: user.id, email: user.email, username: user.username },
                ...tokens,
            },
        };
    }

    private async generateTokens(userId: string, email: string) {
        const payload = { sub: userId, email };

        const accessToken = this.jwtService.sign(payload, {
            secret: this.configService.get('JWT_SECRET'),
            expiresIn: this.configService.get('JWT_ACCESS_EXPIRY') || '15m',
        });

        const refreshToken = this.jwtService.sign(payload, {
            secret: this.configService.get('JWT_REFRESH_SECRET'),
            expiresIn: this.configService.get('JWT_REFRESH_EXPIRY') || '7d',
        });

        return { access_token: accessToken, refresh_token: refreshToken };
    }

    async refreshTokens(refreshToken: string) {
        try {
            const payload = this.jwtService.verify(refreshToken, {
                secret: this.configService.get('JWT_REFRESH_SECRET'),
            });

            const tokens = await this.generateTokens(payload.sub, payload.email);
            return tokens;
        } catch (error) {
            throw new UnauthorizedException('Invalid refresh token');
        }
    }
}
