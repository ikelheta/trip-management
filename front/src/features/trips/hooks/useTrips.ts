import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import {
  createTrip,
  deleteTrip,
  fetchTrip,
  fetchTrips,
  regenerateTripQrCode,
  updateTrip,
} from '../services/tripService.ts'
import type { Trip, TripListQuery, UpdateTripRequest } from '../types/trip.ts'

export const tripKeys = {
  all: ['trips'] as const,
  lists: () => [...tripKeys.all, 'list'] as const,
  list: (query: TripListQuery) => [...tripKeys.lists(), query] as const,
  details: () => [...tripKeys.all, 'detail'] as const,
  detail: (id: string) => [...tripKeys.details(), id] as const,
}

/** Puts a trip returned by a write into the cache and refreshes the lists. */
export function cacheTrip(queryClient: QueryClient, trip: Trip): void {
  queryClient.setQueryData(tripKeys.detail(trip.id), trip)
  void queryClient.invalidateQueries({ queryKey: tripKeys.lists() })
}

export function useTrips(query: TripListQuery) {
  return useQuery({
    queryKey: tripKeys.list(query),
    queryFn: ({ signal }) => fetchTrips(query, signal),
    placeholderData: keepPreviousData,
  })
}

/** `enabled: false` stops a mounted page from refetching a trip it has just deleted. */
export function useTrip(id: string, enabled = true) {
  return useQuery({
    queryKey: tripKeys.detail(id),
    queryFn: ({ signal }) => fetchTrip(id, signal),
    enabled,
  })
}

export function useCreateTrip() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createTrip,
    onSuccess: (trip) => cacheTrip(queryClient, trip),
  })
}

export function useUpdateTrip(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: UpdateTripRequest) => updateTrip(id, body),
    onSuccess: (trip) => cacheTrip(queryClient, trip),
  })
}

export function useDeleteTrip() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteTrip,
    onSuccess: (_result, id) => {
      queryClient.removeQueries({ queryKey: tripKeys.detail(id) })
      void queryClient.invalidateQueries({ queryKey: tripKeys.lists() })
    },
  })
}

export function useRegenerateTripQrCode(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => regenerateTripQrCode(id),
    onSuccess: (trip) => cacheTrip(queryClient, trip),
  })
}
