import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiErrorResponses } from '../../common/decorators/api-error-responses.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { UserResponseDto } from '../users/dto/user-response.dto.js';
import type { User } from '../users/entities/user.entity.js';
import { AuthService } from './auth.service.js';
import { CurrentUser } from './current-user.decorator.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { LoginResponseDto } from './dto/login-response.dto.js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** Sign in with email and password; returns a bearer access token. */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.UNAUTHORIZED)
  async login(@Body() dto: LoginDto): Promise<LoginResponseDto> {
    const { accessToken, expiresIn, user } = await this.authService.login(dto);
    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn,
      user: UserResponseDto.fromEntity(user),
    };
  }

  /** The signed-in user. */
  @Get('me')
  me(@CurrentUser() user: User): UserResponseDto {
    return UserResponseDto.fromEntity(user);
  }

  /** Change the signed-in user's password. Tokens already issued stay valid until they expire. */
  @Post('change-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.UNAUTHORIZED)
  changePassword(
    @CurrentUser() user: User,
    @Body() dto: ChangePasswordDto,
  ): Promise<void> {
    return this.authService.changePassword(user, dto);
  }
}
