# Story 08 — Vehicle management pages and a vehicle picker for other features

## Prerequisites

- **Story 02 completed:** [../app-foundation/02-story-app-shell-routing-api-client-and-shared-ui.md](../app-foundation/02-story-app-shell-routing-api-client-and-shared-ui.md) — HTTP client, `fetchAllPages`, shared UI, `useListParams`, `applyServerErrors`, `formatDateTime`, global CSS.
- **Story 03 completed:** [../authentication/03-story-login-session-and-protected-routes.md](../authentication/03-story-login-session-and-protected-routes.md) — protected routes.
- **Story 06 completed:** companies — `src/features/companies/index.ts` exports `Company` (type with `id`, `name`, …), `useAllCompanies()` (`UseQueryResult<Company[]>`, key `['companies', 'all']`) and `CompanySelect` (select contract below).
- **Story 07 completed** (only for the shared `.visually-hidden` class and the nav order).
- Intake: [../../stories/vehicles/vehicle-management-pages/intake.md](../../stories/vehicles/vehicle-management-pages/intake.md).
- API contract: `backend/contracts/vehicles.md`.
- **Do not start until `npm run build` passes on the current `src/`.**

**Select contract (shared by `CompanySelect`, `CountrySelect`, `VehicleSelect`, `DriverSelect`):** props `SelectHTMLAttributes<HTMLSelectElement> & { placeholder?: string; ref?: Ref<HTMLSelectElement> }`; renders `<select className="input">` with an empty option (label = `placeholder`) and one option per row of the feature's `useAll…()` hook. Works with `{...register('field')}` and as a controlled filter (`value` + `onChange`).

---

## Story Goal

1. `/vehicles`: paginated, searchable list with a company filter and company names.
2. `/vehicles/new` and `/vehicles/:id/edit`: one shared form.
3. Delete with confirmation.
4. Public API: `Vehicle`, `useAllVehicles()`, `VehicleSelect`, `formatVehicleLabel`, plus the pages for the router.
5. Sidebar item "Vehicles".

**Not in scope:** details page, capacity, documents, tests.

**Hard constraints for the executor:**

- Conventions from `src/README.md` and Stories 02/03 (no semicolons, import extensions, `import type`, no `enum` / `any`, named exports, `.tsx` exports only components).
- All code in `src/features/vehicles/`; companies are used **only** through `src/features/companies/index.ts`.
- API calls only in `services/vehicleService.ts`; query hooks only in `hooks/useVehicles.ts`.
- Every field, rule and message from `backend/contracts/vehicles.md`. No new dependencies.

---

## Context — Read These Files First

1. `backend/contracts/vehicles.md` — whole file (types, `search` fields, `companyId` filter, errors).
2. `src/features/companies/index.ts` — `Company`, `useAllCompanies`, `CompanySelect`.
3. `src/features/countries/` (Story 07) — the same feature layout (service / hooks / select / table / page) to mirror.
4. `src/shared/hooks/useListParams.ts` — `getFilter`, `setFilter` (resets to page 1).
5. `src/shared/services/fetchAllPages.ts`, `src/shared/services/httpClient.ts`.
6. `src/shared/utils/formErrors.ts`, `src/shared/components/ui/*`.
7. `src/app/routes/router.tsx`, `src/app/layout/navigation.ts` (order: Trips, Drivers, **Vehicles**, Companies, Countries, Inspection checklist, Users), `src/config/routes.ts`.

---

## Implementation tasks

### 1 — Types and schema

**New file: `src/features/vehicles/types/vehicle.ts`**

```ts
import type { ListQuery } from '../../../shared/types/api.ts'

/** backend/contracts/vehicles.md `Vehicle`. */
export interface Vehicle {
  id: string
  plateNumber: string
  model: string
  type: string
  companyId: string
  createdAt: string
  updatedAt: string
}

/** Body of POST /vehicles and PATCH /vehicles/:id (all fields sent). */
export interface VehicleRequest {
  plateNumber: string
  model: string
  type: string
  companyId: string
}

// A type alias (not an interface) so it stays assignable to RequestOptions['query'].
export type VehicleListQuery = ListQuery & {
  companyId?: string
}
```

**New file: `src/features/vehicles/types/vehicleSchema.ts`**

```ts
import { z } from 'zod'

const PLATE_NUMBER_MAX_LENGTH = 50
const TEXT_MAX_LENGTH = 256

function requiredText(label: string, maxLength: number) {
  return z
    .string()
    .trim()
    .min(1, `Enter the ${label}`)
    .max(maxLength, `Use at most ${maxLength} characters`)
}

export const vehicleSchema = z.object({
  plateNumber: requiredText('plate number', PLATE_NUMBER_MAX_LENGTH),
  model: requiredText('model', TEXT_MAX_LENGTH),
  type: requiredText('type', TEXT_MAX_LENGTH),
  companyId: z.string().min(1, 'Select a company'),
})

export type VehicleFormValues = z.infer<typeof vehicleSchema>
```

### 2 — Service

**New file: `src/features/vehicles/services/vehicleService.ts`**

```ts
import { fetchAllPages } from '../../../shared/services/fetchAllPages.ts'
import { apiRequest } from '../../../shared/services/httpClient.ts'
import type { Paginated } from '../../../shared/types/api.ts'
import type { Vehicle, VehicleListQuery, VehicleRequest } from '../types/vehicle.ts'

const BASE_PATH = '/vehicles'

export function fetchVehicles(query: VehicleListQuery, signal?: AbortSignal): Promise<Paginated<Vehicle>> {
  return apiRequest<Paginated<Vehicle>>(BASE_PATH, {
    query: { page: query.page, limit: query.limit, search: query.search, companyId: query.companyId },
    signal,
  })
}

/** Every vehicle, sorted by plate number. */
export async function fetchAllVehicles(): Promise<Vehicle[]> {
  const vehicles = await fetchAllPages((page, limit) => fetchVehicles({ page, limit }))
  return vehicles.sort((a, b) => a.plateNumber.localeCompare(b.plateNumber))
}

export function fetchVehicle(id: string, signal?: AbortSignal): Promise<Vehicle> {
  return apiRequest<Vehicle>(`${BASE_PATH}/${id}`, { signal })
}

export function createVehicle(body: VehicleRequest): Promise<Vehicle> {
  return apiRequest<Vehicle>(BASE_PATH, { method: 'POST', body })
}

export function updateVehicle(id: string, body: VehicleRequest): Promise<Vehicle> {
  return apiRequest<Vehicle>(`${BASE_PATH}/${id}`, { method: 'PATCH', body })
}

export function deleteVehicle(id: string): Promise<void> {
  return apiRequest<void>(`${BASE_PATH}/${id}`, { method: 'DELETE' })
}
```

### 3 — Query hooks

**New file: `src/features/vehicles/hooks/useVehicles.ts`**

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
  createVehicle,
  deleteVehicle,
  fetchAllVehicles,
  fetchVehicle,
  fetchVehicles,
  updateVehicle,
} from '../services/vehicleService.ts'
import type { Vehicle, VehicleListQuery, VehicleRequest } from '../types/vehicle.ts'

const ALL_VEHICLES_STALE_TIME_MS = 5 * 60 * 1000

export const vehicleKeys = {
  root: ['vehicles'] as const,
  all: ['vehicles', 'all'] as const,
  list: (query: VehicleListQuery) => ['vehicles', 'list', query] as const,
  detail: (id: string) => ['vehicles', 'detail', id] as const,
}

export function useVehicles(query: VehicleListQuery): UseQueryResult<Paginated<Vehicle>> {
  return useQuery({
    queryKey: vehicleKeys.list(query),
    queryFn: ({ signal }) => fetchVehicles(query, signal),
    placeholderData: keepPreviousData,
  })
}

export function useVehicle(id: string): UseQueryResult<Vehicle> {
  return useQuery({
    queryKey: vehicleKeys.detail(id),
    queryFn: ({ signal }) => fetchVehicle(id, signal),
    enabled: id !== '',
  })
}

/** Every vehicle for pickers and name lookups. */
export function useAllVehicles(): UseQueryResult<Vehicle[]> {
  return useQuery({
    queryKey: vehicleKeys.all,
    queryFn: fetchAllVehicles,
    staleTime: ALL_VEHICLES_STALE_TIME_MS,
  })
}

function useInvalidateVehicles(): () => Promise<void> {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: vehicleKeys.root })
}

export function useCreateVehicle(): UseMutationResult<Vehicle, Error, VehicleRequest> {
  const invalidate = useInvalidateVehicles()
  return useMutation({ mutationFn: createVehicle, onSuccess: invalidate })
}

export function useUpdateVehicle(): UseMutationResult<Vehicle, Error, { id: string; body: VehicleRequest }> {
  const invalidate = useInvalidateVehicles()
  return useMutation({ mutationFn: ({ id, body }) => updateVehicle(id, body), onSuccess: invalidate })
}

export function useDeleteVehicle(): UseMutationResult<void, Error, string> {
  const invalidate = useInvalidateVehicles()
  return useMutation({ mutationFn: deleteVehicle, onSuccess: invalidate })
}
```

### 4 — Label helper

**New file: `src/features/vehicles/utils/formatVehicleLabel.ts`**

```ts
import type { Vehicle } from '../types/vehicle.ts'

/** "ABC 1234 — Toyota Hiace 2024" */
export function formatVehicleLabel(vehicle: Vehicle): string {
  return `${vehicle.plateNumber} — ${vehicle.model}`
}
```

### 5 — Components

**New file: `src/features/vehicles/components/VehicleSelect.tsx`**

```tsx
import type { Ref, SelectHTMLAttributes } from 'react'
import { useAllVehicles } from '../hooks/useVehicles.ts'
import { formatVehicleLabel } from '../utils/formatVehicleLabel.ts'

interface VehicleSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  placeholder?: string
  ref?: Ref<HTMLSelectElement>
}

export function VehicleSelect({ placeholder = 'Select a vehicle', ref, className = '', ...props }: VehicleSelectProps) {
  const vehicles = useAllVehicles()

  let emptyLabel = placeholder
  if (vehicles.isPending) {
    emptyLabel = 'Loading vehicles…'
  } else if (vehicles.isError) {
    emptyLabel = 'Could not load vehicles'
  }

  return (
    <select ref={ref} className={`input ${className}`} {...props}>
      <option value="">{emptyLabel}</option>
      {vehicles.data?.map((vehicle) => (
        <option key={vehicle.id} value={vehicle.id}>
          {formatVehicleLabel(vehicle)}
        </option>
      ))}
    </select>
  )
}
```

**New file: `src/features/vehicles/components/VehicleForm.tsx`** — used by the new and edit pages. All hooks run first; the form renders once the companies are loaded, so the registered `<select>` gets its default value after its options exist.

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
import { CompanySelect, useAllCompanies } from '../../companies/index.ts'
import { useCreateVehicle, useUpdateVehicle } from '../hooks/useVehicles.ts'
import type { Vehicle } from '../types/vehicle.ts'
import { vehicleSchema, type VehicleFormValues } from '../types/vehicleSchema.ts'

interface VehicleFormProps {
  vehicle?: Vehicle
}

export function VehicleForm({ vehicle }: VehicleFormProps) {
  const navigate = useNavigate()
  const companies = useAllCompanies()
  const createVehicle = useCreateVehicle()
  const updateVehicle = useUpdateVehicle()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      plateNumber: vehicle?.plateNumber ?? '',
      model: vehicle?.model ?? '',
      type: vehicle?.type ?? '',
      companyId: vehicle?.companyId ?? '',
    },
  })

  if (companies.isPending) {
    return <LoadingState label="Loading companies…" />
  }
  if (companies.isError) {
    return <ErrorAlert error={companies.error} title="Could not load companies." />
  }

  async function onSubmit(values: VehicleFormValues): Promise<void> {
    try {
      if (vehicle) {
        await updateVehicle.mutateAsync({ id: vehicle.id, body: values })
      } else {
        await createVehicle.mutateAsync(values)
      }
      navigate(ROUTES.vehicles)
    } catch (error) {
      // "Company <id> does not exist" and 409 "Plate number is already in use" go to FormError.
      applyServerErrors(error, setError, ['plateNumber', 'model', 'type', 'companyId'])
    }
  }

  return (
    <form className="card form" onSubmit={handleSubmit(onSubmit)} noValidate>
      <FormError message={errors.root?.server?.message} />
      <div className="form-grid">
        <Field label="Plate number" htmlFor="plateNumber" error={errors.plateNumber?.message}>
          <input
            id="plateNumber"
            className="input"
            aria-invalid={Boolean(errors.plateNumber)}
            {...register('plateNumber')}
          />
        </Field>
        <Field label="Company" htmlFor="companyId" error={errors.companyId?.message}>
          <CompanySelect id="companyId" aria-invalid={Boolean(errors.companyId)} {...register('companyId')} />
        </Field>
        <Field label="Model" htmlFor="model" error={errors.model?.message}>
          <input id="model" className="input" aria-invalid={Boolean(errors.model)} {...register('model')} />
        </Field>
        <Field label="Type" htmlFor="type" error={errors.type?.message} hint="For example Bus, Van or Car">
          <input id="type" className="input" aria-invalid={Boolean(errors.type)} {...register('type')} />
        </Field>
      </div>
      <div className="form-actions">
        <Link to={ROUTES.vehicles} className="btn btn-secondary">
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

**New file: `src/features/vehicles/components/VehicleTable.tsx`**

```tsx
import { Link } from 'react-router'
import { ROUTES } from '../../../config/routes.ts'
import { formatDateTime } from '../../../shared/utils/formatDate.ts'
import type { Vehicle } from '../types/vehicle.ts'

interface VehicleTableProps {
  vehicles: Vehicle[]
  getCompanyName: (companyId: string) => string
  onDelete: (vehicle: Vehicle) => void
}

export function VehicleTable({ vehicles, getCompanyName, onDelete }: VehicleTableProps) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Plate number</th>
            <th>Model</th>
            <th>Type</th>
            <th>Company</th>
            <th>Last updated</th>
            <th>
              <span className="visually-hidden">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {vehicles.map((vehicle) => (
            <tr key={vehicle.id}>
              <td>{vehicle.plateNumber}</td>
              <td>{vehicle.model}</td>
              <td>{vehicle.type}</td>
              <td>{getCompanyName(vehicle.companyId)}</td>
              <td>{formatDateTime(vehicle.updatedAt)}</td>
              <td>
                <div className="table-actions">
                  <Link to={ROUTES.editVehicle(vehicle.id)} className="btn btn-secondary btn-small">
                    Edit
                  </Link>
                  <button type="button" className="btn btn-danger btn-small" onClick={() => onDelete(vehicle)}>
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

**New file: `src/features/vehicles/pages/VehiclesPage.tsx`**

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
import { CompanySelect, useAllCompanies } from '../../companies/index.ts'
import { VehicleTable } from '../components/VehicleTable.tsx'
import { useDeleteVehicle, useVehicles } from '../hooks/useVehicles.ts'
import type { Vehicle } from '../types/vehicle.ts'

const COMPANY_FILTER = 'companyId'

export function VehiclesPage() {
  const { page, search, getFilter, setPage, setSearch, setFilter } = useListParams()
  const companyId = getFilter(COMPANY_FILTER)
  const vehicles = useVehicles({ page, search, companyId })
  const companies = useAllCompanies()
  const deleteVehicle = useDeleteVehicle()
  const [vehicleToDelete, setVehicleToDelete] = useState<Vehicle | null>(null)

  const companyNames = new Map(
    companies.data?.map((company): [string, string] => [company.id, company.name]),
  )

  function getCompanyName(id: string): string {
    if (!companies.data) {
      return '…'
    }
    return companyNames.get(id) ?? 'Deleted company'
  }

  function closeDelete(): void {
    setVehicleToDelete(null)
    deleteVehicle.reset()
  }

  function confirmDelete(): void {
    if (vehicleToDelete) {
      deleteVehicle.mutate(vehicleToDelete.id, { onSuccess: closeDelete })
    }
  }

  function renderList(): ReactNode {
    if (vehicles.isPending) {
      return <LoadingState />
    }
    if (vehicles.isError) {
      return <ErrorAlert error={vehicles.error} />
    }
    if (vehicles.data.data.length === 0) {
      return (
        <EmptyState
          message={search || companyId ? 'No vehicles match these filters.' : 'No vehicles yet.'}
        />
      )
    }
    return (
      <>
        <VehicleTable
          vehicles={vehicles.data.data}
          getCompanyName={getCompanyName}
          onDelete={setVehicleToDelete}
        />
        <Pagination meta={vehicles.data.meta} onPageChange={setPage} />
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Vehicles"
        description="Vehicles owned by the leasing companies."
        actions={
          <Link to={ROUTES.newVehicle} className="btn btn-primary">
            New vehicle
          </Link>
        }
      />
      <div className="toolbar">
        <SearchInput defaultValue={search} onSearch={setSearch} placeholder="Search plate, model or type…" />
        {/* CompanySelect adds the `input` class itself. */}
        <CompanySelect
          aria-label="Filter by company"
          placeholder="All companies"
          className="search-input"
          value={companyId}
          onChange={(event) => setFilter(COMPANY_FILTER, event.target.value)}
        />
      </div>
      {renderList()}

      <ConfirmDialog
        open={vehicleToDelete !== null}
        title="Delete vehicle"
        pending={deleteVehicle.isPending}
        error={deleteVehicle.error}
        onConfirm={confirmDelete}
        onCancel={closeDelete}
      >
        <p>
          Delete <strong>{vehicleToDelete?.plateNumber}</strong>? Drivers and trips that use it keep it, but it can
          no longer be chosen for new ones.
        </p>
      </ConfirmDialog>
    </>
  )
}
```

**New file: `src/features/vehicles/pages/NewVehiclePage.tsx`**

```tsx
import { PageHeader } from '../../../shared/components/layout/PageHeader.tsx'
import { VehicleForm } from '../components/VehicleForm.tsx'

export function NewVehiclePage() {
  return (
    <>
      <PageHeader title="New vehicle" />
      <VehicleForm />
    </>
  )
}
```

**New file: `src/features/vehicles/pages/EditVehiclePage.tsx`**

```tsx
import { Link, useParams } from 'react-router'
import { ROUTES } from '../../../config/routes.ts'
import { PageHeader } from '../../../shared/components/layout/PageHeader.tsx'
import { ErrorAlert } from '../../../shared/components/ui/ErrorAlert.tsx'
import { LoadingState } from '../../../shared/components/ui/LoadingState.tsx'
import { VehicleForm } from '../components/VehicleForm.tsx'
import { useVehicle } from '../hooks/useVehicles.ts'

export function EditVehiclePage() {
  const { id = '' } = useParams()
  const vehicle = useVehicle(id)

  if (vehicle.isPending) {
    return <LoadingState />
  }
  if (vehicle.isError) {
    return (
      <div className="stack">
        <ErrorAlert error={vehicle.error} />
        <Link to={ROUTES.vehicles}>Back to vehicles</Link>
      </div>
    )
  }
  return (
    <>
      <PageHeader title={`Edit vehicle ${vehicle.data.plateNumber}`} />
      <VehicleForm key={vehicle.data.id} vehicle={vehicle.data} />
    </>
  )
}
```

### 7 — Public API

**New file: `src/features/vehicles/index.ts`**

```ts
export { VehicleSelect } from './components/VehicleSelect.tsx'
export { useAllVehicles } from './hooks/useVehicles.ts'
export { EditVehiclePage } from './pages/EditVehiclePage.tsx'
export { NewVehiclePage } from './pages/NewVehiclePage.tsx'
export { VehiclesPage } from './pages/VehiclesPage.tsx'
export type { Vehicle } from './types/vehicle.ts'
export { formatVehicleLabel } from './utils/formatVehicleLabel.ts'
```

### 8 — Routes, paths and navigation

**File: `src/config/routes.ts`** — add to `ROUTES`:

```ts
  vehicles: '/vehicles',
  newVehicle: '/vehicles/new',
  editVehicle: (id: string): string => `/vehicles/${id}/edit`,
```

**File: `src/app/routes/router.tsx`** — import `EditVehiclePage`, `NewVehiclePage`, `VehiclesPage` from `../../features/vehicles/index.ts`; add to the `AppLayout` children before `'*'`:

```tsx
          { path: ROUTES.vehicles, element: <VehiclesPage /> },
          { path: ROUTES.newVehicle, element: <NewVehiclePage /> },
          { path: '/vehicles/:id/edit', element: <EditVehiclePage /> },
```

**File: `src/app/layout/navigation.ts`** — add, placed after "Drivers" / "Trips" (if present) and before "Companies":

```ts
  { label: 'Vehicles', to: ROUTES.vehicles },
```

### 9 — Docs and plans

- New [00-overview.md](00-overview.md) for `vehicles`.

---

## Edge Cases & Failure Modes

- **Duplicate plate** → 409 `Plate number is already in use` → `FormError`. Saving an edit with the vehicle's own unchanged plate is fine (the backend only checks when it changes).
- **Company deleted after the form was opened** → 400 `Company <id> does not exist` → `FormError`; the cached company list refreshes within 5 minutes or on any company mutation.
- **Vehicle whose company was soft-deleted** → list shows "Deleted company"; edit form shows the empty choice for Company, so "Select a company" blocks saving until a live company is picked.
- **Companies list fails to load** → the form shows the error instead of a select with no options; the list page shows "…" names only while loading.
- **Unknown / deleted vehicle on edit** → 404 `Vehicle <id> not found` with a link back. A non-UUID id → 400 `Validation failed (uuid is expected)`, shown the same way.
- **Company filter + search** both reset to page 1 (`useListParams.setFilter` / `setSearch`); an empty filter value removes `companyId` from the URL.
- **Deleting a vehicle** → `['vehicles']` invalidated, so `VehicleSelect` / `useAllVehicles` (drivers, trips) refresh too.
- **Whitespace-only fields** → zod `trim().min(1)` blocks them.

---

## Test Plan

No test runner. Manual, backend running, signed in, at least one company (Story 06):

1. Sidebar "Vehicles" → list with company names; Next / Previous with more than 10 vehicles.
2. Search `bus` (type), part of a plate, part of a model → matching rows; URL has `?search=`.
3. Company filter → only that company's vehicles; reload keeps it; "All companies" clears it.
4. New vehicle: empty submit → four field errors, no request. Fill in → saved, back on the list.
5. Same plate again → "Plate number is already in use".
6. Edit → change the model → saved. Open `/vehicles/00000000-0000-4000-8000-000000000000/edit` → "Vehicle … not found".
7. Delete → confirm → row gone.

---

## Migration / Rollback

- No data migration. Rollback: delete `src/features/vehicles/`, the three routes, the `ROUTES` keys and the nav item.

---

## Verification Steps

1. `npm run build` → no errors. 2. `npm run lint` → no errors. 3. `grep -rnw "any" src/features/vehicles` → none.
4. `grep -rnE "from '[^']*companies/" src/features/vehicles | grep -v "companies/index.ts'"` → no output (a deep import from this feature looks like `../../companies/…`, never `features/companies/`).
5. `grep -rnE "from '[^']*vehicles/" src --include=*.ts --include=*.tsx | grep -v "^src/features/vehicles/" | grep -v "vehicles/index.ts'"` → no output (matches `../../features/vehicles/…` from `app/` and `../vehicles/…` / `../../vehicles/…` from another feature).
6. Test Plan steps 1–7.

---

## Done Criteria

Implemented 2026-11-07. Verified headless: `npm run build` (tsc + vite) passes (only the known "chunks larger than 500 kB" notice), `npm run lint` (oxlint) clean, no `any` in `src/`, greps 4–5 return nothing. Dev server: `/vehicles`, `/vehicles/new`, `/vehicles/<uuid>/edit` and `src/features/vehicles/index.ts` return 200. Through the `/api` proxy with a Bearer token: create company → create vehicle (201) → list with `search`, with `companyId`, with both, and `limit=100` (200) → get (200) → PATCH all fields (200) → duplicate plate 409 `Plate number is already in use` → unknown company 400 `Company <id> does not exist` → unknown id 404 `Vehicle <id> not found` → delete vehicle (204, then 404) → delete company (204). Test Plan steps 1–7 (browser) not run yet.
Differences: (1) `VehiclesPage` passes `className="search-input"` to `CompanySelect` instead of `"input search-input"`, because the real `CompanySelect` already prepends `input` (code block updated). (2) Verification greps 4 and 5 rewritten: as written they could not catch a deep import (`../../companies/…`, `../vehicles/…`).

- [x] `src/features/vehicles/` with types, schema, service, hooks, `VehicleSelect`, `VehicleForm`, `VehicleTable`, three pages, `formatVehicleLabel`, `index.ts`.
- [x] Routes `/vehicles`, `/vehicles/new`, `/vehicles/:id/edit`; `ROUTES` keys; "Vehicles" sidebar item.
- [ ] List searches, filters by company (URL state), paginates and shows company names; create / edit / delete with API errors shown. — API calls verified through the proxy; browser check not run yet.
- [x] `index.ts` exports `Vehicle`, `useAllVehicles`, `VehicleSelect`, `formatVehicleLabel` and the pages.
- [x] `vehicles` overview written.
- [x] `npm run build` and `npm run lint` pass; no `any`.

**STOP HERE. Report to the user and wait for confirmation before proceeding to Story 09.**
