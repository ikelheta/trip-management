import type { User } from '../../../shared/types/user.ts'

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  accessToken: string
  tokenType: 'Bearer'
  /** Seconds until the token expires. */
  expiresIn: number
  user: User
}

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}
