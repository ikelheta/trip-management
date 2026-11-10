import { fetchAllPages } from '../../../shared/services/fetchAllPages.ts'
import { apiRequest } from '../../../shared/services/httpClient.ts'
import type { Paginated } from '../../../shared/types/api.ts'
import type { Vehicle, VehicleListQuery, VehicleRequest } from '../types/vehicle.ts'

const BASE_PATH = '/vehicles'

export function fetchVehicles(query: VehicleListQuery, signal?: AbortSignal): Promise<Paginated<Vehicle>> {
  return apiRequest<Paginated<Vehicle>>(BASE_PATH, {
    query: { page: query.page, limit: query.limit, search: query.search, companyId: query.companyId },
    signal,
  })
}

/** Every vehicle, sorted by plate number. */
export async function fetchAllVehicles(): Promise<Vehicle[]> {
  const vehicles = await fetchAllPages((page, limit) => fetchVehicles({ page, limit }))
  return vehicles.sort((a, b) => a.plateNumber.localeCompare(b.plateNumber))
}

export function fetchVehicle(id: string, signal?: AbortSignal): Promise<Vehicle> {
  return apiRequest<Vehicle>(`${BASE_PATH}/${id}`, { signal })
}

export function createVehicle(body: VehicleRequest): Promise<Vehicle> {
  return apiRequest<Vehicle>(BASE_PATH, { method: 'POST', body })
}

export function updateVehicle(id: string, body: VehicleRequest): Promise<Vehicle> {
  return apiRequest<Vehicle>(`${BASE_PATH}/${id}`, { method: 'PATCH', body })
}

export function deleteVehicle(id: string): Promise<void> {
  return apiRequest<void>(`${BASE_PATH}/${id}`, { method: 'DELETE' })
}
