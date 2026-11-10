import { apiRequest } from '../../../shared/services/httpClient.ts'
import type { Paginated } from '../../../shared/types/api.ts'
import type { CreateTripRequest, Trip, TripListQuery, UpdateTripRequest } from '../types/trip.ts'

export function fetchTrips(query: TripListQuery, signal?: AbortSignal): Promise<Paginated<Trip>> {
  return apiRequest<Paginated<Trip>>('/trips', { query, signal })
}

export function fetchTrip(id: string, signal?: AbortSignal): Promise<Trip> {
  return apiRequest<Trip>(`/trips/${id}`, { signal })
}

export function createTrip(body: CreateTripRequest): Promise<Trip> {
  return apiRequest<Trip>('/trips', { method: 'POST', body })
}

export function updateTrip(id: string, body: UpdateTripRequest): Promise<Trip> {
  return apiRequest<Trip>(`/trips/${id}`, { method: 'PATCH', body })
}

export function deleteTrip(id: string): Promise<void> {
  return apiRequest<void>(`/trips/${id}`, { method: 'DELETE' })
}

/** New QR code for the trip; the previous QR file is deleted. The encoded url (trip url) does not change. */
export function regenerateTripQrCode(id: string): Promise<Trip> {
  return apiRequest<Trip>(`/trips/${id}/qr-code`, { method: 'POST' })
}
