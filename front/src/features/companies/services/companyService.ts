import { fetchAllPages } from '../../../shared/services/fetchAllPages.ts'
import { apiRequest } from '../../../shared/services/httpClient.ts'
import type { ListQuery, Paginated } from '../../../shared/types/api.ts'
import type { Company, CreateCompanyRequest, UpdateCompanyRequest } from '../types/companies.ts'

export function fetchCompanies(query: ListQuery, signal?: AbortSignal): Promise<Paginated<Company>> {
  return apiRequest<Paginated<Company>>('/companies', {
    query: { page: query.page, limit: query.limit, search: query.search },
    signal,
  })
}

/** Every company (all pages), for dropdowns. */
export function fetchAllCompanies(signal?: AbortSignal): Promise<Company[]> {
  return fetchAllPages((page, limit) => fetchCompanies({ page, limit }, signal))
}

export function fetchCompany(id: string, signal?: AbortSignal): Promise<Company> {
  return apiRequest<Company>(`/companies/${id}`, { signal })
}

export function createCompany(body: CreateCompanyRequest): Promise<Company> {
  return apiRequest<Company>('/companies', { method: 'POST', body })
}

export function updateCompany(id: string, body: UpdateCompanyRequest): Promise<Company> {
  return apiRequest<Company>(`/companies/${id}`, { method: 'PATCH', body })
}

export function deleteCompany(id: string): Promise<void> {
  return apiRequest<void>(`/companies/${id}`, { method: 'DELETE' })
}
