import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { User } from '../users/entities/user.entity.js';
import type { AuthenticatedRequest } from './auth.types.js';

/** The user JwtAuthGuard attached to the request. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): User =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().user,
);
