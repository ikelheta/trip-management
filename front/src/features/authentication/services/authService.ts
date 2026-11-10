import { apiRequest } from '../../../shared/services/httpClient.ts'
import type { User } from '../../../shared/types/user.ts'
import type { ChangePasswordRequest, LoginRequest, LoginResponse } from '../types/auth.ts'

export function login(body: LoginRequest): Promise<LoginResponse> {
  return apiRequest<LoginResponse>('/auth/login', { method: 'POST', body })
}

export function fetchCurrentUser(signal?: AbortSignal): Promise<User> {
  return apiRequest<User>('/auth/me', { signal })
}

export function changePassword(body: ChangePasswordRequest): Promise<void> {
  return apiRequest<void>('/auth/change-password', { method: 'POST', body })
}
