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
  createVehicle,
  deleteVehicle,
  fetchAllVehicles,
  fetchVehicle,
  fetchVehicles,
  updateVehicle,
} from '../services/vehicleService.ts'
import type { Vehicle, VehicleListQuery, VehicleRequest } from '../types/vehicle.ts'

const ALL_VEHICLES_STALE_TIME_MS = 5 * 60 * 1000

export const vehicleKeys = {
  root: ['vehicles'] as const,
  all: ['vehicles', 'all'] as const,
  list: (query: VehicleListQuery) => ['vehicles', 'list', query] as const,
  detail: (id: string) => ['vehicles', 'detail', id] as const,
}

export function useVehicles(query: VehicleListQuery): UseQueryResult<Paginated<Vehicle>> {
  return useQuery({
    queryKey: vehicleKeys.list(query),
    queryFn: ({ signal }) => fetchVehicles(query, signal),
    placeholderData: keepPreviousData,
  })
}

export function useVehicle(id: string): UseQueryResult<Vehicle> {
  return useQuery({
    queryKey: vehicleKeys.detail(id),
    queryFn: ({ signal }) => fetchVehicle(id, signal),
    enabled: id !== '',
  })
}

/** Every vehicle for pickers and name lookups. */
export function useAllVehicles(): UseQueryResult<Vehicle[]> {
  return useQuery({
    queryKey: vehicleKeys.all,
    queryFn: fetchAllVehicles,
    staleTime: ALL_VEHICLES_STALE_TIME_MS,
  })
}

function useInvalidateVehicles(): () => Promise<void> {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: vehicleKeys.root })
}

export function useCreateVehicle(): UseMutationResult<Vehicle, Error, VehicleRequest> {
  const invalidate = useInvalidateVehicles()
  return useMutation({ mutationFn: createVehicle, onSuccess: invalidate })
}

export function useUpdateVehicle(): UseMutationResult<Vehicle, Error, { id: string; body: VehicleRequest }> {
  const invalidate = useInvalidateVehicles()
  return useMutation({ mutationFn: ({ id, body }) => updateVehicle(id, body), onSuccess: invalidate })
}

export function useDeleteVehicle(): UseMutationResult<void, Error, string> {
  const invalidate = useInvalidateVehicles()
  return useMutation({ mutationFn: deleteVehicle, onSuccess: invalidate })
}
