import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query'
import type { Paginated } from '../../../shared/types/api.ts'
import {
  createDriver,
  deleteDriver,
  fetchAllDrivers,
  fetchDriver,
  fetchDrivers,
  updateDriver,
} from '../services/driverService.ts'
import type { Driver, DriverListQuery, DriverRequest } from '../types/driver.ts'

const ALL_DRIVERS_STALE_TIME_MS = 5 * 60 * 1000

export const driverKeys = {
  root: ['drivers'] as const,
  all: ['drivers', 'all'] as const,
  list: (query: DriverListQuery) => ['drivers', 'list', query] as const,
  detail: (id: string) => ['drivers', 'detail', id] as const,
}

export function useDrivers(query: DriverListQuery): UseQueryResult<Paginated<Driver>> {
  return useQuery({
    queryKey: driverKeys.list(query),
    queryFn: ({ signal }) => fetchDrivers(query, signal),
    placeholderData: keepPreviousData,
  })
}

export function useDriver(id: string): UseQueryResult<Driver> {
  return useQuery({
    queryKey: driverKeys.detail(id),
    queryFn: ({ signal }) => fetchDriver(id, signal),
    enabled: id !== '',
  })
}

/** Every driver for pickers and name lookups. */
export function useAllDrivers(): UseQueryResult<Driver[]> {
  return useQuery({
    queryKey: driverKeys.all,
    queryFn: fetchAllDrivers,
    staleTime: ALL_DRIVERS_STALE_TIME_MS,
  })
}

function useInvalidateDrivers(): () => Promise<void> {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: driverKeys.root })
}

export function useCreateDriver(): UseMutationResult<Driver, Error, DriverRequest> {
  const invalidate = useInvalidateDrivers()
  return useMutation({ mutationFn: createDriver, onSuccess: invalidate })
}

export function useUpdateDriver(): UseMutationResult<Driver, Error, { id: string; body: DriverRequest }> {
  const invalidate = useInvalidateDrivers()
  return useMutation({ mutationFn: ({ id, body }) => updateDriver(id, body), onSuccess: invalidate })
}

export function useDeleteDriver(): UseMutationResult<void, Error, string> {
  const invalidate = useInvalidateDrivers()
  return useMutation({ mutationFn: deleteDriver, onSuccess: invalidate })
}
