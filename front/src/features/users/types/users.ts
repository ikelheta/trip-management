import type { UserRole } from '../../../shared/types/user.ts'

export interface CreateUserRequest {
  email: string
  firstName: string
  lastName: string
  password: string
  role?: UserRole
}

export interface UpdateUserRequest {
  email?: string
  firstName?: string
  lastName?: string
  password?: string
  role?: UserRole
  isActive?: boolean
}
