import type { Request } from 'express';
import type { User } from '../users/entities/user.entity.js';
import type { UserRole } from '../users/enums/user-role.enum.js';

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
}

/** A request that passed JwtAuthGuard. */
export interface AuthenticatedRequest extends Request {
  user: User;
}
