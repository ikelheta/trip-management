# Story 11 — Trips list, details, create and edit with passengers and the pre-trip inspection

Covers backend **Story 08** (trips with passengers) and **Story 10** (inspection required on create, edited through the trip).

## Prerequisites

- **Story 02 completed:** [../app-foundation/02-story-app-shell-routing-api-client-and-shared-ui.md](../app-foundation/02-story-app-shell-routing-api-client-and-shared-ui.md) — `apiRequest`, `Paginated`, `queryClient`, `router.tsx`, `navigation.ts`, `ROUTES`, `Field`, `FormError`, `ErrorAlert`, `LoadingState`, `EmptyState`, `Pagination`, `SearchInput`, `ConfirmDialog`, `PageHeader`, `useListParams`, `applyServerErrors`, `formatDate` / `formatTime` / `formatDateTime`, global CSS.
- **Story 03 completed:** [../authentication/03-story-login-session-and-protected-routes.md](../authentication/03-story-login-session-and-protected-routes.md) — routes under `RequireAuth` + `AppLayout`; `HomePage` uses `useNavItems()`.
- **Story 08 (vehicles)**, **Story 09 (drivers)** and **Story 10 (inspection checklist)** completed. This story uses only their public APIs:
  - `src/features/vehicles/index.ts`: `Vehicle`, `useAllVehicles()` (TanStack query, `data: Vehicle[]`), `VehicleSelect`.
  - `src/features/drivers/index.ts`: `Driver`, `useAllDrivers()` (`data: Driver[]`), `DriverSelect`.
  - `src/features/inspection-checklist/index.ts`: `InspectionIndicator`, `useInspectionChecklist()` (`data: InspectionIndicator[]`, each with its live `checks`).
  - Select contract: props `SelectHTMLAttributes<HTMLSelectElement> & { placeholder?: string; ref?: Ref<HTMLSelectElement> }` — renders `<option value="">{placeholder}</option>` plus one option per row; works with `{...register('vehicleId')}` and as a controlled filter (`value` + `onChange`).
  - `ROUTES.inspectionChecklist` exists (Story 10).
- Intake: [../../stories/trips/trip-list-details-and-form-with-passengers-and-inspection/intake.md](../../stories/trips/trip-list-details-and-form-with-passengers-and-inspection/intake.md).
- API contract: `backend/contracts/trips.md` (whole file), `backend/contracts/inspection-checklist.md` (`InspectionIndicator`, `InspectionCheck`).
- Backend running with a seeded checklist and at least one vehicle and driver for the Test Plan.
- **Do not start until `npm run build` passes on the current `src/`.**

---

## Story Goal

1. `/trips`: paginated list with search, vehicle, driver and date-range filters in the URL; plate and driver name resolved from the "all" hooks; inspection badge.
2. `/trips/:id`: details, passengers, inspection grouped by indicator; Edit and Delete.
3. `/trips/new`: one form for the trip, its passengers (field array) and the full inspection checklist.
4. `/trips/:id/edit`: the same form, sending a PATCH with **only what changed**.
5. Sidebar item **Trips** first; `/` redirects to `/trips`.

**Not in scope:** QR code (Story 12), printing a trip sheet, double-booking warnings, nationality picker for passengers (the API takes free text), tests.

**Hard constraints for the executor:**

- Conventions from `src/README.md`, Story 02 and Story 03: no semicolons, `.ts`/`.tsx` import extensions, `import type`, no `enum`, no `any`, named exports, a `.tsx` file exports only components, CSS classes from `src/shared/styles/index.css`, component-specific styles in a `*.module.css`.
- All trips code lives in `src/features/trips/`. Other features are imported **only** through their `index.ts`. Outside code imports trips only from `src/features/trips/index.ts`.
- API types and calls match `backend/contracts/trips.md` exactly. Query keys live in `tripKeys` (`hooks/useTrips.ts`, root `'trips'`); list queries use `placeholderData: keepPreviousData`.
- `TripListQuery` is a `type` alias (not an `interface`), so it is assignable to `RequestOptions['query']` (`Record<string, …>`; interfaces have no implicit index signature).
- No new dependencies.

---

## Context — Read These Files First

1. `backend/contracts/trips.md` — types, POST rules (one result per live check), GET query (`search` = trip name, `vehicleId`, `driverId`, `dateFrom`, `dateTo`), PATCH semantics (passengers replace; results only listed checks; `null` clears name / code), error table, "Front-end notes".
2. `backend/contracts/inspection-checklist.md` — `InspectionIndicator { id, nameAr, nameEn, sortOrder, checks }`, `InspectionCheck { id, indicatorId, nameAr, nameEn, sortOrder }`.
3. `src/shared/services/httpClient.ts` — `apiRequest`, `RequestOptions['query']`.
4. `src/shared/hooks/useListParams.ts` — `page`, `search`, `getFilter`, `setPage`, `setSearch`, `setFilter`.
5. `src/shared/utils/formErrors.ts` — `applyServerErrors` (field messages start with `"<field> "`; others go to `root.server`).
6. `src/shared/utils/formatDate.ts` — `formatDate`, `formatTime`, `formatDateTime`.
7. `src/shared/components/ui/*` — `Field`, `FormError`, `ErrorAlert`, `LoadingState`, `EmptyState`, `Pagination`, `SearchInput`, `ConfirmDialog`; `src/shared/components/layout/PageHeader.tsx`.
8. `src/app/routes/router.tsx` — layout children (`index` → `HomePage`, `changePassword`, other features' routes, `*`).
9. `src/app/layout/navigation.ts` — `NAV_ITEMS`; `src/app/pages/HomePage.tsx`.
10. `src/config/routes.ts` — `ROUTES`.
11. `src/features/vehicles/index.ts`, `src/features/drivers/index.ts`, `src/features/inspection-checklist/index.ts` — the exports listed in Prerequisites.

---

## Implementation tasks

Final folder: `src/features/trips/` with `types/`, `services/`, `hooks/`, `utils/`, `components/`, `pages/`, `index.ts`.

### 1 — Types

**New file: `src/features/trips/types/trip.ts`**

```ts
export interface Passenger {
  id: string
  name: string
  /** Digits only, as a string (keeps leading zeros). */
  identityNumber: string
  docType: string
  /** Free text, not a country id. */
  nationality: string
}

export interface InspectionCheckResult {
  checkId: string
  /** Snapshot taken when the inspection was created. */
  nameAr: string
  nameEn: string
  /** true = good. */
  status: boolean
  note: string | null
}

export interface InspectionIndicatorResult {
  indicatorId: string
  nameAr: string
  nameEn: string
  passed: boolean
  checks: InspectionCheckResult[]
}

export interface TripInspection {
  id: string
  tripId: string
  /** ISO timestamp (UTC). */
  inspectedAt: string
  passed: boolean
  failedCount: number
  indicators: InspectionIndicatorResult[]
  createdAt: string
  updatedAt: string
}

export interface Trip {
  id: string
  tripName: string | null
  secretCode: string | null
  vehicleId: string
  driverId: string
  /** "YYYY-MM-DD" wall-clock date. */
  date: string
  /** "HH:mm:ss" wall-clock time. */
  time: string
  /** "/api/files/<id>/download" (PNG); null if generation failed or the trip predates QR codes. */
  qrCodeUrl: string | null
  /** Sorted by name. */
  passengers: Passenger[]
  /** Null only for trips created before inspections were required. */
  inspection: TripInspection | null
  createdAt: string
  updatedAt: string
}

export interface PassengerBody {
  name: string
  identityNumber: string
  docType: string
  nationality: string
}

export interface InspectionResultBody {
  checkId: string
  status: boolean
  /** Omitted = no note. */
  note?: string
}

export interface CreateTripRequest {
  tripName?: string | null
  secretCode?: string | null
  vehicleId: string
  driverId: string
  date: string
  time: string
  passengers?: PassengerBody[]
  inspection: {
    /** ISO 8601 with offset; omitted = now. */
    inspectedAt?: string
    /** Exactly one per live check. */
    results: InspectionResultBody[]
  }
}

export interface UpdateTripRequest {
  tripName?: string | null
  secretCode?: string | null
  vehicleId?: string
  driverId?: string
  date?: string
  time?: string
  /** Replaces the whole list; [] clears it. */
  passengers?: PassengerBody[]
  inspection?: {
    inspectedAt?: string
    /** Only the checks to change. */
    results?: InspectionResultBody[]
  }
}

// A type alias (not an interface) so it is assignable to RequestOptions['query'].
export type TripListQuery = {
  page?: number
  limit?: number
  search?: string
  vehicleId?: string
  driverId?: string
  dateFrom?: string
  dateTo?: string
}
```

### 2 — Form schema

**New file: `src/features/trips/types/tripSchemas.ts`** — rules from `backend/contracts/trips.md` "Request bodies".

```ts
import { z } from 'zod'

export const MAX_PASSENGERS = 100
export const NOTE_MAX_LENGTH = 500

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/
const IDENTITY_NUMBER_PATTERN = /^\d{1,50}$/
const NAME_MESSAGE = 'Use 2–256 characters'

const passengerSchema = z.object({
  name: z.string().trim().min(2, NAME_MESSAGE).max(256, NAME_MESSAGE),
  identityNumber: z.string().trim().regex(IDENTITY_NUMBER_PATTERN, 'Use 1–50 digits only'),
  docType: z.string().trim().min(1, 'Enter the document type').max(50, 'Use at most 50 characters'),
  nationality: z.string().trim().min(2, NAME_MESSAGE).max(256, NAME_MESSAGE),
})

const resultSchema = z.object({
  checkId: z.string(),
  // '' = not answered yet (new trips start unanswered). The `: boolean` return type stops TypeScript
  // inferring a type guard, which would make zod narrow the output type and split form input / output types.
  status: z.enum(['', 'good', 'faulty']).refine((status): boolean => status !== '', 'Answer this check'),
  note: z.string().trim().max(NOTE_MAX_LENGTH, `Use at most ${NOTE_MAX_LENGTH} characters`),
})

export const tripFormSchema = z.object({
  tripName: z
    .string()
    .trim()
    .refine((name) => name === '' || (name.length >= 2 && name.length <= 256), 'Use 2–256 characters, or leave it empty'),
  secretCode: z.string().trim().max(50, 'Use at most 50 characters'),
  vehicleId: z.string().min(1, 'Choose a vehicle'),
  driverId: z.string().min(1, 'Choose a driver'),
  date: z.string().regex(DATE_PATTERN, 'Choose a date'),
  time: z.string().regex(TIME_PATTERN, 'Choose a time'),
  passengers: z
    .array(passengerSchema)
    .max(MAX_PASSENGERS, `At most ${MAX_PASSENGERS} passengers`)
    .superRefine((passengers, ctx) => {
      const seen = new Set<string>()
      passengers.forEach((passenger, index) => {
        if (seen.has(passenger.identityNumber)) {
          ctx.addIssue({
            code: 'custom',
            message: 'This identity number is already in the list',
            path: [index, 'identityNumber'],
          })
        }
        seen.add(passenger.identityNumber)
      })
    }),
  /** <input type="datetime-local"> value, '' = server default (now) / unchanged. */
  inspectedAt: z.string(),
  /** Same order as the inspection groups shown in the form. */
  results: z.array(resultSchema),
})

export type TripFormValues = z.infer<typeof tripFormSchema>
export type PassengerFormValues = TripFormValues['passengers'][number]
```

### 3 — Form mapping helpers

**New file: `src/features/trips/utils/tripForm.ts`** — converts between API shapes and form values, and builds the minimal PATCH body.

```ts
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
  for (const key of ['vehicleId', 'driverId', 'date', 'time'] as const) {
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
```

### 4 — Service

**New file: `src/features/trips/services/tripService.ts`**

```ts
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
```

### 5 — Query hooks

**New file: `src/features/trips/hooks/useTrips.ts`**

```ts
import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { createTrip, deleteTrip, fetchTrip, fetchTrips, updateTrip } from '../services/tripService.ts'
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

export function useTrip(id: string) {
  return useQuery({
    queryKey: tripKeys.detail(id),
    queryFn: ({ signal }) => fetchTrip(id, signal),
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
```

### 6 — Components

**New file: `src/features/trips/components/TripSections.module.css`** — shared by the trip components below.

```css
.sectionHeader {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  justify-content: space-between;
  align-items: center;
}

.sectionHeader h2,
.sectionHeader h3 {
  margin: 0;
}

.passengerRow {
  display: grid;
  grid-template-columns: repeat(4, minmax(140px, 1fr)) auto;
  gap: var(--space-3);
  align-items: end;
}

.group {
  display: grid;
  gap: var(--space-3);
  margin: 0;
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
}

.group legend {
  padding: 0 var(--space-2);
  font-weight: 600;
}

.check {
  display: grid;
  grid-template-columns: minmax(160px, 1fr) auto minmax(160px, 1fr);
  gap: var(--space-3);
  align-items: center;
}

.choices {
  display: flex;
  gap: var(--space-4);
}

.checkError {
  grid-column: 1 / -1;
}

@media (max-width: 720px) {
  .passengerRow,
  .check {
    grid-template-columns: 1fr;
  }
}
```

**New file: `src/features/trips/components/InspectionBadge.tsx`**

```tsx
import type { TripInspection } from '../types/trip.ts'

interface InspectionBadgeProps {
  inspection: TripInspection | null
}

export function InspectionBadge({ inspection }: InspectionBadgeProps) {
  if (!inspection) {
    return <span className="badge">No inspection</span>
  }
  if (inspection.passed) {
    return <span className="badge badge-success">Passed</span>
  }
  return <span className="badge badge-danger">{inspection.failedCount} failed</span>
}
```

**New file: `src/features/trips/components/PassengersFieldset.tsx`** — `useFieldArray` inside the trip form (`FormProvider`).

```tsx
import { useFieldArray, useFormContext } from 'react-hook-form'
import { Field } from '../../../shared/components/ui/Field.tsx'
import { MAX_PASSENGERS, type TripFormValues } from '../types/tripSchemas.ts'
import { EMPTY_PASSENGER } from '../utils/tripForm.ts'
import styles from './TripSections.module.css'

export function PassengersFieldset() {
  const {
    control,
    register,
    formState: { errors },
  } = useFormContext<TripFormValues>()
  const { fields, append, remove } = useFieldArray({ control, name: 'passengers' })
  const listError = errors.passengers?.message ?? errors.passengers?.root?.message

  return (
    <section className="card stack">
      <div className={styles.sectionHeader}>
        <h2>Passengers ({fields.length})</h2>
        <button
          type="button"
          className="btn btn-secondary btn-small"
          disabled={fields.length >= MAX_PASSENGERS}
          onClick={() => append({ ...EMPTY_PASSENGER })}
        >
          Add passenger
        </button>
      </div>
      {listError && (
        <p className="field-error" role="alert">
          {listError}
        </p>
      )}
      {fields.length === 0 && <p className="muted">No passengers.</p>}
      {fields.map((field, index) => {
        const rowErrors = errors.passengers?.[index]
        return (
          <div key={field.id} className={styles.passengerRow}>
            <Field label="Name" htmlFor={`passengers.${index}.name`} error={rowErrors?.name?.message}>
              <input
                id={`passengers.${index}.name`}
                className="input"
                aria-invalid={Boolean(rowErrors?.name)}
                {...register(`passengers.${index}.name`)}
              />
            </Field>
            <Field
              label="Identity number"
              htmlFor={`passengers.${index}.identityNumber`}
              error={rowErrors?.identityNumber?.message}
            >
              <input
                id={`passengers.${index}.identityNumber`}
                className="input"
                inputMode="numeric"
                aria-invalid={Boolean(rowErrors?.identityNumber)}
                {...register(`passengers.${index}.identityNumber`)}
              />
            </Field>
            <Field label="Document type" htmlFor={`passengers.${index}.docType`} error={rowErrors?.docType?.message}>
              <input
                id={`passengers.${index}.docType`}
                className="input"
                placeholder="passport"
                aria-invalid={Boolean(rowErrors?.docType)}
                {...register(`passengers.${index}.docType`)}
              />
            </Field>
            <Field
              label="Nationality"
              htmlFor={`passengers.${index}.nationality`}
              error={rowErrors?.nationality?.message}
            >
              <input
                id={`passengers.${index}.nationality`}
                className="input"
                aria-invalid={Boolean(rowErrors?.nationality)}
                {...register(`passengers.${index}.nationality`)}
              />
            </Field>
            <button
              type="button"
              className="btn btn-secondary btn-small"
              aria-label={`Remove passenger ${index + 1}`}
              onClick={() => remove(index)}
            >
              Remove
            </button>
          </div>
        )
      })}
    </section>
  )
}
```

**New file: `src/features/trips/components/InspectionFieldset.tsx`** — one Good / Faulty choice and an optional note per check, grouped by indicator. `results[index]` follows the flattened order of `groups`.

```tsx
import { useFormContext } from 'react-hook-form'
import { Field } from '../../../shared/components/ui/Field.tsx'
import { NOTE_MAX_LENGTH, type TripFormValues } from '../types/tripSchemas.ts'
import type { InspectionGroup } from '../utils/tripForm.ts'
import styles from './TripSections.module.css'

interface InspectionFieldsetProps {
  groups: InspectionGroup[]
}

export function InspectionFieldset({ groups }: InspectionFieldsetProps) {
  const {
    register,
    setValue,
    formState: { errors },
  } = useFormContext<TripFormValues>()
  const checks = groups.flatMap((group) => group.checks)
  const indexByCheckId = new Map(checks.map((check, index) => [check.checkId, index]))

  function markAllGood(): void {
    checks.forEach((_check, index) => {
      setValue(`results.${index}.status`, 'good', { shouldDirty: true, shouldValidate: true })
    })
  }

  return (
    <section className="card stack">
      <div className={styles.sectionHeader}>
        <h2>Pre-trip inspection</h2>
        <button type="button" className="btn btn-secondary btn-small" onClick={markAllGood}>
          Mark all good
        </button>
      </div>
      <Field label="Inspected at" htmlFor="inspectedAt" hint="Your local time. Leave empty to use the time you save.">
        <input id="inspectedAt" type="datetime-local" className="input" {...register('inspectedAt')} />
      </Field>
      {groups.map((group) => (
        <fieldset key={group.id} className={styles.group}>
          <legend>
            {group.nameEn}{' '}
            <span className="muted" lang="ar" dir="rtl">
              {group.nameAr}
            </span>
          </legend>
          {group.checks.map((check) => {
            const index = indexByCheckId.get(check.checkId) ?? 0
            const checkErrors = errors.results?.[index]
            return (
              <div key={check.checkId} className={styles.check}>
                <span>
                  {check.nameEn}{' '}
                  <span className="muted" lang="ar" dir="rtl">
                    {check.nameAr}
                  </span>
                </span>
                <div className={styles.choices} role="radiogroup" aria-label={check.nameEn}>
                  <label className="checkbox">
                    <input type="radio" value="good" {...register(`results.${index}.status`)} /> Good
                  </label>
                  <label className="checkbox">
                    <input type="radio" value="faulty" {...register(`results.${index}.status`)} /> Faulty
                  </label>
                </div>
                <input
                  className="input"
                  placeholder="Note (optional)"
                  aria-label={`Note for ${check.nameEn}`}
                  maxLength={NOTE_MAX_LENGTH}
                  {...register(`results.${index}.note`)}
                />
                {(checkErrors?.status || checkErrors?.note) && (
                  <p className={`field-error ${styles.checkError}`} role="alert">
                    {checkErrors.status?.message ?? checkErrors.note?.message}
                  </p>
                )}
              </div>
            )
          })}
        </fieldset>
      ))}
    </section>
  )
}
```

**New file: `src/features/trips/components/TripForm.tsx`** — used by the create and edit pages. The page decides what to send; the form shows server errors.

```tsx
import { zodResolver } from '@hookform/resolvers/zod'
import { FormProvider, useForm } from 'react-hook-form'
import { Link } from 'react-router'
import { DriverSelect, useAllDrivers } from '../../drivers/index.ts'
import { useAllVehicles, VehicleSelect } from '../../vehicles/index.ts'
import { ErrorAlert } from '../../../shared/components/ui/ErrorAlert.tsx'
import { Field } from '../../../shared/components/ui/Field.tsx'
import { FormError } from '../../../shared/components/ui/FormError.tsx'
import { LoadingState } from '../../../shared/components/ui/LoadingState.tsx'
import { applyServerErrors } from '../../../shared/utils/formErrors.ts'
import { tripFormSchema, type TripFormValues } from '../types/tripSchemas.ts'
import type { InspectionGroup } from '../utils/tripForm.ts'
import { InspectionFieldset } from './InspectionFieldset.tsx'
import { PassengersFieldset } from './PassengersFieldset.tsx'

interface TripFormProps {
  defaultValues: TripFormValues
  /** Empty = no inspection section (old trips without an inspection). */
  groups: InspectionGroup[]
  submitLabel: string
  cancelTo: string
  onSubmit: (values: TripFormValues) => Promise<void>
}

// Messages such as "inspection.results …", "Vehicle <id> does not exist" go to the top of the form.
const SERVER_FIELDS = ['tripName', 'secretCode', 'vehicleId', 'driverId', 'date', 'time', 'passengers'] as const

export function TripForm({ defaultValues, groups, submitLabel, cancelTo, onSubmit }: TripFormProps) {
  const form = useForm<TripFormValues>({ resolver: zodResolver(tripFormSchema), defaultValues })
  const vehicles = useAllVehicles()
  const drivers = useAllDrivers()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = form

  // The selects need their options before register() applies the saved ids, or an edit form shows "Choose …".
  if (vehicles.isError || drivers.isError) {
    return <ErrorAlert error={vehicles.error ?? drivers.error} title="Could not load vehicles and drivers." />
  }
  if (vehicles.isPending || drivers.isPending) {
    return <LoadingState label="Loading vehicles and drivers…" />
  }

  async function submit(values: TripFormValues): Promise<void> {
    try {
      await onSubmit(values)
    } catch (error) {
      applyServerErrors(error, setError, SERVER_FIELDS)
    }
  }

  return (
    <FormProvider {...form}>
      <form className="stack" onSubmit={handleSubmit(submit)} noValidate>
        <FormError message={errors.root?.server?.message} />
        <section className="card stack">
          <h2>Trip</h2>
          <div className="form-grid">
            <Field label="Vehicle" htmlFor="vehicleId" error={errors.vehicleId?.message}>
              <VehicleSelect
                id="vehicleId"
                placeholder="Choose a vehicle"
                aria-invalid={Boolean(errors.vehicleId)}
                {...register('vehicleId')}
              />
            </Field>
            <Field label="Driver" htmlFor="driverId" error={errors.driverId?.message}>
              <DriverSelect
                id="driverId"
                placeholder="Choose a driver"
                aria-invalid={Boolean(errors.driverId)}
                {...register('driverId')}
              />
            </Field>
            <Field label="Date" htmlFor="date" error={errors.date?.message}>
              <input id="date" type="date" className="input" aria-invalid={Boolean(errors.date)} {...register('date')} />
            </Field>
            <Field label="Time" htmlFor="time" error={errors.time?.message}>
              <input id="time" type="time" className="input" aria-invalid={Boolean(errors.time)} {...register('time')} />
            </Field>
            <Field label="Trip name" htmlFor="tripName" error={errors.tripName?.message} hint="Optional">
              <input id="tripName" className="input" aria-invalid={Boolean(errors.tripName)} {...register('tripName')} />
            </Field>
            <Field label="Secret code" htmlFor="secretCode" error={errors.secretCode?.message} hint="Optional">
              <input
                id="secretCode"
                className="input"
                autoComplete="off"
                aria-invalid={Boolean(errors.secretCode)}
                {...register('secretCode')}
              />
            </Field>
          </div>
        </section>
        <PassengersFieldset />
        {groups.length > 0 && <InspectionFieldset groups={groups} />}
        <div className="form-actions">
          <Link to={cancelTo} className="btn btn-secondary">
            Cancel
          </Link>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : submitLabel}
          </button>
        </div>
      </form>
    </FormProvider>
  )
}
```

**New file: `src/features/trips/components/TripsTable.tsx`**

```tsx
import { Link } from 'react-router'
import { ROUTES } from '../../../config/routes.ts'
import { formatDate, formatTime } from '../../../shared/utils/formatDate.ts'
import type { Trip } from '../types/trip.ts'
import { InspectionBadge } from './InspectionBadge.tsx'

interface TripsTableProps {
  trips: Trip[]
  plateByVehicleId: Map<string, string>
  nameByDriverId: Map<string, string>
}

export function TripsTable({ trips, plateByVehicleId, nameByDriverId }: TripsTableProps) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Time</th>
            <th>Trip</th>
            <th>Vehicle</th>
            <th>Driver</th>
            <th>Passengers</th>
            <th>Inspection</th>
            <th>
              <span className="muted">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {trips.map((trip) => (
            <tr key={trip.id}>
              <td>{formatDate(trip.date)}</td>
              <td>{formatTime(trip.time)}</td>
              <td>
                <Link to={ROUTES.trip(trip.id)}>{trip.tripName ?? 'Untitled trip'}</Link>
              </td>
              <td>{plateByVehicleId.get(trip.vehicleId) ?? '—'}</td>
              <td>{nameByDriverId.get(trip.driverId) ?? '—'}</td>
              <td>{trip.passengers.length}</td>
              <td>
                <InspectionBadge inspection={trip.inspection} />
              </td>
              <td>
                <div className="table-actions">
                  <Link to={ROUTES.trip(trip.id)} className="btn btn-secondary btn-small">
                    View
                  </Link>
                  <Link to={ROUTES.editTrip(trip.id)} className="btn btn-secondary btn-small">
                    Edit
                  </Link>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

**New file: `src/features/trips/components/PassengersTable.tsx`**

```tsx
import type { Passenger } from '../types/trip.ts'

interface PassengersTableProps {
  passengers: Passenger[]
}

export function PassengersTable({ passengers }: PassengersTableProps) {
  if (passengers.length === 0) {
    return <p className="muted">No passengers.</p>
  }
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Identity number</th>
            <th>Document type</th>
            <th>Nationality</th>
          </tr>
        </thead>
        <tbody>
          {passengers.map((passenger) => (
            <tr key={passenger.id}>
              <td>{passenger.name}</td>
              <td>{passenger.identityNumber}</td>
              <td>{passenger.docType}</td>
              <td>{passenger.nationality}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

**New file: `src/features/trips/components/TripInspectionView.tsx`**

```tsx
import { formatDateTime } from '../../../shared/utils/formatDate.ts'
import type { TripInspection } from '../types/trip.ts'
import { InspectionBadge } from './InspectionBadge.tsx'
import styles from './TripSections.module.css'

interface TripInspectionViewProps {
  inspection: TripInspection | null
}

export function TripInspectionView({ inspection }: TripInspectionViewProps) {
  return (
    <section className="card stack">
      <div className={styles.sectionHeader}>
        <h2>Pre-trip inspection</h2>
        <InspectionBadge inspection={inspection} />
      </div>
      {!inspection && <p className="muted">This trip was created before inspections were required.</p>}
      {inspection && <p className="muted">Inspected {formatDateTime(inspection.inspectedAt)}</p>}
      {inspection?.indicators.map((indicator) => (
        <div key={indicator.indicatorId} className="stack">
          <div className={styles.sectionHeader}>
            <h3>
              {indicator.nameEn}{' '}
              <span className="muted" lang="ar" dir="rtl">
                {indicator.nameAr}
              </span>
            </h3>
            <span className={`badge ${indicator.passed ? 'badge-success' : 'badge-danger'}`}>
              {indicator.passed ? 'Passed' : 'Failed'}
            </span>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Check</th>
                  <th>Result</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {indicator.checks.map((check) => (
                  <tr key={check.checkId}>
                    <td>
                      {check.nameEn}{' '}
                      <span className="muted" lang="ar" dir="rtl">
                        {check.nameAr}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${check.status ? 'badge-success' : 'badge-danger'}`}>
                        {check.status ? 'Good' : 'Faulty'}
                      </span>
                    </td>
                    <td>{check.note ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </section>
  )
}
```

### 7 — Pages

**New file: `src/features/trips/pages/TripsListPage.module.css`**

```css
.filters {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: var(--space-3);
  align-items: end;
  margin-bottom: var(--space-4);
}
```

**New file: `src/features/trips/pages/TripsListPage.tsx`**

```tsx
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { ROUTES } from '../../../config/routes.ts'
import { DriverSelect, useAllDrivers } from '../../drivers/index.ts'
import { useAllVehicles, VehicleSelect } from '../../vehicles/index.ts'
import { PageHeader } from '../../../shared/components/layout/PageHeader.tsx'
import { EmptyState } from '../../../shared/components/ui/EmptyState.tsx'
import { ErrorAlert } from '../../../shared/components/ui/ErrorAlert.tsx'
import { Field } from '../../../shared/components/ui/Field.tsx'
import { LoadingState } from '../../../shared/components/ui/LoadingState.tsx'
import { Pagination } from '../../../shared/components/ui/Pagination.tsx'
import { SearchInput } from '../../../shared/components/ui/SearchInput.tsx'
import { useListParams } from '../../../shared/hooks/useListParams.ts'
import { TripsTable } from '../components/TripsTable.tsx'
import { useTrips } from '../hooks/useTrips.ts'
import styles from './TripsListPage.module.css'

const PAGE_SIZE = 20

export function TripsListPage() {
  const navigate = useNavigate()
  const { page, search, getFilter, setPage, setSearch, setFilter } = useListParams()
  // Remounts the uncontrolled search box when the filters are cleared.
  const [searchResetKey, setSearchResetKey] = useState(0)
  const vehicleId = getFilter('vehicleId')
  const driverId = getFilter('driverId')
  const dateFrom = getFilter('dateFrom')
  const dateTo = getFilter('dateTo')

  const trips = useTrips({ page, limit: PAGE_SIZE, search, vehicleId, driverId, dateFrom, dateTo })
  const vehicles = useAllVehicles()
  const drivers = useAllDrivers()
  const plateByVehicleId = new Map((vehicles.data ?? []).map((vehicle) => [vehicle.id, vehicle.plateNumber]))
  const nameByDriverId = new Map((drivers.data ?? []).map((driver) => [driver.id, driver.name]))
  const hasFilters = Boolean(search || vehicleId || driverId || dateFrom || dateTo)

  function clearFilters(): void {
    navigate(ROUTES.trips, { replace: true })
    setSearchResetKey((key) => key + 1)
  }

  return (
    <>
      <PageHeader
        title="Trips"
        actions={
          <Link to={ROUTES.newTrip} className="btn btn-primary">
            New trip
          </Link>
        }
      />
      <div className={styles.filters}>
        <SearchInput
          key={searchResetKey}
          defaultValue={search}
          onSearch={setSearch}
          label="Search trips by name"
          placeholder="Search by trip name…"
        />
        <Field label="Vehicle" htmlFor="vehicle-filter">
          <VehicleSelect
            id="vehicle-filter"
            placeholder="All vehicles"
            value={vehicleId}
            onChange={(event) => setFilter('vehicleId', event.target.value)}
          />
        </Field>
        <Field label="Driver" htmlFor="driver-filter">
          <DriverSelect
            id="driver-filter"
            placeholder="All drivers"
            value={driverId}
            onChange={(event) => setFilter('driverId', event.target.value)}
          />
        </Field>
        <Field label="From" htmlFor="date-from">
          <input
            id="date-from"
            type="date"
            className="input"
            value={dateFrom}
            max={dateTo || undefined}
            onChange={(event) => setFilter('dateFrom', event.target.value)}
          />
        </Field>
        <Field label="To" htmlFor="date-to">
          <input
            id="date-to"
            type="date"
            className="input"
            value={dateTo}
            min={dateFrom || undefined}
            onChange={(event) => setFilter('dateTo', event.target.value)}
          />
        </Field>
        {hasFilters && (
          <button type="button" className="btn btn-secondary" onClick={clearFilters}>
            Clear filters
          </button>
        )}
      </div>

      <ErrorAlert error={trips.error} />
      {trips.isPending && <LoadingState />}
      {trips.data && trips.data.data.length === 0 && (
        <EmptyState message={hasFilters ? 'No trips match these filters.' : 'No trips yet.'}>
          <Link to={ROUTES.newTrip} className="btn btn-primary">
            New trip
          </Link>
        </EmptyState>
      )}
      {trips.data && trips.data.data.length > 0 && (
        <>
          <TripsTable trips={trips.data.data} plateByVehicleId={plateByVehicleId} nameByDriverId={nameByDriverId} />
          <Pagination meta={trips.data.meta} onPageChange={setPage} />
        </>
      )}
    </>
  )
}
```

**New file: `src/features/trips/pages/TripDetailsPage.tsx`**

```tsx
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ROUTES } from '../../../config/routes.ts'
import { useAllDrivers } from '../../drivers/index.ts'
import { useAllVehicles } from '../../vehicles/index.ts'
import { PageHeader } from '../../../shared/components/layout/PageHeader.tsx'
import { ConfirmDialog } from '../../../shared/components/ui/ConfirmDialog.tsx'
import { ErrorAlert } from '../../../shared/components/ui/ErrorAlert.tsx'
import { LoadingState } from '../../../shared/components/ui/LoadingState.tsx'
import { formatDate, formatDateTime, formatTime } from '../../../shared/utils/formatDate.ts'
import { PassengersTable } from '../components/PassengersTable.tsx'
import { TripInspectionView } from '../components/TripInspectionView.tsx'
import { useDeleteTrip, useTrip } from '../hooks/useTrips.ts'

export function TripDetailsPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const trip = useTrip(id)
  const vehicles = useAllVehicles()
  const drivers = useAllDrivers()
  const deleteTrip = useDeleteTrip()
  const [confirmOpen, setConfirmOpen] = useState(false)

  if (trip.isPending) {
    return <LoadingState />
  }
  if (trip.isError) {
    return (
      <div className="stack">
        <ErrorAlert error={trip.error} />
        <Link to={ROUTES.trips}>Back to trips</Link>
      </div>
    )
  }

  const data = trip.data
  const vehicle = vehicles.data?.find((item) => item.id === data.vehicleId)
  const driver = drivers.data?.find((item) => item.id === data.driverId)

  function handleDelete(): void {
    deleteTrip.mutate(data.id, { onSuccess: () => navigate(ROUTES.trips, { replace: true }) })
  }

  function handleCancelDelete(): void {
    setConfirmOpen(false)
    deleteTrip.reset()
  }

  return (
    <>
      <PageHeader
        title={data.tripName ?? 'Untitled trip'}
        description={`${formatDate(data.date)} at ${formatTime(data.time)}`}
        actions={
          <>
            <Link to={ROUTES.editTrip(data.id)} className="btn btn-secondary">
              Edit
            </Link>
            <button type="button" className="btn btn-danger" onClick={() => setConfirmOpen(true)}>
              Delete
            </button>
          </>
        }
      />
      <div className="stack">
        <section className="card">
          <dl className="details">
            <dt>Vehicle</dt>
            <dd>{vehicle ? `${vehicle.plateNumber} — ${vehicle.model}` : 'Unknown vehicle'}</dd>
            <dt>Driver</dt>
            <dd>{driver?.name ?? 'Unknown driver'}</dd>
            <dt>Secret code</dt>
            <dd>{data.secretCode ?? '—'}</dd>
            <dt>Created</dt>
            <dd>{formatDateTime(data.createdAt)}</dd>
            <dt>Updated</dt>
            <dd>{formatDateTime(data.updatedAt)}</dd>
          </dl>
        </section>
        <section className="card stack">
          <h2>Passengers ({data.passengers.length})</h2>
          <PassengersTable passengers={data.passengers} />
        </section>
        <TripInspectionView inspection={data.inspection} />
      </div>
      <ConfirmDialog
        open={confirmOpen}
        title="Delete this trip?"
        pending={deleteTrip.isPending}
        error={deleteTrip.error}
        onConfirm={handleDelete}
        onCancel={handleCancelDelete}
      >
        <p>The trip, its passengers and its inspection will no longer be shown.</p>
      </ConfirmDialog>
    </>
  )
}
```

**New file: `src/features/trips/pages/CreateTripPage.tsx`**

```tsx
import { Link, useNavigate } from 'react-router'
import { ROUTES } from '../../../config/routes.ts'
import { useInspectionChecklist } from '../../inspection-checklist/index.ts'
import { PageHeader } from '../../../shared/components/layout/PageHeader.tsx'
import { ErrorAlert } from '../../../shared/components/ui/ErrorAlert.tsx'
import { LoadingState } from '../../../shared/components/ui/LoadingState.tsx'
import { TripForm } from '../components/TripForm.tsx'
import { useCreateTrip } from '../hooks/useTrips.ts'
import type { TripFormValues } from '../types/tripSchemas.ts'
import { groupsFromChecklist, newTripFormValues, toCreateTripRequest } from '../utils/tripForm.ts'

export function CreateTripPage() {
  const navigate = useNavigate()
  const checklist = useInspectionChecklist()
  const createTrip = useCreateTrip()

  async function handleSubmit(values: TripFormValues): Promise<void> {
    const trip = await createTrip.mutateAsync(toCreateTripRequest(values))
    navigate(ROUTES.trip(trip.id))
  }

  if (checklist.isPending) {
    return <LoadingState label="Loading the inspection checklist…" />
  }
  if (checklist.isError) {
    return <ErrorAlert error={checklist.error} title="Could not load the inspection checklist." />
  }

  const groups = groupsFromChecklist(checklist.data)
  return (
    <>
      <PageHeader title="New trip" />
      {groups.length === 0 ? (
        <div className="alert alert-info">
          <p>
            No inspection checks are configured, and every trip needs an inspection. Add checks on the{' '}
            <Link to={ROUTES.inspectionChecklist}>inspection checklist</Link> page first.
          </p>
        </div>
      ) : (
        <TripForm
          defaultValues={newTripFormValues(groups)}
          groups={groups}
          submitLabel="Create trip"
          cancelTo={ROUTES.trips}
          onSubmit={handleSubmit}
        />
      )}
    </>
  )
}
```

**New file: `src/features/trips/pages/EditTripPage.tsx`**

```tsx
import { Link, useNavigate, useParams } from 'react-router'
import { ROUTES } from '../../../config/routes.ts'
import { PageHeader } from '../../../shared/components/layout/PageHeader.tsx'
import { ErrorAlert } from '../../../shared/components/ui/ErrorAlert.tsx'
import { LoadingState } from '../../../shared/components/ui/LoadingState.tsx'
import { TripForm } from '../components/TripForm.tsx'
import { useTrip, useUpdateTrip } from '../hooks/useTrips.ts'
import type { TripFormValues } from '../types/tripSchemas.ts'
import { groupsFromInspection, toUpdateTripRequest, tripToFormValues } from '../utils/tripForm.ts'

export function EditTripPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const trip = useTrip(id)
  const updateTrip = useUpdateTrip(id)

  if (trip.isPending) {
    return <LoadingState />
  }
  if (trip.isError) {
    return (
      <div className="stack">
        <ErrorAlert error={trip.error} />
        <Link to={ROUTES.trips}>Back to trips</Link>
      </div>
    )
  }

  const original = tripToFormValues(trip.data)

  async function handleSubmit(values: TripFormValues): Promise<void> {
    const body = toUpdateTripRequest(values, original)
    if (Object.keys(body).length > 0) {
      await updateTrip.mutateAsync(body)
    }
    navigate(ROUTES.trip(id))
  }

  return (
    <>
      <PageHeader title="Edit trip" description={trip.data.tripName ?? undefined} />
      <div className="stack">
        {!trip.data.inspection && (
          <div className="alert alert-info">
            <p>This trip was created before inspections were required, so it has no inspection to edit.</p>
          </div>
        )}
        <TripForm
          key={trip.data.id}
          defaultValues={original}
          groups={groupsFromInspection(trip.data.inspection)}
          submitLabel="Save changes"
          cancelTo={ROUTES.trip(id)}
          onSubmit={handleSubmit}
        />
      </div>
    </>
  )
}
```

### 8 — Public API

**New file: `src/features/trips/index.ts`**

```ts
export { CreateTripPage } from './pages/CreateTripPage.tsx'
export { EditTripPage } from './pages/EditTripPage.tsx'
export { TripDetailsPage } from './pages/TripDetailsPage.tsx'
export { TripsListPage } from './pages/TripsListPage.tsx'
export type { Trip } from './types/trip.ts'
```

### 9 — Routes, navigation, home redirect

**File: `src/config/routes.ts`** — add to `ROUTES` (keep the other features' keys):

```ts
  trips: '/trips',
  newTrip: '/trips/new',
  trip: (id: string): string => `/trips/${id}`,
  editTrip: (id: string): string => `/trips/${id}/edit`,
```

**File: `src/app/layout/navigation.ts`** — import `ROUTES` from `../../config/routes.ts` if not imported yet and put Trips **first** in `NAV_ITEMS` (final order: Trips, Drivers, Vehicles, Companies, Countries, Inspection checklist, Users):

```ts
  { label: 'Trips', to: ROUTES.trips },
```

**File: `src/app/routes/router.tsx`**

- Import `Navigate` from `react-router` and `CreateTripPage, EditTripPage, TripDetailsPage, TripsListPage` from `../../features/trips/index.ts`.
- **Decision — the home route redirects to the trips list** (trips are the main daily task; the sidebar already lists every section). Replace `{ index: true, element: <HomePage /> }` with:

```tsx
          { index: true, element: <Navigate to={ROUTES.trips} replace /> },
```

- Add with the other feature routes (before `*`):

```tsx
          { path: ROUTES.trips, element: <TripsListPage /> },
          { path: ROUTES.newTrip, element: <CreateTripPage /> },
          { path: '/trips/:id', element: <TripDetailsPage /> },
          { path: '/trips/:id/edit', element: <EditTripPage /> },
```

- Delete `src/app/pages/HomePage.tsx` and its import (it is no longer routed). `useNavItems` stays (used by `AppLayout`). `ROUTES.home` stays: the brand link and the not-found page link to `/`, which now redirects.

### 10 — Docs and plans

- `src/README.md`: in the "Routes" pattern bullet, note that `/` redirects to `/trips`.
- New [00-overview.md](00-overview.md) for `trips` (Stories 11 and 12). The parent updates `../00-index.md`.

---

## Edge Cases & Failure Modes

- **No inspection checks configured** → create page shows the info alert with a link to the checklist page instead of the form (the API would answer `No inspection checks are configured`).
- **Checklist changed while the create form is open** (an admin adds or deletes a check) → API 400 `Missing results for checks: …` or `Unknown or deleted checks: …` on top of the form; reloading the page loads the new checklist.
- **Unanswered check** → "Answer this check" under it, no request. "Mark all good" answers all at once.
- **Passengers:** non-digit identity → "Use 1–50 digits only"; repeated identity number → error on the later row (the API would answer `passengers must not repeat an identityNumber`); 100 rows → "Add passenger" disabled. Leading zeros are kept (string).
- **Empty optional fields:** create sends `tripName: null` / `secretCode: null` (allowed); edit sends `null` only when a value was cleared.
- **Edit sends only changes:** unchanged form → no request, back to details. Passenger list compared as JSON of the trimmed rows; any change sends the whole list (the API replaces it). A result is sent when its status or note changed; clearing a note omits `note` = no note.
- **`inspectedAt`:** `datetime-local` is the user's local time; sent as UTC ISO (`…Z`). Edit compares to minute precision, so an untouched value is never sent. Clearing it on edit sends nothing (unchanged).
- **Old trips without an inspection** (`inspection: null`) → details say so; edit shows a note and no inspection section (the API would answer `Trip <id> has no inspection`).
- **Vehicle or driver deleted** after the trip was created → list shows `—`, details "Unknown vehicle" / "Unknown driver"; on edit the select shows the placeholder, and saving without choosing → "Choose a vehicle". Picking a deleted id is impossible (the "all" hooks return live rows); a race gives `Vehicle <id> does not exist` on top.
- **Date filters:** `min` / `max` on the inputs prevent a reversed range; a hand-edited URL gets the API's `dateFrom must be on or before dateTo` in the `ErrorAlert`.
- **Bad id in the URL** → 400 `Validation failed (uuid is expected)`; unknown → 404 `Trip <id> not found`; both shown with a "Back to trips" link.
- **Delete** → 204, detail cache removed, lists refetched, back to the list. A failed delete shows the error inside the dialog.
- **Arabic names** are shown next to the English ones with `lang="ar" dir="rtl"`.
- **Large lists:** 20 per page; `keepPreviousData` avoids flashing while paging or filtering.

---

## Test Plan

No test runner. Manual, backend running with the seeded checklist, signed in as the admin, at least one vehicle and one driver:

1. `/` → redirects to `/trips`; sidebar shows **Trips** first.
2. New trip: submit empty → errors on vehicle, driver, date, time and every check ("Answer this check"). Add a passenger with identity `12a` → "Use 1–50 digits only"; add two passengers with the same identity → error on the second.
3. Fill a valid trip, 2 passengers, "Mark all good", then set one check to Faulty with a note → **Create trip** → details page: passengers table (sorted by name), inspection badge "1 failed", the faulty check with its note, inspected time.
4. List: the new trip appears with plate, driver name, `2` passengers and "1 failed". Search by part of its name; filter by vehicle, driver, date range; reload → filters and page stay; "Clear filters" resets them and the search box.
5. Edit: change only the time → DevTools Network shows `PATCH /api/trips/:id` with body `{"time":"…"}` only. Clear the trip name → body `{"tripName":null}`. Set the faulty check to Good → body has `inspection.results` with that one check; details show "Passed". Remove a passenger → body has the full remaining `passengers` list. Save without changes → no request.
6. Hand-edit the URL to `?dateFrom=2026-12-01&dateTo=2026-11-01` → error "dateFrom must be on or before dateTo".
7. Delete from the details page → confirm → back on the list without it.
8. `/trips/abc` → "Validation failed (uuid is expected)"; `/trips/00000000-0000-4000-8000-000000000000` → "Trip … not found".

---

## Migration / Rollback

- No data. Rollback: delete `src/features/trips/`, restore `HomePage.tsx` and the index route, remove the `ROUTES` keys and the nav item.

---

## Verification Steps

1. `npm run build` → no errors.
2. `npm run lint` → no errors.
3. `grep -rnw "any" src` → none.
4. `grep -rn "\.\./\(vehicles\|drivers\|inspection-checklist\|files\)/" src/features/trips | grep -v "index.ts'"` → no output (other features only through `index.ts`; inside `src/features` a cross-feature import looks like `../../vehicles/…`, so a `features/vehicles/` pattern could never fail).
5. `grep -rn "features/trips/" src --include=*.ts --include=*.tsx | grep -v "^src/features/trips/" | grep -v "index.ts'"` → no output.
6. Test Plan steps 1–8.

---

## Done Criteria

> **Implemented 2026-11-07.** Verified headless: `npm run build` (only the known >500 kB chunk notice), `npm run lint` (exit 0, no findings), no `any`, Verification greps 4–5 (no output). Dev server: `/`, `/trips`, `/trips/new`, `/trips/abc`, `/trips/abc/edit` and `src/features/trips/index.ts` return 200; the served router has `index: true` → `<Navigate to={ROUTES.trips} replace />`. The real `tripSchemas.ts` / `tripForm.ts` (loaded with Node 24 type stripping) produced the bodies sent through the proxy with a Bearer token: create (16 results for 16 live checks, 2 passengers, `secretCode: null`, `inspectedAt` as UTC) → 201, `failedCount: 1`, passengers sorted by name; list with search + vehicleId + driverId + dateFrom/dateTo → the trip, another range → none, reversed range → 400 `dateFrom must be on or before dateTo`; GET by id; unchanged edit → `{}` (no request); edit → `{ tripName: null, time, passengers (full list), inspection.results: [one check, with note] }` → 200; the saved trip re-mapped → `{}`; schema errors on the expected paths (`passengers.1.identityNumber` duplicate, `results.N.status` "Answer this check"). Test trip, driver, vehicle and company deleted (204). Browser Test Plan steps not run.
>
> **Differences from the plan as first written:** (1) `tripSchemas.ts`: the status `.refine` callback has an explicit `: boolean` return type. TypeScript inferred a type guard, zod v4 then narrowed the output to `'good' | 'faulty'`, and `useForm<TripFormValues>({ resolver })` and `newTripFormValues` did not compile. (2) Verification step 4 grep changed to the `../../vehicles/` form (plus `files`) so it can fail. (3) The `src/README.md` note went into the "Routes" pattern bullet (there is no "Routes" heading). `errors.passengers?.root?.message` and `.superRefine` + `ctx.addIssue({ code: 'custom', … })` compiled as written.

- [x] `src/features/trips/` with types, schema, form helpers, service, `tripKeys` hooks, components and the four pages, exported from `index.ts`.
- [ ] List with search, vehicle, driver and date filters in the URL, pagination, resolved plate / driver names and inspection badge. — browser check not run yet (API filters verified).
- [ ] Details page with passengers and the grouped inspection; delete with confirmation. — browser check not run yet (GET / DELETE verified).
- [ ] Create form with passengers (field array, client checks) and the full checklist; edit form sends only changed fields per the PATCH rules. — browser check not run yet (schema and request bodies verified against the API).
- [x] `ROUTES.trips/newTrip/trip/editTrip`, routes, Trips first in the sidebar, `/` redirects to `/trips`, `HomePage.tsx` removed.
- [x] `src/README.md` and the `trips` overview updated.
- [x] `npm run build` and `npm run lint` pass; no `any`.

**STOP HERE. Report to the user and wait for confirmation before proceeding to Story 12.**
