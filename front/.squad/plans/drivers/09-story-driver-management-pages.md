# Story 09 — Driver management pages and a driver picker for other features

## Prerequisites

- **Story 02 completed:** [../app-foundation/02-story-app-shell-routing-api-client-and-shared-ui.md](../app-foundation/02-story-app-shell-routing-api-client-and-shared-ui.md) — HTTP client, `fetchAllPages`, shared UI, `useListParams`, `applyServerErrors`, `formatDateTime`, global CSS.
- **Story 03 completed:** [../authentication/03-story-login-session-and-protected-routes.md](../authentication/03-story-login-session-and-protected-routes.md).
- **Story 07 completed:** [../countries/07-story-country-management-page.md](../countries/07-story-country-management-page.md) — `src/features/countries/index.ts`: `Country`, `useAllCountries`, `CountrySelect`, `formatCountryName`; global `.visually-hidden`.
- **Story 08 completed:** [../vehicles/08-story-vehicle-management-pages.md](../vehicles/08-story-vehicle-management-pages.md) — `src/features/vehicles/index.ts`: `Vehicle`, `useAllVehicles`, `VehicleSelect`, `formatVehicleLabel`. Also the layout to mirror (service / hooks / select / form / table / pages).
- Intake: [../../stories/drivers/driver-management-pages/intake.md](../../stories/drivers/driver-management-pages/intake.md).
- API contract: `backend/contracts/drivers.md`.
- **Do not start until `npm run build` passes on the current `src/`.**

---

## Story Goal

1. `/drivers`: paginated, searchable list with nationality and vehicle filters and resolved names.
2. `/drivers/new` and `/drivers/:id/edit`: one shared form.
3. Delete with confirmation.
4. Public API: `Driver`, `useAllDrivers()`, `DriverSelect`, `formatDriverLabel`, plus the pages.
5. Sidebar item "Drivers".

**Not in scope:** details page, licences / documents, availability, tests.

**Hard constraints for the executor:**

- Conventions from `src/README.md` and Stories 02/03 (no semicolons, import extensions, `import type`, no `enum` / `any`, named exports, `.tsx` exports only components).
- All code in `src/features/drivers/`; countries and vehicles are used **only** through their `index.ts`.
- API calls only in `services/driverService.ts`; query hooks only in `hooks/useDrivers.ts`.
- Every field, rule and message from `backend/contracts/drivers.md`. No new dependencies.

---

## Context — Read These Files First

1. `backend/contracts/drivers.md` — whole file (types, `search` fields, `nationalityId` / `vehicleId` filters, errors).
2. `src/features/vehicles/` — the pattern this story mirrors (`VehicleForm` gates on its picker data; `VehiclesPage` resolves names with a `Map`).
3. `src/features/countries/index.ts`, `src/features/vehicles/index.ts`.
4. `src/shared/hooks/useListParams.ts` — `getFilter`, `setFilter`.
5. `src/app/routes/router.tsx`, `src/app/layout/navigation.ts` (order: Trips, **Drivers**, Vehicles, Companies, Countries, Inspection checklist, Users), `src/config/routes.ts`.

---

## Implementation tasks

### 1 — Types and schema

**New file: `src/features/drivers/types/driver.ts`**

```ts
import type { ListQuery } from '../../../shared/types/api.ts'

/** backend/contracts/drivers.md `Driver`. */
export interface Driver {
  id: string
  name: string
  identityId: string
  /** Country id. */
  nationalityId: string
  vehicleId: string
  createdAt: string
  updatedAt: string
}

/** Body of POST /drivers and PATCH /drivers/:id (all fields sent). */
export interface DriverRequest {
  name: string
  identityId: string
  nationalityId: string
  vehicleId: string
}

// A type alias (not an interface) so it stays assignable to RequestOptions['query'].
export type DriverListQuery = ListQuery & {
  nationalityId?: string
  vehicleId?: string
}
```

**New file: `src/features/drivers/types/driverSchema.ts`**

```ts
import { z } from 'zod'

const NAME_MIN_LENGTH = 2
const NAME_MAX_LENGTH = 256
const IDENTITY_ID_MAX_LENGTH = 50

export const driverSchema = z.object({
  name: z
    .string()
    .trim()
    .min(NAME_MIN_LENGTH, `Use at least ${NAME_MIN_LENGTH} characters`)
    .max(NAME_MAX_LENGTH, `Use at most ${NAME_MAX_LENGTH} characters`),
  identityId: z
    .string()
    .trim()
    .min(1, 'Enter the identity number')
    .max(IDENTITY_ID_MAX_LENGTH, `Use at most ${IDENTITY_ID_MAX_LENGTH} characters`),
  nationalityId: z.string().min(1, 'Select a nationality'),
  vehicleId: z.string().min(1, 'Select a vehicle'),
})

export type DriverFormValues = z.infer<typeof driverSchema>
```

### 2 — Service

**New file: `src/features/drivers/services/driverService.ts`**

```ts
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
```

### 3 — Query hooks

**New file: `src/features/drivers/hooks/useDrivers.ts`**

```ts
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query'
import type { Paginated } from '../../../shared/types/api.ts'
import {
  createDriver,
  deleteDriver,
  fetchAllDrivers,
  fetchDriver,
  fetchDrivers,
  updateDriver,
} from '../services/driverService.ts'
import type { Driver, DriverListQuery, DriverRequest } from '../types/driver.ts'

const ALL_DRIVERS_STALE_TIME_MS = 5 * 60 * 1000

export const driverKeys = {
  root: ['drivers'] as const,
  all: ['drivers', 'all'] as const,
  list: (query: DriverListQuery) => ['drivers', 'list', query] as const,
  detail: (id: string) => ['drivers', 'detail', id] as const,
}

export function useDrivers(query: DriverListQuery): UseQueryResult<Paginated<Driver>> {
  return useQuery({
    queryKey: driverKeys.list(query),
    queryFn: ({ signal }) => fetchDrivers(query, signal),
    placeholderData: keepPreviousData,
  })
}

export function useDriver(id: string): UseQueryResult<Driver> {
  return useQuery({
    queryKey: driverKeys.detail(id),
    queryFn: ({ signal }) => fetchDriver(id, signal),
    enabled: id !== '',
  })
}

/** Every driver for pickers and name lookups. */
export function useAllDrivers(): UseQueryResult<Driver[]> {
  return useQuery({
    queryKey: driverKeys.all,
    queryFn: fetchAllDrivers,
    staleTime: ALL_DRIVERS_STALE_TIME_MS,
  })
}

function useInvalidateDrivers(): () => Promise<void> {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: driverKeys.root })
}

export function useCreateDriver(): UseMutationResult<Driver, Error, DriverRequest> {
  const invalidate = useInvalidateDrivers()
  return useMutation({ mutationFn: createDriver, onSuccess: invalidate })
}

export function useUpdateDriver(): UseMutationResult<Driver, Error, { id: string; body: DriverRequest }> {
  const invalidate = useInvalidateDrivers()
  return useMutation({ mutationFn: ({ id, body }) => updateDriver(id, body), onSuccess: invalidate })
}

export function useDeleteDriver(): UseMutationResult<void, Error, string> {
  const invalidate = useInvalidateDrivers()
  return useMutation({ mutationFn: deleteDriver, onSuccess: invalidate })
}
```

### 4 — Label helper

**New file: `src/features/drivers/utils/formatDriverLabel.ts`**

```ts
import type { Driver } from '../types/driver.ts'

/** "Mohammed Ali (1010101010)" */
export function formatDriverLabel(driver: Driver): string {
  return `${driver.name} (${driver.identityId})`
}
```

### 5 — Components

**New file: `src/features/drivers/components/DriverSelect.tsx`**

```tsx
import type { Ref, SelectHTMLAttributes } from 'react'
import { useAllDrivers } from '../hooks/useDrivers.ts'
import { formatDriverLabel } from '../utils/formatDriverLabel.ts'

interface DriverSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  placeholder?: string
  ref?: Ref<HTMLSelectElement>
}

export function DriverSelect({ placeholder = 'Select a driver', ref, className = '', ...props }: DriverSelectProps) {
  const drivers = useAllDrivers()

  let emptyLabel = placeholder
  if (drivers.isPending) {
    emptyLabel = 'Loading drivers…'
  } else if (drivers.isError) {
    emptyLabel = 'Could not load drivers'
  }

  return (
    <select ref={ref} className={`input ${className}`} {...props}>
      <option value="">{emptyLabel}</option>
      {drivers.data?.map((driver) => (
        <option key={driver.id} value={driver.id}>
          {formatDriverLabel(driver)}
        </option>
      ))}
    </select>
  )
}
```

**New file: `src/features/drivers/components/DriverForm.tsx`** — all hooks first; renders once countries and vehicles are loaded so the registered selects get their default values.

```tsx
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'
import { ROUTES } from '../../../config/routes.ts'
import { ErrorAlert } from '../../../shared/components/ui/ErrorAlert.tsx'
import { Field } from '../../../shared/components/ui/Field.tsx'
import { FormError } from '../../../shared/components/ui/FormError.tsx'
import { LoadingState } from '../../../shared/components/ui/LoadingState.tsx'
import { applyServerErrors } from '../../../shared/utils/formErrors.ts'
import { CountrySelect, useAllCountries } from '../../countries/index.ts'
import { VehicleSelect, useAllVehicles } from '../../vehicles/index.ts'
import { useCreateDriver, useUpdateDriver } from '../hooks/useDrivers.ts'
import type { Driver } from '../types/driver.ts'
import { driverSchema, type DriverFormValues } from '../types/driverSchema.ts'

interface DriverFormProps {
  driver?: Driver
}

export function DriverForm({ driver }: DriverFormProps) {
  const navigate = useNavigate()
  const countries = useAllCountries()
  const vehicles = useAllVehicles()
  const createDriver = useCreateDriver()
  const updateDriver = useUpdateDriver()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<DriverFormValues>({
    resolver: zodResolver(driverSchema),
    defaultValues: {
      name: driver?.name ?? '',
      identityId: driver?.identityId ?? '',
      nationalityId: driver?.nationalityId ?? '',
      vehicleId: driver?.vehicleId ?? '',
    },
  })

  async function onSubmit(values: DriverFormValues): Promise<void> {
    try {
      if (driver) {
        await updateDriver.mutateAsync({ id: driver.id, body: values })
      } else {
        await createDriver.mutateAsync(values)
      }
      navigate(ROUTES.drivers)
    } catch (error) {
      // "Country <id> does not exist", "Vehicle <id> does not exist" and 409 go to FormError.
      applyServerErrors(error, setError, ['name', 'identityId', 'nationalityId', 'vehicleId'])
    }
  }

  if (countries.isPending || vehicles.isPending) {
    return <LoadingState label="Loading countries and vehicles…" />
  }
  if (countries.isError || vehicles.isError) {
    return <ErrorAlert error={countries.error ?? vehicles.error} title="Could not load the form options." />
  }

  return (
    <form className="card form" onSubmit={handleSubmit(onSubmit)} noValidate>
      <FormError message={errors.root?.server?.message} />
      <div className="form-grid">
        <Field label="Name" htmlFor="name" error={errors.name?.message}>
          <input id="name" className="input" aria-invalid={Boolean(errors.name)} {...register('name')} />
        </Field>
        <Field label="Identity number" htmlFor="identityId" error={errors.identityId?.message} hint="National ID or iqama">
          <input
            id="identityId"
            className="input"
            aria-invalid={Boolean(errors.identityId)}
            {...register('identityId')}
          />
        </Field>
        <Field label="Nationality" htmlFor="nationalityId" error={errors.nationalityId?.message}>
          <CountrySelect
            id="nationalityId"
            aria-invalid={Boolean(errors.nationalityId)}
            {...register('nationalityId')}
          />
        </Field>
        <Field label="Vehicle" htmlFor="vehicleId" error={errors.vehicleId?.message}>
          <VehicleSelect id="vehicleId" aria-invalid={Boolean(errors.vehicleId)} {...register('vehicleId')} />
        </Field>
      </div>
      <div className="form-actions">
        <Link to={ROUTES.drivers} className="btn btn-secondary">
          Cancel
        </Link>
        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  )
}
```

**New file: `src/features/drivers/components/DriverTable.tsx`**

```tsx
import { Link } from 'react-router'
import { ROUTES } from '../../../config/routes.ts'
import { formatDateTime } from '../../../shared/utils/formatDate.ts'
import type { Driver } from '../types/driver.ts'

interface DriverTableProps {
  drivers: Driver[]
  getNationality: (countryId: string) => string
  getVehicle: (vehicleId: string) => string
  onDelete: (driver: Driver) => void
}

export function DriverTable({ drivers, getNationality, getVehicle, onDelete }: DriverTableProps) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Identity number</th>
            <th>Nationality</th>
            <th>Vehicle</th>
            <th>Last updated</th>
            <th>
              <span className="visually-hidden">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {drivers.map((driver) => (
            <tr key={driver.id}>
              <td>{driver.name}</td>
              <td>{driver.identityId}</td>
              <td>{getNationality(driver.nationalityId)}</td>
              <td>{getVehicle(driver.vehicleId)}</td>
              <td>{formatDateTime(driver.updatedAt)}</td>
              <td>
                <div className="table-actions">
                  <Link to={ROUTES.editDriver(driver.id)} className="btn btn-secondary btn-small">
                    Edit
                  </Link>
                  <button type="button" className="btn btn-danger btn-small" onClick={() => onDelete(driver)}>
                    Delete
                  </button>
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

### 6 — Pages

**New file: `src/features/drivers/pages/DriversPage.tsx`**

```tsx
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { ROUTES } from '../../../config/routes.ts'
import { PageHeader } from '../../../shared/components/layout/PageHeader.tsx'
import { ConfirmDialog } from '../../../shared/components/ui/ConfirmDialog.tsx'
import { EmptyState } from '../../../shared/components/ui/EmptyState.tsx'
import { ErrorAlert } from '../../../shared/components/ui/ErrorAlert.tsx'
import { LoadingState } from '../../../shared/components/ui/LoadingState.tsx'
import { Pagination } from '../../../shared/components/ui/Pagination.tsx'
import { SearchInput } from '../../../shared/components/ui/SearchInput.tsx'
import { useListParams } from '../../../shared/hooks/useListParams.ts'
import { CountrySelect, formatCountryName, useAllCountries } from '../../countries/index.ts'
import { VehicleSelect, formatVehicleLabel, useAllVehicles } from '../../vehicles/index.ts'
import { DriverTable } from '../components/DriverTable.tsx'
import { useDeleteDriver, useDrivers } from '../hooks/useDrivers.ts'
import type { Driver } from '../types/driver.ts'

const NATIONALITY_FILTER = 'nationalityId'
const VEHICLE_FILTER = 'vehicleId'

export function DriversPage() {
  const { page, search, getFilter, setPage, setSearch, setFilter } = useListParams()
  const nationalityId = getFilter(NATIONALITY_FILTER)
  const vehicleId = getFilter(VEHICLE_FILTER)
  const drivers = useDrivers({ page, search, nationalityId, vehicleId })
  const countries = useAllCountries()
  const vehicles = useAllVehicles()
  const deleteDriver = useDeleteDriver()
  const [driverToDelete, setDriverToDelete] = useState<Driver | null>(null)

  const countryNames = new Map(
    countries.data?.map((country): [string, string] => [country.id, formatCountryName(country)]),
  )
  const vehicleLabels = new Map(
    vehicles.data?.map((vehicle): [string, string] => [vehicle.id, formatVehicleLabel(vehicle)]),
  )

  function getNationality(id: string): string {
    if (!countries.data) {
      return '…'
    }
    return countryNames.get(id) ?? 'Deleted country'
  }

  function getVehicle(id: string): string {
    if (!vehicles.data) {
      return '…'
    }
    return vehicleLabels.get(id) ?? 'Deleted vehicle'
  }

  function closeDelete(): void {
    setDriverToDelete(null)
    deleteDriver.reset()
  }

  function confirmDelete(): void {
    if (driverToDelete) {
      deleteDriver.mutate(driverToDelete.id, { onSuccess: closeDelete })
    }
  }

  function renderList(): ReactNode {
    if (drivers.isPending) {
      return <LoadingState />
    }
    if (drivers.isError) {
      return <ErrorAlert error={drivers.error} />
    }
    if (drivers.data.data.length === 0) {
      const filtered = search || nationalityId || vehicleId
      return <EmptyState message={filtered ? 'No drivers match these filters.' : 'No drivers yet.'} />
    }
    return (
      <>
        <DriverTable
          drivers={drivers.data.data}
          getNationality={getNationality}
          getVehicle={getVehicle}
          onDelete={setDriverToDelete}
        />
        <Pagination meta={drivers.data.meta} onPageChange={setPage} />
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Drivers"
        description="Drivers with their nationality and assigned vehicle."
        actions={
          <Link to={ROUTES.newDriver} className="btn btn-primary">
            New driver
          </Link>
        }
      />
      <div className="toolbar">
        <SearchInput defaultValue={search} onSearch={setSearch} placeholder="Search name or identity number…" />
        <CountrySelect
          aria-label="Filter by nationality"
          placeholder="All nationalities"
          className="search-input"
          value={nationalityId}
          onChange={(event) => setFilter(NATIONALITY_FILTER, event.target.value)}
        />
        <VehicleSelect
          aria-label="Filter by vehicle"
          placeholder="All vehicles"
          className="search-input"
          value={vehicleId}
          onChange={(event) => setFilter(VEHICLE_FILTER, event.target.value)}
        />
      </div>
      {renderList()}

      <ConfirmDialog
        open={driverToDelete !== null}
        title="Delete driver"
        pending={deleteDriver.isPending}
        error={deleteDriver.error}
        onConfirm={confirmDelete}
        onCancel={closeDelete}
      >
        <p>
          Delete <strong>{driverToDelete?.name}</strong>? Trips that use this driver keep them, but they can no
          longer be chosen for new trips.
        </p>
      </ConfirmDialog>
    </>
  )
}
```

**New file: `src/features/drivers/pages/NewDriverPage.tsx`**

```tsx
import { PageHeader } from '../../../shared/components/layout/PageHeader.tsx'
import { DriverForm } from '../components/DriverForm.tsx'

export function NewDriverPage() {
  return (
    <>
      <PageHeader title="New driver" />
      <DriverForm />
    </>
  )
}
```

**New file: `src/features/drivers/pages/EditDriverPage.tsx`**

```tsx
import { Link, useParams } from 'react-router'
import { ROUTES } from '../../../config/routes.ts'
import { PageHeader } from '../../../shared/components/layout/PageHeader.tsx'
import { ErrorAlert } from '../../../shared/components/ui/ErrorAlert.tsx'
import { LoadingState } from '../../../shared/components/ui/LoadingState.tsx'
import { DriverForm } from '../components/DriverForm.tsx'
import { useDriver } from '../hooks/useDrivers.ts'

export function EditDriverPage() {
  const { id = '' } = useParams()
  const driver = useDriver(id)

  if (driver.isPending) {
    return <LoadingState />
  }
  if (driver.isError) {
    return (
      <div className="stack">
        <ErrorAlert error={driver.error} />
        <Link to={ROUTES.drivers}>Back to drivers</Link>
      </div>
    )
  }
  return (
    <>
      <PageHeader title={`Edit driver ${driver.data.name}`} />
      <DriverForm key={driver.data.id} driver={driver.data} />
    </>
  )
}
```

### 7 — Public API

**New file: `src/features/drivers/index.ts`**

```ts
export { DriverSelect } from './components/DriverSelect.tsx'
export { useAllDrivers } from './hooks/useDrivers.ts'
export { DriversPage } from './pages/DriversPage.tsx'
export { EditDriverPage } from './pages/EditDriverPage.tsx'
export { NewDriverPage } from './pages/NewDriverPage.tsx'
export type { Driver } from './types/driver.ts'
export { formatDriverLabel } from './utils/formatDriverLabel.ts'
```

### 8 — Routes, paths and navigation

**File: `src/config/routes.ts`** — add to `ROUTES`:

```ts
  drivers: '/drivers',
  newDriver: '/drivers/new',
  editDriver: (id: string): string => `/drivers/${id}/edit`,
```

**File: `src/app/routes/router.tsx`** — import `DriversPage`, `EditDriverPage`, `NewDriverPage` from `../../features/drivers/index.ts`; add before `'*'`:

```tsx
          { path: ROUTES.drivers, element: <DriversPage /> },
          { path: ROUTES.newDriver, element: <NewDriverPage /> },
          { path: '/drivers/:id/edit', element: <EditDriverPage /> },
```

**File: `src/app/layout/navigation.ts`** — add, after "Trips" (if present) and before "Vehicles":

```ts
  { label: 'Drivers', to: ROUTES.drivers },
```

### 9 — Docs and plans

- New [00-overview.md](00-overview.md) for `drivers`.

---

## Edge Cases & Failure Modes

- **Duplicate identity id** → 409 `Identity id is already in use` → `FormError`. Unchanged identity id on edit is accepted (backend checks only when it changes).
- **Country / vehicle deleted after the form opened** → 400 `Country <id> does not exist` / `Vehicle <id> does not exist` → `FormError`.
- **Driver whose nationality or vehicle was soft-deleted** → list shows "Deleted country" / "Deleted vehicle"; on edit the matching select shows the empty choice and "Select a nationality" / "Select a vehicle" blocks saving until a live one is picked.
- **Options fail to load** → the form shows the error instead of empty selects.
- **Unknown / deleted driver on edit** → 404 `Driver <id> not found`; non-UUID → 400 `Validation failed (uuid is expected)`.
- **Two filters + search** combine; each change resets to page 1; empty values are removed from the URL.
- **Identity id** keeps leading zeros (string; trimmed only).
- **Deleting** invalidates `['drivers']`, so `DriverSelect` (trips) refreshes.

---

## Test Plan

No test runner. Manual, backend running, signed in, at least one vehicle (Story 08):

1. Sidebar "Drivers" → list with nationality and vehicle names.
2. Search by part of a name and by identity number → matching rows.
3. Nationality filter "Saudi Arabia" → only those drivers; add a vehicle filter → both apply; reload keeps them.
4. New driver: empty submit → four field errors, no request. Fill in → saved, back on the list.
5. Same identity number again → "Identity id is already in use".
6. Edit → change the vehicle → list shows the new vehicle. `/drivers/00000000-0000-4000-8000-000000000000/edit` → "Driver … not found".
7. Delete → confirm → row gone.

---

## Migration / Rollback

- No data migration. Rollback: delete `src/features/drivers/`, the three routes, the `ROUTES` keys and the nav item.

---

## Verification Steps

1. `npm run build` → no errors. 2. `npm run lint` → no errors. 3. `grep -rnw "any" src/features/drivers` → none.
4. `grep -rnE "from '[^']*(countries|vehicles)/" src/features/drivers | grep -v "/index.ts'"` → no output (a deep import from this feature looks like `../../countries/…` or `../vehicles/…`, never `features/countries/`).
5. `grep -rnE "from '[^']*drivers/" src --include=*.ts --include=*.tsx | grep -v "^src/features/drivers/" | grep -v "drivers/index.ts'"` → no output (matches `../../features/drivers/…` from `app/` and `../drivers/…` / `../../drivers/…` from another feature).
6. Test Plan steps 1–7.

---

## Done Criteria

Implemented 2026-11-07. Verified headless: `npm run build` (tsc + vite) passes (only the known "chunks larger than 500 kB" notice), `npm run lint` (oxlint) clean, no `any` in `src/`, greps 4–5 return nothing. Dev server: `/drivers`, `/drivers/new`, `/drivers/<uuid>/edit` and `src/features/drivers/index.ts` return 200. Through the `/api` proxy with a Bearer token: create company + two vehicles → countries list (200) → create driver with identity `00…` (201, leading zeros kept) → list with `search` by name and by identity, with `nationalityId`, with `vehicleId`, with search + both filters, and `limit=100` (200, expected rows) → get (200) → PATCH all fields with the same identity and another vehicle (200; the `vehicleId` filter follows) → duplicate identity 409 `Identity id is already in use` → unknown country 400 `Country <id> does not exist` → unknown id 404 `Driver <id> not found` → delete driver (204, then 404) → delete vehicles and company (204). Test Plan steps 1–7 (browser) not run yet.
Differences: (1) Verification greps 4 and 5 rewritten: as written, grep 4 missed `../countries/…` from a file at the feature root and grep 5 could not catch a deep import from another feature (`../drivers/…`, `../../drivers/…`). No code block changed: `CountrySelect` / `VehicleSelect` set `className="input"` before `{...props}`, so a passed `className` replaces it and the plan's `className="search-input"` is correct as written.

- [x] `src/features/drivers/` with types, schema, service, hooks, `DriverSelect`, `DriverForm`, `DriverTable`, three pages, `formatDriverLabel`, `index.ts`.
- [x] Routes `/drivers`, `/drivers/new`, `/drivers/:id/edit`; `ROUTES` keys; "Drivers" sidebar item.
- [ ] List searches, filters by nationality and vehicle (URL state), paginates, shows names; create / edit / delete with API errors shown. — API calls verified through the proxy; browser check not run yet.
- [x] `index.ts` exports `Driver`, `useAllDrivers`, `DriverSelect`, `formatDriverLabel` and the pages.
- [x] `drivers` overview written.
- [x] `npm run build` and `npm run lint` pass; no `any`.

**STOP HERE. Report to the user and wait for confirmation before proceeding to Story 10.**
