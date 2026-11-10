import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { EnvironmentVariables } from '../../config/env.validation.js';
import type { User } from '../users/entities/user.entity.js';
import { UsersService } from '../users/users.service.js';
import type { JwtPayload } from './auth.types.js';
import type { ChangePasswordDto } from './dto/change-password.dto.js';
import type { LoginDto } from './dto/login.dto.js';

@Injectable()
export class AuthService {
  private readonly expiresIn: number;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    config: ConfigService<EnvironmentVariables, true>,
  ) {
    this.expiresIn = config.get('JWT_EXPIRES_IN_SECONDS', { infer: true });
  }

  async login(
    dto: LoginDto,
  ): Promise<{ accessToken: string; expiresIn: number; user: User }> {
    const user = await this.usersService.verifyCredentials(
      dto.email,
      dto.password,
    );
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    return {
      accessToken: await this.jwtService.signAsync(payload),
      expiresIn: this.expiresIn,
      user,
    };
  }

  changePassword(user: User, dto: ChangePasswordDto): Promise<void> {
    return this.usersService.changePassword(
      user.id,
      dto.currentPassword,
      dto.newPassword,
    );
  }
}
