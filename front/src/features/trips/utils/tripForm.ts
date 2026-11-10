import type { InspectionIndicator } from '../../inspection-checklist/index.ts'
import { formatTime } from '../../../shared/utils/formatDate.ts'
import type {
  CreateTripRequest,
  InspectionResultBody,
  Trip,
  TripInspection,
  UpdateTripRequest,
} from '../types/trip.ts'
import type { PassengerFormValues, TripFormValues } from '../types/tripSchemas.ts'

/** One indicator and its checks, as the inspection section renders them. */
export interface InspectionGroup {
  id: string
  nameEn: string
  nameAr: string
  checks: { checkId: string; nameEn: string; nameAr: string }[]
}

export const EMPTY_PASSENGER: PassengerFormValues = { name: '', identityNumber: '', docType: '', nationality: '' }

/** New trips: every live check of the admin checklist. */
export function groupsFromChecklist(indicators: InspectionIndicator[]): InspectionGroup[] {
  return indicators
    .filter((indicator) => indicator.checks.length > 0)
    .map((indicator) => ({
      id: indicator.id,
      nameEn: indicator.nameEn,
      nameAr: indicator.nameAr,
      checks: indicator.checks.map((check) => ({ checkId: check.id, nameEn: check.nameEn, nameAr: check.nameAr })),
    }))
}

/** Existing trips: the inspection's own snapshot (later checklist changes do not apply). */
export function groupsFromInspection(inspection: TripInspection | null): InspectionGroup[] {
  return (inspection?.indicators ?? []).map((indicator) => ({
    id: indicator.indicatorId,
    nameEn: indicator.nameEn,
    nameAr: indicator.nameAr,
    checks: indicator.checks.map((check) => ({ checkId: check.checkId, nameEn: check.nameEn, nameAr: check.nameAr })),
  }))
}

export function newTripFormValues(groups: InspectionGroup[]): TripFormValues {
  return {
    origin: '',
    destination: '',
    tripName: '',
    secretCode: '',
    vehicleId: '',
    driverId: '',
    date: '',
    time: '',
    passengers: [],
    inspectedAt: '',
    results: groups
      .flatMap((group) => group.checks)
      .map((check) => ({ checkId: check.checkId, status: '', note: '' })),
  }
}

export function tripToFormValues(trip: Trip): TripFormValues {
  const checks = trip.inspection?.indicators.flatMap((indicator) => indicator.checks) ?? []
  return {
    origin: trip.origin ?? '',
    destination: trip.destination ?? '',
    tripName: trip.tripName ?? '',
    secretCode: trip.secretCode ?? '',
    vehicleId: trip.vehicleId,
    driverId: trip.driverId,
    date: trip.date,
    time: formatTime(trip.time),
    passengers: trip.passengers.map(({ name, identityNumber, docType, nationality }) => ({
      name,
      identityNumber,
      docType,
      nationality,
    })),
    inspectedAt: trip.inspection ? toDateTimeInput(trip.inspection.inspectedAt) : '',
    results: checks.map((check) => ({
      checkId: check.checkId,
      status: check.status ? 'good' : 'faulty',
      note: check.note ?? '',
    })),
  }
}

export function toCreateTripRequest(values: TripFormValues): CreateTripRequest {
  return {
    origin: values.origin,
    destination: values.destination,
    tripName: values.tripName || null,
    secretCode: values.secretCode || null,
    vehicleId: values.vehicleId,
    driverId: values.driverId,
    date: values.date,
    time: values.time,
    // "omit for none"
    passengers: values.passengers.length > 0 ? values.passengers : undefined,
    inspection: {
      inspectedAt: values.inspectedAt ? fromDateTimeInput(values.inspectedAt) : undefined,
      results: values.results.map(toResultBody),
    },
  }
}

/** Only what differs from `original` (tripToFormValues of the loaded trip). Empty object = nothing to save. */
export function toUpdateTripRequest(values: TripFormValues, original: TripFormValues): UpdateTripRequest {
  const body: UpdateTripRequest = {}
  if (values.tripName !== original.tripName) {
    body.tripName = values.tripName || null
  }
  if (values.secretCode !== original.secretCode) {
    body.secretCode = values.secretCode || null
  }
  for (const key of ['origin', 'destination', 'vehicleId', 'driverId', 'date', 'time'] as const) {
    if (values[key] !== original[key]) {
      body[key] = values[key]
    }
  }
  // The API replaces the whole list, so send it only when it changed.
  if (JSON.stringify(values.passengers) !== JSON.stringify(original.passengers)) {
    body.passengers = values.passengers
  }

  const changedResults = values.results
    .filter((result, index) => {
      const before = original.results[index]
      return result.status !== before?.status || result.note !== before?.note
    })
    .map(toResultBody)
  const inspection: NonNullable<UpdateTripRequest['inspection']> = {}
  if (values.inspectedAt && values.inspectedAt !== original.inspectedAt) {
    inspection.inspectedAt = fromDateTimeInput(values.inspectedAt)
  }
  if (changedResults.length > 0) {
    inspection.results = changedResults
  }
  if (inspection.inspectedAt || inspection.results) {
    body.inspection = inspection
  }
  return body
}

function toResultBody(result: TripFormValues['results'][number]): InspectionResultBody {
  // An omitted note means "no note", so clearing the text removes it.
  return { checkId: result.checkId, status: result.status === 'good', note: result.note || undefined }
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

/** ISO timestamp -> "YYYY-MM-DDTHH:mm" in the user's timezone (datetime-local value). */
function toDateTimeInput(iso: string): string {
  const date = new Date(iso)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** datetime-local value (local time) -> ISO 8601 in UTC ("…Z" is a valid offset). */
function fromDateTimeInput(value: string): string {
  return new Date(value).toISOString()
}
