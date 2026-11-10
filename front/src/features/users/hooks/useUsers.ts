import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { User } from '../../../shared/types/user.ts'
import { CURRENT_USER_KEY, useAuth } from '../../authentication/index.ts'
import { createUser, deleteUser, fetchUser, fetchUsers, updateUser } from '../services/userService.ts'
import type { UpdateUserRequest } from '../types/users.ts'

export const usersKeys = {
  all: ['users'] as const,
  list: () => [...usersKeys.all, 'list'] as const,
  detail: (id: string) => [...usersKeys.all, 'detail', id] as const,
}

export function useUsers() {
  return useQuery({
    queryKey: usersKeys.list(),
    queryFn: ({ signal }) => fetchUsers(signal),
  })
}

export function useUser(id: string) {
  return useQuery({
    queryKey: usersKeys.detail(id),
    queryFn: ({ signal }) => fetchUser(id, signal),
  })
}

export function useCreateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: usersKeys.all }),
  })
}

interface UpdateUserVariables {
  id: string
  body: UpdateUserRequest
}

export function useUpdateUser() {
  const queryClient = useQueryClient()
  const { user: currentUser } = useAuth()
  return useMutation({
    mutationFn: ({ id, body }: UpdateUserVariables) => updateUser(id, body),
    onSuccess: (user: User) => {
      queryClient.setQueryData(usersKeys.detail(user.id), user)
      // The header user menu reads the signed-in user from this key.
      if (user.id === currentUser?.id) {
        queryClient.setQueryData(CURRENT_USER_KEY, user)
      }
      return queryClient.invalidateQueries({ queryKey: usersKeys.list() })
    },
  })
}

export function useDeleteUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteUser,
    onSuccess: (_result, id) => {
      queryClient.removeQueries({ queryKey: usersKeys.detail(id) })
      return queryClient.invalidateQueries({ queryKey: usersKeys.list() })
    },
  })
}
