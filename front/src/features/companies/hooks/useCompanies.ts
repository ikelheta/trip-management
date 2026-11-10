import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ListQuery } from '../../../shared/types/api.ts'
import {
  createCompany,
  deleteCompany,
  fetchAllCompanies,
  fetchCompanies,
  fetchCompany,
  updateCompany,
} from '../services/companyService.ts'
import type { Company, UpdateCompanyRequest } from '../types/companies.ts'

const ALL_COMPANIES_STALE_TIME_MS = 5 * 60 * 1000

export const companiesKeys = {
  all: ['companies'] as const,
  lists: () => [...companiesKeys.all, 'list'] as const,
  list: (query: ListQuery) => [...companiesKeys.lists(), query] as const,
  everything: () => [...companiesKeys.all, 'all'] as const,
  detail: (id: string) => [...companiesKeys.all, 'detail', id] as const,
}

export function useCompanies(query: ListQuery) {
  return useQuery({
    queryKey: companiesKeys.list(query),
    queryFn: ({ signal }) => fetchCompanies(query, signal),
    placeholderData: keepPreviousData,
  })
}

/** Every company, for dropdowns and id -> name lookups. */
export function useAllCompanies() {
  return useQuery({
    queryKey: companiesKeys.everything(),
    queryFn: ({ signal }) => fetchAllCompanies(signal),
    staleTime: ALL_COMPANIES_STALE_TIME_MS,
  })
}

export function useCompany(id: string) {
  return useQuery({
    queryKey: companiesKeys.detail(id),
    queryFn: ({ signal }) => fetchCompany(id, signal),
  })
}

export function useCreateCompany() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createCompany,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: companiesKeys.all }),
  })
}

interface UpdateCompanyVariables {
  id: string
  body: UpdateCompanyRequest
}

export function useUpdateCompany() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: UpdateCompanyVariables) => updateCompany(id, body),
    onSuccess: (company: Company) => {
      queryClient.setQueryData(companiesKeys.detail(company.id), company)
      return queryClient.invalidateQueries({ queryKey: companiesKeys.all })
    },
  })
}

export function useDeleteCompany() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteCompany,
    onSuccess: (_result, id) => {
      queryClient.removeQueries({ queryKey: companiesKeys.detail(id) })
      void queryClient.invalidateQueries({ queryKey: companiesKeys.lists() })
      void queryClient.invalidateQueries({ queryKey: companiesKeys.everything() })
    },
  })
}
