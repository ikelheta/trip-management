# Story 07 — Country management page and a country picker for other features

## Prerequisites

- **Story 02 completed:** [../app-foundation/02-story-app-shell-routing-api-client-and-shared-ui.md](../app-foundation/02-story-app-shell-routing-api-client-and-shared-ui.md) — `apiRequest`, `fetchAllPages`, `Paginated`, `ListQuery`, `useListParams`, `SearchInput`, `Pagination`, `Field`, `FormError`, `ErrorAlert`, `LoadingState`, `EmptyState`, `ConfirmDialog`, `Dialog`, `PageHeader`, `applyServerErrors`, `formatDateTime`, global CSS.
- **Story 03 completed:** [../authentication/03-story-login-session-and-protected-routes.md](../authentication/03-story-login-session-and-protected-routes.md) — routes live under `RequireAuth` → `AppLayout` in `src/app/routes/router.tsx`.
- Intake: [../../stories/countries/country-management-page/intake.md](../../stories/countries/country-management-page/intake.md).
- API contract: `backend/contracts/countries.md`; list conventions in `backend/contracts/README.md`.
- Backend running with seeded countries (`npm run seed`) for the Test Plan.
- **Do not start until `npm run build` passes on the current `src/`.**

---

## Story Goal

1. `/countries`: paginated, searchable list of countries (English + Arabic names).
2. Create and edit in a `Dialog`; delete with `ConfirmDialog`.
3. Public API for other features: `Country`, `useAllCountries()`, `CountrySelect`, `formatCountryName`.
4. Sidebar item "Countries".

**Not in scope:** details page, bulk import, column sorting, tests.

**Hard constraints for the executor:**

- Conventions from `src/README.md` and Stories 02/03: no semicolons, `.ts` / `.tsx` import extensions, `import type` for types, no `enum`, no `any`, named exports, `.tsx` files export only components.
- All code in `src/features/countries/`; other code imports only from `src/features/countries/index.ts`.
- API calls only in `services/countryService.ts`; TanStack Query hooks only in `hooks/useCountries.ts`.
- Every field, rule and message from `backend/contracts/countries.md`.
- No new dependencies.

---

## Context — Read These Files First

1. `backend/contracts/countries.md` — whole file (types, rules, 409 messages, `search` matches `nameAr` and `nameEn`).
2. `backend/contracts/README.md` — "Lists and pagination" (`limit` default 10, max 100), "Request bodies" (unknown properties rejected, names trimmed).
3. `src/shared/services/httpClient.ts` (`apiRequest`), `src/shared/services/fetchAllPages.ts` (`fetchAllPages`, `MAX_PAGE_SIZE`).
4. `src/shared/types/api.ts` — `Paginated`, `ListQuery`.
5. `src/shared/hooks/useListParams.ts` — `page`, `search`, `setPage`, `setSearch`.
6. `src/shared/components/ui/` — `Dialog.tsx` (renders children only while open, so the form remounts), `ConfirmDialog.tsx`, `Field.tsx`, `FormError.tsx`, `SearchInput.tsx`, `Pagination.tsx`.
7. `src/shared/utils/formErrors.ts` — `applyServerErrors`.
8. `src/app/routes/router.tsx` — the `AppLayout` children (comment "Feature routes go here.").
9. `src/app/layout/navigation.ts` — `NAV_ITEMS`; final sidebar order is **Trips, Drivers, Vehicles, Companies, Countries, Inspection checklist, Users**.
10. `src/config/routes.ts` — `ROUTES`.

---

## Implementation tasks

### 1 — Types and schema

**New file: `src/features/countries/types/country.ts`**

```ts
/** backend/contracts/countries.md `Country`. */
export interface Country {
  id: string
  nameAr: string
  nameEn: string
  createdAt: string
  updatedAt: string
}

/** Body of POST /countries and PATCH /countries/:id (all fields sent). */
export interface CountryRequest {
  nameAr: string
  nameEn: string
}
```

**New file: `src/features/countries/types/countrySchema.ts`**

```ts
import { z } from 'zod'

const NAME_MIN_LENGTH = 2
const NAME_MAX_LENGTH = 256

const countryName = z
  .string()
  .trim()
  .min(NAME_MIN_LENGTH, `Use at least ${NAME_MIN_LENGTH} characters`)
  .max(NAME_MAX_LENGTH, `Use at most ${NAME_MAX_LENGTH} characters`)

export const countrySchema = z.object({
  nameEn: countryName,
  nameAr: countryName,
})

export type CountryFormValues = z.infer<typeof countrySchema>
```

### 2 — Service

**New file: `src/features/countries/services/countryService.ts`**

```ts
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
```

### 3 — Query hooks

**New file: `src/features/countries/hooks/useCountries.ts`**

```ts
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
```

### 4 — Name helper

**New file: `src/features/countries/utils/formatCountryName.ts`**

```ts
import type { Country } from '../types/country.ts'

/** "Saudi Arabia — المملكة العربية السعودية" */
export function formatCountryName(country: Country): string {
  return `${country.nameEn} — ${country.nameAr}`
}
```

### 5 — Components

**New file: `src/features/countries/components/CountrySelect.tsx`** — works with `{...register('nationalityId')}` and as a controlled filter (`value` + `onChange`).

```tsx
import type { Ref, SelectHTMLAttributes } from 'react'
import { useAllCountries } from '../hooks/useCountries.ts'
import { formatCountryName } from '../utils/formatCountryName.ts'

interface CountrySelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  placeholder?: string
  ref?: Ref<HTMLSelectElement>
}

export function CountrySelect({ placeholder = 'Select a country', ref, className = '', ...props }: CountrySelectProps) {
  const countries = useAllCountries()

  let emptyLabel = placeholder
  if (countries.isPending) {
    emptyLabel = 'Loading countries…'
  } else if (countries.isError) {
    emptyLabel = 'Could not load countries'
  }

  return (
    <select ref={ref} className={`input ${className}`} {...props}>
      <option value="">{emptyLabel}</option>
      {countries.data?.map((country) => (
        <option key={country.id} value={country.id}>
          {formatCountryName(country)}
        </option>
      ))}
    </select>
  )
}
```

**New file: `src/features/countries/components/CountryForm.tsx`** — rendered inside `Dialog`; creates when `country` is undefined, otherwise updates.

```tsx
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Field } from '../../../shared/components/ui/Field.tsx'
import { FormError } from '../../../shared/components/ui/FormError.tsx'
import { applyServerErrors } from '../../../shared/utils/formErrors.ts'
import { useCreateCountry, useUpdateCountry } from '../hooks/useCountries.ts'
import type { Country } from '../types/country.ts'
import { countrySchema, type CountryFormValues } from '../types/countrySchema.ts'

interface CountryFormProps {
  country?: Country
  onDone: () => void
}

export function CountryForm({ country, onDone }: CountryFormProps) {
  const createCountry = useCreateCountry()
  const updateCountry = useUpdateCountry()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CountryFormValues>({
    resolver: zodResolver(countrySchema),
    defaultValues: { nameEn: country?.nameEn ?? '', nameAr: country?.nameAr ?? '' },
  })

  async function onSubmit(values: CountryFormValues): Promise<void> {
    try {
      if (country) {
        await updateCountry.mutateAsync({ id: country.id, body: values })
      } else {
        await createCountry.mutateAsync(values)
      }
      onDone()
    } catch (error) {
      // 409 "Arabic name is already in use" has no field prefix, so it lands in FormError.
      applyServerErrors(error, setError, ['nameEn', 'nameAr'])
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit(onSubmit)} noValidate>
      <FormError message={errors.root?.server?.message} />
      <Field label="English name" htmlFor="nameEn" error={errors.nameEn?.message}>
        <input id="nameEn" className="input" aria-invalid={Boolean(errors.nameEn)} {...register('nameEn')} />
      </Field>
      <Field label="Arabic name" htmlFor="nameAr" error={errors.nameAr?.message}>
        <input
          id="nameAr"
          className="input"
          dir="rtl"
          lang="ar"
          aria-invalid={Boolean(errors.nameAr)}
          {...register('nameAr')}
        />
      </Field>
      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onDone} disabled={isSubmitting}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  )
}
```

**New file: `src/features/countries/components/CountryTable.tsx`**

```tsx
import { formatDateTime } from '../../../shared/utils/formatDate.ts'
import type { Country } from '../types/country.ts'

interface CountryTableProps {
  countries: Country[]
  onEdit: (country: Country) => void
  onDelete: (country: Country) => void
}

export function CountryTable({ countries, onEdit, onDelete }: CountryTableProps) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>English name</th>
            <th>Arabic name</th>
            <th>Last updated</th>
            <th>
              <span className="visually-hidden">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {countries.map((country) => (
            <tr key={country.id}>
              <td>{country.nameEn}</td>
              <td dir="rtl" lang="ar">
                {country.nameAr}
              </td>
              <td>{formatDateTime(country.updatedAt)}</td>
              <td>
                <div className="table-actions">
                  <button type="button" className="btn btn-secondary btn-small" onClick={() => onEdit(country)}>
                    Edit
                  </button>
                  <button type="button" className="btn btn-danger btn-small" onClick={() => onDelete(country)}>
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

**File: `src/shared/styles/index.css`** — add after `.muted` **if it is not there yet** (also used by later list stories):

```css
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
```

### 6 — Page

**New file: `src/features/countries/pages/CountriesPage.tsx`**

```tsx
import { useState, type ReactNode } from 'react'
import { PageHeader } from '../../../shared/components/layout/PageHeader.tsx'
import { ConfirmDialog } from '../../../shared/components/ui/ConfirmDialog.tsx'
import { Dialog } from '../../../shared/components/ui/Dialog.tsx'
import { EmptyState } from '../../../shared/components/ui/EmptyState.tsx'
import { ErrorAlert } from '../../../shared/components/ui/ErrorAlert.tsx'
import { LoadingState } from '../../../shared/components/ui/LoadingState.tsx'
import { Pagination } from '../../../shared/components/ui/Pagination.tsx'
import { SearchInput } from '../../../shared/components/ui/SearchInput.tsx'
import { useListParams } from '../../../shared/hooks/useListParams.ts'
import { CountryForm } from '../components/CountryForm.tsx'
import { CountryTable } from '../components/CountryTable.tsx'
import { useCountries, useDeleteCountry } from '../hooks/useCountries.ts'
import type { Country } from '../types/country.ts'

type FormDialogState = { mode: 'create' } | { mode: 'edit'; country: Country } | null

export function CountriesPage() {
  const { page, search, setPage, setSearch } = useListParams()
  const countries = useCountries({ page, search })
  const deleteCountry = useDeleteCountry()
  const [formDialog, setFormDialog] = useState<FormDialogState>(null)
  const [countryToDelete, setCountryToDelete] = useState<Country | null>(null)

  function closeDelete(): void {
    setCountryToDelete(null)
    deleteCountry.reset()
  }

  function confirmDelete(): void {
    if (countryToDelete) {
      deleteCountry.mutate(countryToDelete.id, { onSuccess: closeDelete })
    }
  }

  function renderList(): ReactNode {
    if (countries.isPending) {
      return <LoadingState />
    }
    if (countries.isError) {
      return <ErrorAlert error={countries.error} />
    }
    if (countries.data.data.length === 0) {
      return <EmptyState message={search ? 'No countries match your search.' : 'No countries yet.'} />
    }
    return (
      <>
        <CountryTable
          countries={countries.data.data}
          onEdit={(country) => setFormDialog({ mode: 'edit', country })}
          onDelete={setCountryToDelete}
        />
        <Pagination meta={countries.data.meta} onPageChange={setPage} />
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Countries"
        description="Nationalities for drivers, in English and Arabic."
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setFormDialog({ mode: 'create' })}>
            New country
          </button>
        }
      />
      <div className="toolbar">
        <SearchInput defaultValue={search} onSearch={setSearch} placeholder="Search English or Arabic name…" />
      </div>
      {renderList()}

      <Dialog
        open={formDialog !== null}
        title={formDialog?.mode === 'edit' ? 'Edit country' : 'New country'}
        onClose={() => setFormDialog(null)}
      >
        <CountryForm
          country={formDialog?.mode === 'edit' ? formDialog.country : undefined}
          onDone={() => setFormDialog(null)}
        />
      </Dialog>

      <ConfirmDialog
        open={countryToDelete !== null}
        title="Delete country"
        pending={deleteCountry.isPending}
        error={deleteCountry.error}
        onConfirm={confirmDelete}
        onCancel={closeDelete}
      >
        <p>
          Delete <strong>{countryToDelete?.nameEn}</strong>? Drivers with this nationality keep it, but it can no
          longer be chosen.
        </p>
      </ConfirmDialog>
    </>
  )
}
```

### 7 — Public API

**New file: `src/features/countries/index.ts`**

```ts
export { CountrySelect } from './components/CountrySelect.tsx'
export { useAllCountries } from './hooks/useCountries.ts'
export { CountriesPage } from './pages/CountriesPage.tsx'
export type { Country } from './types/country.ts'
export { formatCountryName } from './utils/formatCountryName.ts'
```

### 8 — Route, path and navigation

**File: `src/config/routes.ts`** — add to `ROUTES`:

```ts
  countries: '/countries',
```

**File: `src/app/routes/router.tsx`** — import `CountriesPage` from `../../features/countries/index.ts` and add to the `AppLayout` children, before the `'*'` route:

```tsx
          { path: ROUTES.countries, element: <CountriesPage /> },
```

**File: `src/app/layout/navigation.ts`** — add to `NAV_ITEMS` (import `ROUTES` from `../../config/routes.ts` if not imported yet), placed after "Companies" and before "Inspection checklist" / "Users" when those exist:

```ts
  { label: 'Countries', to: ROUTES.countries },
```

### 9 — Docs and plans

- New [00-overview.md](00-overview.md) for `countries`.

---

## Edge Cases & Failure Modes

- **Empty search** → `buildUrl` drops `search=`; the API requires 1–100 chars when present.
- **Arabic search** works (`search` matches `nameAr`); the input accepts any text up to 100 chars.
- **Duplicate name** → 409 `Arabic name is already in use` / `English name is already in use` → shown in `FormError` (no field prefix).
- **Name of 1 character or only spaces** → zod (`trim().min(2)`) blocks it before sending.
- **Deleting the last row on a page > 1** → the page refetches and is empty → empty state; Previous goes back.
- **Delete fails** (e.g. 404 because another admin deleted it) → message inside the `ConfirmDialog`; Cancel resets the mutation.
- **Seeded rows share one `createdAt`** → list order is arbitrary but stable (contract); `useAllCountries` sorts by English name.
- **`useAllCountries` cost** → 3 requests (249 rows / 100) once per 5 minutes; any country mutation invalidates `['countries']`, so pickers refresh.
- **Soft-deleted country** disappears from `CountrySelect`; a driver whose nationality was deleted shows an empty choice on edit (Story 09).
- **Dialog Esc** → `onClose` → `formDialog` null → form unmounts (unsaved input discarded).

---

## Test Plan

No test runner. Manual, backend running, signed in:

1. Sidebar "Countries" → `/countries`; 10 rows; "Page 1 of 25 (249 total)" (or more if countries were added).
2. Next / Previous update `?page=`; reload keeps the page.
3. Search `saudi` → Saudi Arabia; search `السعودية` → the same row; clear → full list, page 1.
4. New country `Testland` / `تستلاند` → appears (search for it). Again with the same names → "English name is already in use" (or Arabic).
5. Edit → change the English name → row updated. Enter `A` → "Use at least 2 characters", no request.
6. Delete → confirm → row gone; `GET /api/countries/<id>` → 404 in the Network tab.
7. In the console, check `CountrySelect` later through Story 09 (drivers form lists every country "English — Arabic").

---

## Migration / Rollback

- No data migration. Rollback: delete `src/features/countries/`, remove the route, `ROUTES.countries` and the nav item.

---

## Verification Steps

1. `npm run build` → no errors. 2. `npm run lint` → no errors. 3. `grep -rnw "any" src/features/countries` → none.
4. `grep -rnE "from '[^']*countries/" src --include=*.ts --include=*.tsx | grep -v "^src/features/countries/" | grep -v "countries/index.ts'"` → no output (matches `../../features/countries/…` from `app/` and `../countries/…` / `../../countries/…` from another feature).
5. Test Plan steps 1–6.

---

## Done Criteria

Implemented 2026-11-07. All code blocks above compiled and linted unchanged. Differences: none in code; the `.visually-hidden` class was not in `index.css` yet and was added after `.muted`; the route went after the companies routes and before `'*'`, the nav item after "Companies" (the only other items today are Companies and Users). Verification Step 4 could not catch a deep import from another feature (inside `src/features/` the relative path is `../countries/…`, which never contains `features/countries/`) and was corrected; the corrected grep was checked to report a planted deep import. Verified headless: `npm run build` (passes; only Vite's existing >500 kB chunk-size warning), `npm run lint` (oxlint: 0 warnings, 0 errors on 84 files), `grep -rnw any src --include=*.ts --include=*.tsx` (no output), Verification greps 3–4 (no output), dev server returns 200 for `/countries` and `/src/features/countries/index.ts`, and the feature's API calls through the Vite proxy with a Bearer token (list page 1 → 10 rows, `total` 249, 25 pages; `search=saudi` and `search=السعودية` → Saudi Arabia; all pages with `limit=100` → 3 pages, 249 unique rows; create → 201; search finds it; PATCH both names → 200; duplicate English name → 409 `English name is already in use`; duplicate Arabic name → 409 `Arabic name is already in use`; duplicate on PATCH → 409; delete → 204, then GET → 404 `Country <id> not found`; total back to 249). Not run (browser only): Test Plan steps 1–7.

- [x] `src/features/countries/` with types, schema, service, hooks, `CountrySelect`, `CountryForm`, `CountryTable`, `CountriesPage`, `formatCountryName`, `index.ts`.
- [x] `/countries` route, `ROUTES.countries` and the "Countries" sidebar item. (Route and module return 200 from the dev server; the sidebar entry is in `NAV_ITEMS` — seeing it rendered is a browser check not run yet.)
- [ ] List paginates and searches (state in the URL); create / edit in a dialog; delete with confirmation; API errors shown. — browser check not run yet (code in place; the list, search, create, update, 409 and delete API calls were verified through the proxy).
- [x] `index.ts` exports `Country`, `useAllCountries`, `CountrySelect`, `formatCountryName`, `CountriesPage`.
- [x] `countries` overview written.
- [x] `npm run build` and `npm run lint` pass; no `any`.

**STOP HERE. Report to the user and wait for confirmation before proceeding to Story 08.**
