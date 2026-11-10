import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query'
import type { ListQuery, Paginated } from '../../../shared/types/api.ts'
import {
  createCountry,
  deleteCountry,
  fetchAllCountries,
  fetchCountries,
  updateCountry,
} from '../services/countryService.ts'
import type { Country, CountryRequest } from '../types/country.ts'

const ALL_COUNTRIES_STALE_TIME_MS = 5 * 60 * 1000

export const countryKeys = {
  root: ['countries'] as const,
  all: ['countries', 'all'] as const,
  list: (query: ListQuery) => ['countries', 'list', query] as const,
}

export function useCountries(query: ListQuery): UseQueryResult<Paginated<Country>> {
  return useQuery({
    queryKey: countryKeys.list(query),
    queryFn: ({ signal }) => fetchCountries(query, signal),
    placeholderData: keepPreviousData,
  })
}

/** Every country for pickers and name lookups. */
export function useAllCountries(): UseQueryResult<Country[]> {
  return useQuery({
    queryKey: countryKeys.all,
    queryFn: fetchAllCountries,
    staleTime: ALL_COUNTRIES_STALE_TIME_MS,
  })
}

function useInvalidateCountries(): () => Promise<void> {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: countryKeys.root })
}

export function useCreateCountry(): UseMutationResult<Country, Error, CountryRequest> {
  const invalidate = useInvalidateCountries()
  return useMutation({ mutationFn: createCountry, onSuccess: invalidate })
}

export function useUpdateCountry(): UseMutationResult<Country, Error, { id: string; body: CountryRequest }> {
  const invalidate = useInvalidateCountries()
  return useMutation({ mutationFn: ({ id, body }) => updateCountry(id, body), onSuccess: invalidate })
}

export function useDeleteCountry(): UseMutationResult<void, Error, string> {
  const invalidate = useInvalidateCountries()
  return useMutation({ mutationFn: deleteCountry, onSuccess: invalidate })
}
