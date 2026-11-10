import { fetchAllPages } from '../../../shared/services/fetchAllPages.ts'
import { apiRequest } from '../../../shared/services/httpClient.ts'
import type { Paginated } from '../../../shared/types/api.ts'
import type { Driver, DriverListQuery, DriverRequest } from '../types/driver.ts'

const BASE_PATH = '/drivers'

export function fetchDrivers(query: DriverListQuery, signal?: AbortSignal): Promise<Paginated<Driver>> {
  return apiRequest<Paginated<Driver>>(BASE_PATH, {
    query: {
      page: query.page,
      limit: query.limit,
      search: query.search,
      nationalityId: query.nationalityId,
      vehicleId: query.vehicleId,
    },
    signal,
  })
}

/** Every driver, sorted by name. */
export async function fetchAllDrivers(): Promise<Driver[]> {
  const drivers = await fetchAllPages((page, limit) => fetchDrivers({ page, limit }))
  return drivers.sort((a, b) => a.name.localeCompare(b.name))
}

export function fetchDriver(id: string, signal?: AbortSignal): Promise<Driver> {
  return apiRequest<Driver>(`${BASE_PATH}/${id}`, { signal })
}

export function createDriver(body: DriverRequest): Promise<Driver> {
  return apiRequest<Driver>(BASE_PATH, { method: 'POST', body })
}

export function updateDriver(id: string, body: DriverRequest): Promise<Driver> {
  return apiRequest<Driver>(`${BASE_PATH}/${id}`, { method: 'PATCH', body })
}

export function deleteDriver(id: string): Promise<void> {
  return apiRequest<void>(`${BASE_PATH}/${id}`, { method: 'DELETE' })
}
