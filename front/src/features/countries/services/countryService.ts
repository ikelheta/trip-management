import { fetchAllPages } from '../../../shared/services/fetchAllPages.ts'
import { apiRequest } from '../../../shared/services/httpClient.ts'
import type { ListQuery, Paginated } from '../../../shared/types/api.ts'
import type { Country, CountryRequest } from '../types/country.ts'

const BASE_PATH = '/countries'

export function fetchCountries(query: ListQuery, signal?: AbortSignal): Promise<Paginated<Country>> {
  return apiRequest<Paginated<Country>>(BASE_PATH, {
    query: { page: query.page, limit: query.limit, search: query.search },
    signal,
  })
}

/** Every country, sorted by English name (the API sorts newest first). */
export async function fetchAllCountries(): Promise<Country[]> {
  const countries = await fetchAllPages((page, limit) => fetchCountries({ page, limit }))
  return countries.sort((a, b) => a.nameEn.localeCompare(b.nameEn))
}

export function createCountry(body: CountryRequest): Promise<Country> {
  return apiRequest<Country>(BASE_PATH, { method: 'POST', body })
}

export function updateCountry(id: string, body: CountryRequest): Promise<Country> {
  return apiRequest<Country>(`${BASE_PATH}/${id}`, { method: 'PATCH', body })
}

export function deleteCountry(id: string): Promise<void> {
  return apiRequest<void>(`${BASE_PATH}/${id}`, { method: 'DELETE' })
}
