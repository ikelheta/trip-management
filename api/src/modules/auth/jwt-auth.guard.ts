import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator.js';
import { UsersService } from '../users/users.service.js';
import type { AuthenticatedRequest, JwtPayload } from './auth.types.js';

/** Global guard: every route needs a valid Bearer token unless it is @Public(). */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = extractBearerToken(request.headers.authorization);
    if (!token) {
      throw new UnauthorizedException('Missing access token');
    }

    // Re-load the user so a deleted or deactivated user is locked out before the token expires.
    const payload = await this.jwtService
      .verifyAsync<JwtPayload>(token)
      .catch(() => null);
    const user = payload
      ? await this.usersService.findActive(payload.sub)
      : null;
    if (!user) {
      throw new UnauthorizedException('Invalid or expired access token');
    }
    request.user = user;
    return true;
  }
}

function extractBearerToken(header: string | undefined): string | null {
  const [scheme, token] = header?.split(' ') ?? [];
  return scheme?.toLowerCase() === 'bearer' && token ? token : null;
}
