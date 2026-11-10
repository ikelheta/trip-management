import { createContext, useContext } from 'react'
import type { User } from '../../../shared/types/user.ts'
import type { LoginRequest } from '../types/auth.ts'

export type AuthStatus = 'anonymous' | 'loading' | 'authenticated' | 'error'

export interface AuthContextValue {
  status: AuthStatus
  user: User | null
  /** Why the current user could not be loaded (status "error"). */
  error: unknown
  retry: () => void
  login: (body: LoginRequest) => Promise<void>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

/** Query key of GET /auth/me. Invalidate it after changing the signed-in user. */
export const CURRENT_USER_KEY = ['auth', 'me'] as const

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)
  if (!value) {
    throw new Error('useAuth must be used inside <AuthProvider>')
  }
  return value
}
