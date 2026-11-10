import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useSyncExternalStore, type ReactNode } from 'react'
import { fetchCurrentUser, login as loginRequest } from '../services/authService.ts'
import type { LoginRequest } from '../types/auth.ts'
import { AuthContext, CURRENT_USER_KEY, type AuthStatus } from '../hooks/useAuth.ts'
import {
  clearSession,
  readAccessToken,
  readExpiresAt,
  saveSession,
  subscribeToSession,
} from '../utils/sessionStore.ts'

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const queryClient = useQueryClient()
  const token = useSyncExternalStore(subscribeToSession, readAccessToken)
  const currentUser = useQuery({
    queryKey: CURRENT_USER_KEY,
    queryFn: ({ signal }) => fetchCurrentUser(signal),
    enabled: token !== null,
    staleTime: Infinity,
  })

  function logout(): void {
    clearSession()
    queryClient.clear()
  }

  // There is no refresh token: sign out when the token expires.
  useEffect(() => {
    const expiresAt = readExpiresAt()
    if (!token || !expiresAt) {
      return
    }
    const timer = window.setTimeout(() => {
      clearSession()
      queryClient.clear()
    }, expiresAt - Date.now())
    return () => window.clearTimeout(timer)
  }, [token, queryClient])

  async function login(body: LoginRequest): Promise<void> {
    const response = await loginRequest(body)
    // Seed the user first so the session flip does not trigger a /auth/me request.
    queryClient.setQueryData(CURRENT_USER_KEY, response.user)
    saveSession(response.accessToken, response.expiresIn)
  }

  let status: AuthStatus = 'loading'
  if (!token) {
    status = 'anonymous'
  } else if (currentUser.data) {
    status = 'authenticated'
  } else if (currentUser.isError) {
    status = 'error'
  }

  return (
    <AuthContext
      value={{
        status,
        user: currentUser.data ?? null,
        error: currentUser.error,
        retry: () => void currentUser.refetch(),
        login,
        logout,
      }}
    >
      {children}
    </AuthContext>
  )
}
