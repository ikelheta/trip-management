import { apiRequest } from '../../../shared/services/httpClient.ts'
import type { User } from '../../../shared/types/user.ts'
import type { CreateUserRequest, UpdateUserRequest } from '../types/users.ts'

export function fetchUsers(signal?: AbortSignal): Promise<User[]> {
  return apiRequest<User[]>('/users', { signal })
}

export function fetchUser(id: string, signal?: AbortSignal): Promise<User> {
  return apiRequest<User>(`/users/${id}`, { signal })
}

export function createUser(body: CreateUserRequest): Promise<User> {
  return apiRequest<User>('/users', { method: 'POST', body })
}

export function updateUser(id: string, body: UpdateUserRequest): Promise<User> {
  return apiRequest<User>(`/users/${id}`, { method: 'PATCH', body })
}

export function deleteUser(id: string): Promise<void> {
  return apiRequest<void>(`/users/${id}`, { method: 'DELETE' })
}
