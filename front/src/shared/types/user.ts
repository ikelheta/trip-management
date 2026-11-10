export type UserRole = 'admin' | 'user'

/** backend/contracts/users.md `User`. The password is never returned. */
export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// Backend rule for every password (bcrypt reads at most 72 bytes).
export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_MAX_LENGTH = 72
