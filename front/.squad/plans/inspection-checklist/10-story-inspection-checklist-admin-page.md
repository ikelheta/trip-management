# Story 10 — Inspection checklist admin page (indicators and their checks)

## Prerequisites

- **Story 02 completed:** [../app-foundation/02-story-app-shell-routing-api-client-and-shared-ui.md](../app-foundation/02-story-app-shell-routing-api-client-and-shared-ui.md) — `apiRequest`, shared UI (`Dialog`, `ConfirmDialog`, `Field`, `FormError`, `ErrorAlert`, `LoadingState`, `EmptyState`, `PageHeader`), `applyServerErrors`, global CSS.
- **Story 03 completed:** [../authentication/03-story-login-session-and-protected-routes.md](../authentication/03-story-login-session-and-protected-routes.md) — protected routes; `useNavItems` hides `adminOnly` items from role `user`.
- **Story 07 completed** (global `.visually-hidden` class; nav order).
- Intake: [../../stories/inspection-checklist/inspection-checklist-admin-page/intake.md](../../stories/inspection-checklist/inspection-checklist-admin-page/intake.md).
- API contract: `backend/contracts/inspection-checklist.md`.
- Backend seeded (`npm run seed`: 3 indicators, 16 checks) for the Test Plan.
- **Do not start until `npm run build` passes on the current `src/`.**

---

## Story Goal

1. `/inspection-checklist`: every indicator as a card with its checks, in API order.
2. Create / edit indicators and checks in a `Dialog`; delete with `ConfirmDialog` (409 shown).
3. Moving a check to another indicator through the indicator select.
4. Public API for Story 11: `InspectionIndicator`, `InspectionCheck`, `useInspectionChecklist()`.
5. Admin-only sidebar item "Inspection checklist".

**Not in scope:** drag-and-drop ordering, bulk edit, tests.

**Hard constraints for the executor:**

- Conventions from `src/README.md` and Stories 02/03 (no semicolons, import extensions, `import type`, no `enum` / `any`, named exports, `.tsx` exports only components).
- All code in `src/features/inspection-checklist/`; other code imports only from its `index.ts`.
- API calls only in `services/inspectionChecklistService.ts`; query hooks only in `hooks/useInspectionChecklist.ts`.
- Every field, rule and message from `backend/contracts/inspection-checklist.md`. No new dependencies.

---

## Context — Read These Files First

1. `backend/contracts/inspection-checklist.md` — whole file: the GET list is **not paginated** and already sorted; there is no `GET /inspection-checks` list; body rules (names 2–256, `sortOrder` 0–1000 default 0, `null` rejected); every error message.
2. `src/shared/components/ui/Dialog.tsx` (renders children only while open) and `ConfirmDialog.tsx`.
3. `src/shared/utils/formErrors.ts` — `applyServerErrors`.
4. `src/features/countries/` (Story 07) — dialog-form pattern (`CountryForm` + `CountriesPage`).
5. `src/app/routes/router.tsx`, `src/app/layout/navigation.ts` (order: Trips, Drivers, Vehicles, Companies, Countries, **Inspection checklist**, Users), `src/config/routes.ts`.

---

## Implementation tasks

### 1 — Types and schemas

**New file: `src/features/inspection-checklist/types/inspectionChecklist.ts`**

```ts
/** backend/contracts/inspection-checklist.md `InspectionCheck`. */
export interface InspectionCheck {
  id: string
  indicatorId: string
  nameAr: string
  nameEn: string
  sortOrder: number
  createdAt: string
  updatedAt: string
}

/** An indicator with its live checks, sorted by sortOrder then nameEn. */
export interface InspectionIndicator {
  id: string
  nameAr: string
  nameEn: string
  sortOrder: number
  checks: InspectionCheck[]
  createdAt: string
  updatedAt: string
}

/** Body of POST / PATCH /inspection-indicators (all fields sent). */
export interface IndicatorRequest {
  nameAr: string
  nameEn: string
  sortOrder: number
}

/** Body of POST / PATCH /inspection-checks (all fields sent; a new indicatorId moves the check). */
export interface CheckRequest extends IndicatorRequest {
  indicatorId: string
}
```

**New file: `src/features/inspection-checklist/types/inspectionChecklistSchemas.ts`**

```ts
import { z } from 'zod'

const NAME_MIN_LENGTH = 2
const NAME_MAX_LENGTH = 256
const SORT_ORDER_MIN = 0
const SORT_ORDER_MAX = 1000
const SORT_ORDER_MESSAGE = `Enter a whole number from ${SORT_ORDER_MIN} to ${SORT_ORDER_MAX}`

const name = z
  .string()
  .trim()
  .min(NAME_MIN_LENGTH, `Use at least ${NAME_MIN_LENGTH} characters`)
  .max(NAME_MAX_LENGTH, `Use at most ${NAME_MAX_LENGTH} characters`)

// The input uses valueAsNumber, so an empty field arrives as NaN and fails here.
const sortOrder = z
  .number({ error: SORT_ORDER_MESSAGE })
  .int(SORT_ORDER_MESSAGE)
  .min(SORT_ORDER_MIN, SORT_ORDER_MESSAGE)
  .max(SORT_ORDER_MAX, SORT_ORDER_MESSAGE)

export const indicatorSchema = z.object({
  nameEn: name,
  nameAr: name,
  sortOrder,
})

export type IndicatorFormValues = z.infer<typeof indicatorSchema>

export const checkSchema = indicatorSchema.extend({
  indicatorId: z.string().min(1, 'Select an indicator'),
})

export type CheckFormValues = z.infer<typeof checkSchema>
```

### 2 — Service

**New file: `src/features/inspection-checklist/services/inspectionChecklistService.ts`**

```ts
import { apiRequest } from '../../../shared/services/httpClient.ts'
import type {
  CheckRequest,
  IndicatorRequest,
  InspectionCheck,
  InspectionIndicator,
} from '../types/inspectionChecklist.ts'

const INDICATORS_PATH = '/inspection-indicators'
const CHECKS_PATH = '/inspection-checks'

/** The whole checklist: every indicator with its checks, already sorted. Not paginated. */
export function fetchInspectionChecklist(signal?: AbortSignal): Promise<InspectionIndicator[]> {
  return apiRequest<InspectionIndicator[]>(INDICATORS_PATH, { signal })
}

export function createIndicator(body: IndicatorRequest): Promise<InspectionIndicator> {
  return apiRequest<InspectionIndicator>(INDICATORS_PATH, { method: 'POST', body })
}

export function updateIndicator(id: string, body: IndicatorRequest): Promise<InspectionIndicator> {
  return apiRequest<InspectionIndicator>(`${INDICATORS_PATH}/${id}`, { method: 'PATCH', body })
}

export function deleteIndicator(id: string): Promise<void> {
  return apiRequest<void>(`${INDICATORS_PATH}/${id}`, { method: 'DELETE' })
}

export function createCheck(body: CheckRequest): Promise<InspectionCheck> {
  return apiRequest<InspectionCheck>(CHECKS_PATH, { method: 'POST', body })
}

export function updateCheck(id: string, body: CheckRequest): Promise<InspectionCheck> {
  return apiRequest<InspectionCheck>(`${CHECKS_PATH}/${id}`, { method: 'PATCH', body })
}

export function deleteCheck(id: string): Promise<void> {
  return apiRequest<void>(`${CHECKS_PATH}/${id}`, { method: 'DELETE' })
}
```

### 3 — Query hooks

**New file: `src/features/inspection-checklist/hooks/useInspectionChecklist.ts`**

```ts
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query'
import {
  createCheck,
  createIndicator,
  deleteCheck,
  deleteIndicator,
  fetchInspectionChecklist,
  updateCheck,
  updateIndicator,
} from '../services/inspectionChecklistService.ts'
import type {
  CheckRequest,
  IndicatorRequest,
  InspectionCheck,
  InspectionIndicator,
} from '../types/inspectionChecklist.ts'

export const inspectionChecklistKeys = {
  root: ['inspection-checklist'] as const,
}

/** The whole checklist. Also used by the trip form (Story 11). */
export function useInspectionChecklist(): UseQueryResult<InspectionIndicator[]> {
  return useQuery({
    queryKey: inspectionChecklistKeys.root,
    queryFn: ({ signal }) => fetchInspectionChecklist(signal),
  })
}

function useInvalidateChecklist(): () => Promise<void> {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: inspectionChecklistKeys.root })
}

export function useCreateIndicator(): UseMutationResult<InspectionIndicator, Error, IndicatorRequest> {
  const invalidate = useInvalidateChecklist()
  return useMutation({ mutationFn: createIndicator, onSuccess: invalidate })
}

export function useUpdateIndicator(): UseMutationResult<
  InspectionIndicator,
  Error,
  { id: string; body: IndicatorRequest }
> {
  const invalidate = useInvalidateChecklist()
  return useMutation({ mutationFn: ({ id, body }) => updateIndicator(id, body), onSuccess: invalidate })
}

export function useDeleteIndicator(): UseMutationResult<void, Error, string> {
  const invalidate = useInvalidateChecklist()
  return useMutation({ mutationFn: deleteIndicator, onSuccess: invalidate })
}

export function useCreateCheck(): UseMutationResult<InspectionCheck, Error, CheckRequest> {
  const invalidate = useInvalidateChecklist()
  return useMutation({ mutationFn: createCheck, onSuccess: invalidate })
}

export function useUpdateCheck(): UseMutationResult<InspectionCheck, Error, { id: string; body: CheckRequest }> {
  const invalidate = useInvalidateChecklist()
  return useMutation({ mutationFn: ({ id, body }) => updateCheck(id, body), onSuccess: invalidate })
}

export function useDeleteCheck(): UseMutationResult<void, Error, string> {
  const invalidate = useInvalidateChecklist()
  return useMutation({ mutationFn: deleteCheck, onSuccess: invalidate })
}
```

### 4 — Forms

**New file: `src/features/inspection-checklist/components/IndicatorForm.tsx`**

```tsx
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Field } from '../../../shared/components/ui/Field.tsx'
import { FormError } from '../../../shared/components/ui/FormError.tsx'
import { applyServerErrors } from '../../../shared/utils/formErrors.ts'
import { useCreateIndicator, useUpdateIndicator } from '../hooks/useInspectionChecklist.ts'
import type { InspectionIndicator } from '../types/inspectionChecklist.ts'
import { indicatorSchema, type IndicatorFormValues } from '../types/inspectionChecklistSchemas.ts'

interface IndicatorFormProps {
  indicator?: InspectionIndicator
  onDone: () => void
}

export function IndicatorForm({ indicator, onDone }: IndicatorFormProps) {
  const createIndicator = useCreateIndicator()
  const updateIndicator = useUpdateIndicator()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<IndicatorFormValues>({
    resolver: zodResolver(indicatorSchema),
    defaultValues: {
      nameEn: indicator?.nameEn ?? '',
      nameAr: indicator?.nameAr ?? '',
      sortOrder: indicator?.sortOrder ?? 0,
    },
  })

  async function onSubmit(values: IndicatorFormValues): Promise<void> {
    try {
      if (indicator) {
        await updateIndicator.mutateAsync({ id: indicator.id, body: values })
      } else {
        await createIndicator.mutateAsync(values)
      }
      onDone()
    } catch (error) {
      // 409 "Arabic name is already in use" / "English name is already in use" go to FormError.
      applyServerErrors(error, setError, ['nameEn', 'nameAr', 'sortOrder'])
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit(onSubmit)} noValidate>
      <FormError message={errors.root?.server?.message} />
      <Field label="English name" htmlFor="indicatorNameEn" error={errors.nameEn?.message}>
        <input
          id="indicatorNameEn"
          className="input"
          aria-invalid={Boolean(errors.nameEn)}
          {...register('nameEn')}
        />
      </Field>
      <Field label="Arabic name" htmlFor="indicatorNameAr" error={errors.nameAr?.message}>
        <input
          id="indicatorNameAr"
          className="input"
          dir="rtl"
          lang="ar"
          aria-invalid={Boolean(errors.nameAr)}
          {...register('nameAr')}
        />
      </Field>
      <Field label="Sort order" htmlFor="indicatorSortOrder" error={errors.sortOrder?.message} hint="0–1000; lower comes first">
        <input
          id="indicatorSortOrder"
          type="number"
          min={0}
          max={1000}
          step={1}
          className="input"
          aria-invalid={Boolean(errors.sortOrder)}
          {...register('sortOrder', { valueAsNumber: true })}
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

**New file: `src/features/inspection-checklist/components/CheckForm.tsx`** — `indicatorId` is preset when adding from an indicator card; changing it moves the check.

```tsx
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Field } from '../../../shared/components/ui/Field.tsx'
import { FormError } from '../../../shared/components/ui/FormError.tsx'
import { applyServerErrors } from '../../../shared/utils/formErrors.ts'
import { useCreateCheck, useUpdateCheck } from '../hooks/useInspectionChecklist.ts'
import type { InspectionCheck, InspectionIndicator } from '../types/inspectionChecklist.ts'
import { checkSchema, type CheckFormValues } from '../types/inspectionChecklistSchemas.ts'

interface CheckFormProps {
  check?: InspectionCheck
  indicatorId: string
  indicators: InspectionIndicator[]
  onDone: () => void
}

export function CheckForm({ check, indicatorId, indicators, onDone }: CheckFormProps) {
  const createCheck = useCreateCheck()
  const updateCheck = useUpdateCheck()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CheckFormValues>({
    resolver: zodResolver(checkSchema),
    defaultValues: {
      indicatorId: check?.indicatorId ?? indicatorId,
      nameEn: check?.nameEn ?? '',
      nameAr: check?.nameAr ?? '',
      sortOrder: check?.sortOrder ?? 0,
    },
  })

  async function onSubmit(values: CheckFormValues): Promise<void> {
    try {
      if (check) {
        await updateCheck.mutateAsync({ id: check.id, body: values })
      } else {
        await createCheck.mutateAsync(values)
      }
      onDone()
    } catch (error) {
      // "Inspection indicator <id> does not exist" and the 409 name messages go to FormError.
      applyServerErrors(error, setError, ['indicatorId', 'nameEn', 'nameAr', 'sortOrder'])
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit(onSubmit)} noValidate>
      <FormError message={errors.root?.server?.message} />
      <Field label="Indicator" htmlFor="checkIndicatorId" error={errors.indicatorId?.message}>
        <select
          id="checkIndicatorId"
          className="input"
          aria-invalid={Boolean(errors.indicatorId)}
          {...register('indicatorId')}
        >
          <option value="">Select an indicator</option>
          {indicators.map((indicator) => (
            <option key={indicator.id} value={indicator.id}>
              {indicator.nameEn}
            </option>
          ))}
        </select>
      </Field>
      <Field label="English name" htmlFor="checkNameEn" error={errors.nameEn?.message}>
        <input id="checkNameEn" className="input" aria-invalid={Boolean(errors.nameEn)} {...register('nameEn')} />
      </Field>
      <Field label="Arabic name" htmlFor="checkNameAr" error={errors.nameAr?.message}>
        <input
          id="checkNameAr"
          className="input"
          dir="rtl"
          lang="ar"
          aria-invalid={Boolean(errors.nameAr)}
          {...register('nameAr')}
        />
      </Field>
      <Field label="Sort order" htmlFor="checkSortOrder" error={errors.sortOrder?.message} hint="0–1000; lower comes first">
        <input
          id="checkSortOrder"
          type="number"
          min={0}
          max={1000}
          step={1}
          className="input"
          aria-invalid={Boolean(errors.sortOrder)}
          {...register('sortOrder', { valueAsNumber: true })}
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

### 5 — Indicator card

**New file: `src/features/inspection-checklist/components/IndicatorCard.module.css`**

```css
.header {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--space-4);
}

.title {
  margin: 0;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}
```

**New file: `src/features/inspection-checklist/components/IndicatorCard.tsx`**

```tsx
import type { InspectionCheck, InspectionIndicator } from '../types/inspectionChecklist.ts'
import styles from './IndicatorCard.module.css'

interface IndicatorCardProps {
  indicator: InspectionIndicator
  onEdit: () => void
  onDelete: () => void
  onAddCheck: () => void
  onEditCheck: (check: InspectionCheck) => void
  onDeleteCheck: (check: InspectionCheck) => void
}

export function IndicatorCard({
  indicator,
  onEdit,
  onDelete,
  onAddCheck,
  onEditCheck,
  onDeleteCheck,
}: IndicatorCardProps) {
  return (
    <section className="card" aria-labelledby={`indicator-${indicator.id}`}>
      <div className={styles.header}>
        <div>
          <h2 id={`indicator-${indicator.id}`} className={styles.title}>
            {indicator.nameEn}
          </h2>
          <p className="muted" dir="rtl" lang="ar">
            {indicator.nameAr}
          </p>
          <span className="badge">Order {indicator.sortOrder}</span>
        </div>
        <div className={styles.actions}>
          <button type="button" className="btn btn-primary btn-small" onClick={onAddCheck}>
            Add check
          </button>
          <button type="button" className="btn btn-secondary btn-small" onClick={onEdit}>
            Edit
          </button>
          <button type="button" className="btn btn-danger btn-small" onClick={onDelete}>
            Delete
          </button>
        </div>
      </div>

      {indicator.checks.length === 0 ? (
        <p className="muted">No checks yet.</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Order</th>
                <th>English name</th>
                <th>Arabic name</th>
                <th>
                  <span className="visually-hidden">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {indicator.checks.map((check) => (
                <tr key={check.id}>
                  <td>{check.sortOrder}</td>
                  <td>{check.nameEn}</td>
                  <td dir="rtl" lang="ar">
                    {check.nameAr}
                  </td>
                  <td>
                    <div className="table-actions">
                      <button
                        type="button"
                        className="btn btn-secondary btn-small"
                        onClick={() => onEditCheck(check)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger btn-small"
                        onClick={() => onDeleteCheck(check)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
```

### 6 — Page

**New file: `src/features/inspection-checklist/pages/InspectionChecklistPage.tsx`**

```tsx
import { useState, type ReactNode } from 'react'
import { PageHeader } from '../../../shared/components/layout/PageHeader.tsx'
import { ConfirmDialog } from '../../../shared/components/ui/ConfirmDialog.tsx'
import { Dialog } from '../../../shared/components/ui/Dialog.tsx'
import { EmptyState } from '../../../shared/components/ui/EmptyState.tsx'
import { ErrorAlert } from '../../../shared/components/ui/ErrorAlert.tsx'
import { LoadingState } from '../../../shared/components/ui/LoadingState.tsx'
import { CheckForm } from '../components/CheckForm.tsx'
import { IndicatorCard } from '../components/IndicatorCard.tsx'
import { IndicatorForm } from '../components/IndicatorForm.tsx'
import {
  useDeleteCheck,
  useDeleteIndicator,
  useInspectionChecklist,
} from '../hooks/useInspectionChecklist.ts'
import type { InspectionCheck, InspectionIndicator } from '../types/inspectionChecklist.ts'

type FormDialogState =
  | { kind: 'indicator'; indicator?: InspectionIndicator }
  | { kind: 'check'; indicatorId: string; check?: InspectionCheck }
  | null

type DeleteTarget =
  | { kind: 'indicator'; indicator: InspectionIndicator }
  | { kind: 'check'; check: InspectionCheck }
  | null

function getDialogTitle(state: FormDialogState): string {
  if (state?.kind === 'check') {
    return state.check ? 'Edit check' : 'New check'
  }
  return state?.indicator ? 'Edit indicator' : 'New indicator'
}

export function InspectionChecklistPage() {
  const checklist = useInspectionChecklist()
  const deleteIndicator = useDeleteIndicator()
  const deleteCheck = useDeleteCheck()
  const [formDialog, setFormDialog] = useState<FormDialogState>(null)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null)

  const activeDelete = deleteTarget?.kind === 'check' ? deleteCheck : deleteIndicator

  function closeForm(): void {
    setFormDialog(null)
  }

  function closeDelete(): void {
    setDeleteTarget(null)
    deleteIndicator.reset()
    deleteCheck.reset()
  }

  function confirmDelete(): void {
    if (deleteTarget?.kind === 'indicator') {
      deleteIndicator.mutate(deleteTarget.indicator.id, { onSuccess: closeDelete })
    } else if (deleteTarget?.kind === 'check') {
      deleteCheck.mutate(deleteTarget.check.id, { onSuccess: closeDelete })
    }
  }

  function renderForm(): ReactNode {
    if (formDialog?.kind === 'indicator') {
      return <IndicatorForm indicator={formDialog.indicator} onDone={closeForm} />
    }
    if (formDialog?.kind === 'check') {
      return (
        <CheckForm
          check={formDialog.check}
          indicatorId={formDialog.indicatorId}
          indicators={checklist.data ?? []}
          onDone={closeForm}
        />
      )
    }
    return null
  }

  function renderChecklist(): ReactNode {
    if (checklist.isPending) {
      return <LoadingState />
    }
    if (checklist.isError) {
      return <ErrorAlert error={checklist.error} />
    }
    if (checklist.data.length === 0) {
      return <EmptyState message="No indicators yet. Add one to start the checklist." />
    }
    return checklist.data.map((indicator) => (
      <IndicatorCard
        key={indicator.id}
        indicator={indicator}
        onEdit={() => setFormDialog({ kind: 'indicator', indicator })}
        onDelete={() => setDeleteTarget({ kind: 'indicator', indicator })}
        onAddCheck={() => setFormDialog({ kind: 'check', indicatorId: indicator.id })}
        onEditCheck={(check) => setFormDialog({ kind: 'check', indicatorId: check.indicatorId, check })}
        onDeleteCheck={(check) => setDeleteTarget({ kind: 'check', check })}
      />
    ))
  }

  const deleteName =
    deleteTarget?.kind === 'check' ? deleteTarget.check.nameEn : deleteTarget?.indicator.nameEn

  return (
    <>
      <PageHeader
        title="Inspection checklist"
        description="The pre-trip checklist: indicators and the checks under each one."
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setFormDialog({ kind: 'indicator' })}>
            New indicator
          </button>
        }
      />
      <div className="stack">
        <div className="alert alert-info">
          Every new trip inspection must answer every check below. Changes apply to new inspections only; past
          inspections keep their copy of the names and order.
        </div>
        {renderChecklist()}
      </div>

      <Dialog open={formDialog !== null} title={getDialogTitle(formDialog)} onClose={closeForm}>
        {renderForm()}
      </Dialog>

      <ConfirmDialog
        open={deleteTarget !== null}
        title={deleteTarget?.kind === 'check' ? 'Delete check' : 'Delete indicator'}
        pending={activeDelete.isPending}
        error={activeDelete.error}
        onConfirm={confirmDelete}
        onCancel={closeDelete}
      >
        <p>
          Delete <strong>{deleteName}</strong>?{' '}
          {deleteTarget?.kind === 'indicator'
            ? 'An indicator can only be deleted once it has no checks.'
            : 'New inspections will no longer include it.'}
        </p>
      </ConfirmDialog>
    </>
  )
}
```

### 7 — Public API

**New file: `src/features/inspection-checklist/index.ts`**

```ts
export { useInspectionChecklist } from './hooks/useInspectionChecklist.ts'
export { InspectionChecklistPage } from './pages/InspectionChecklistPage.tsx'
export type { InspectionCheck, InspectionIndicator } from './types/inspectionChecklist.ts'
```

### 8 — Route, path and navigation

**File: `src/config/routes.ts`** — add to `ROUTES`:

```ts
  inspectionChecklist: '/inspection-checklist',
```

**File: `src/app/routes/router.tsx`** — import `InspectionChecklistPage` from `../../features/inspection-checklist/index.ts`; add before `'*'`:

```tsx
          { path: ROUTES.inspectionChecklist, element: <InspectionChecklistPage /> },
```

**File: `src/app/layout/navigation.ts`** — add, after "Countries" and before "Users":

```ts
  { label: 'Inspection checklist', to: ROUTES.inspectionChecklist, adminOnly: true },
```

### 9 — Docs and plans

- New [00-overview.md](00-overview.md) for `inspection-checklist`.

---

## Edge Cases & Failure Modes

- **Delete an indicator that still has checks** → 409 `Inspection indicator still has checks; delete or move them first` → shown inside the `ConfirmDialog`; the dialog stays open; Cancel clears it.
- **Duplicate names** → indicator: 409 `Arabic name is already in use` / `English name is already in use`; check: 409 `Arabic name is already used by another check in this indicator` / `English name is already used by another check in this indicator` → `FormError`.
- **Moving a check** into an indicator that already has a check with the same name → the same 409.
- **Indicator deleted by someone else** while a check form is open → 400 `Inspection indicator <id> does not exist` → `FormError`; any other 404 (`Inspection indicator <id> not found` / `Inspection check <id> not found`) shows in the dialog.
- **`sortOrder`** empty, decimal, negative or > 1000 → zod message "Enter a whole number from 0 to 1000"; never sent as `null` (the API rejects `null`).
- **Order after save** → the list refetches (`['inspection-checklist']` invalidated), so the server's order (sortOrder, then nameEn) is shown; the trip form (Story 11) also refreshes.
- **New check** → required in every **new** trip inspection from then on; existing inspections are unaffected (info text).
- **Empty checklist** → empty state; the trip form (Story 11) cannot create trips until checks exist.
- **Role `user`** does not see the sidebar item but can open the URL; the API allows it.
- **Two delete mutations** share one dialog; `activeDelete` picks the matching one for `pending` / `error`, and `closeDelete` resets both.

---

## Test Plan

No test runner. Manual, backend seeded, signed in as admin:

1. Sidebar "Inspection checklist" → 3 indicators, 16 checks, in sortOrder order; Arabic names right-to-left.
2. New indicator `Test indicator` / `مؤشر تجريبي`, order 99 → card appears last. Same names again → "English name is already in use" (or Arabic).
3. Sort order `1001` or empty → "Enter a whole number from 0 to 1000", no request.
4. Add check to the new indicator → appears in its table. Same check name again in it → the 409 check message.
5. Edit the check → change Indicator to "Dashboard Indicators" → the check moves there.
6. Delete an indicator with checks (e.g. "Dashboard Indicators") → 409 message in the dialog; Cancel.
7. Delete the moved check and the test indicator → both gone.
8. Sign in as a role `user` (create one in Story 04 or via API) → no "Inspection checklist" in the sidebar.

---

## Migration / Rollback

- No data migration. Rollback: delete `src/features/inspection-checklist/`, the route, `ROUTES.inspectionChecklist` and the nav item.

---

## Verification Steps

1. `npm run build` → no errors. 2. `npm run lint` → no errors. 3. `grep -rnw "any" src/features/inspection-checklist` → none.
4. `grep -rn "features/inspection-checklist/" src --include=*.ts --include=*.tsx | grep -v "^src/features/inspection-checklist/" | grep -v "inspection-checklist/index.ts'"` → no output (deep imports from `app/` and other top-level folders).
5. `grep -rn "\.\./inspection-checklist/" src/features --include=*.ts --include=*.tsx | grep -v "inspection-checklist/index.ts'"` → no output (deep imports from other features, which use `../inspection-checklist/...`).
6. Test Plan steps 1–8.

---

## Done Criteria

Implemented 2026-11-07. All code blocks compiled and linted as written. Differences: none in `src/`; Verification Steps gained grep 5 (grep 4 cannot catch a deep import from another feature, which looks like `../inspection-checklist/...`). Headless checks: build, lint, `any` and import greps; dev server returned 200 for `/inspection-checklist` and the feature's `index.ts`; every API call the feature makes was exercised through the Vite proxy with a Bearer token (GET list 3 indicators / 16 checks; create / 409 duplicate / update indicator; create / 409 duplicate / update / move check; delete indicator with checks → 409 `Inspection indicator still has checks; delete or move them first`; delete check; delete indicators; Arabic names round-trip; seeded data unchanged). Test Plan steps 1–8 (browser) not run yet.

- [x] `src/features/inspection-checklist/` with types, schemas, service, hooks, `IndicatorForm`, `CheckForm`, `IndicatorCard`, `InspectionChecklistPage`, `index.ts`.
- [x] `/inspection-checklist` route, `ROUTES.inspectionChecklist`, admin-only "Inspection checklist" sidebar item (hiding from role `user`: browser check not run yet).
- [ ] Indicators and checks: create / edit / delete in dialogs; moving a check works; every API error message shown (409 "still has checks" in the confirm dialog). — browser check not run yet (the API calls and messages were verified through the proxy).
- [x] `index.ts` exports `InspectionIndicator`, `InspectionCheck`, `useInspectionChecklist`, `InspectionChecklistPage`.
- [x] `inspection-checklist` overview written.
- [x] `npm run build` and `npm run lint` pass; no `any`.

**STOP HERE. Report to the user and wait for confirmation before proceeding to Story 11.**
