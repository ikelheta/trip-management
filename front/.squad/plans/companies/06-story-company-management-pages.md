# Story 06 — Company management pages: list, details with header/footer images, create, edit and delete

## Prerequisites

- **Story 02 completed:** [../app-foundation/02-story-app-shell-routing-api-client-and-shared-ui.md](../app-foundation/02-story-app-shell-routing-api-client-and-shared-ui.md) — `apiRequest`, `fetchAllPages`, `Paginated`, `ListQuery`, `useListParams`, `SearchInput`, `Pagination`, `Field`, `FormError`, `ErrorAlert`, `LoadingState`, `EmptyState`, `ConfirmDialog`, `PageHeader`, `applyServerErrors`, `formatDateTime`, `ROUTES`, router, `NAV_ITEMS`, global CSS.
- **Story 03 completed:** [../authentication/03-story-login-session-and-protected-routes.md](../authentication/03-story-login-session-and-protected-routes.md) — signed-in requests.
- **Story 05 completed:** [../files/05-story-shared-file-upload-and-authenticated-images.md](../files/05-story-shared-file-upload-and-authenticated-images.md) — `ImageUploadField`, `AuthImage` from `src/features/files/index.ts`.
- Intake: [../../stories/companies/company-management-pages/intake.md](../../stories/companies/company-management-pages/intake.md).
- API contract: `backend/contracts/companies.md` (covers backend Story 03) and `backend/contracts/README.md` ("Lists and pagination", "Upload-first file flow").
- **Do not start until `npm run build` passes on the current `src/`.**

---

## Story Goal

1. `/companies` — paginated, searchable table (search: name, registration number, city).
2. `/companies/:id` — details with the header and footer images.
3. `/companies/new`, `/companies/:id/edit` — one form; images uploaded first (`ownerType: "companies"`); on edit only changed image fields are sent.
4. Delete with confirmation, from the list and the details page.
5. Sidebar item **Companies**.
6. For the vehicles story: `Company`, `useAllCompanies()`, `CompanySelect` exported from `src/features/companies/index.ts`.

**Not in scope:** printed documents, a company's vehicle list, restoring deleted companies, tests.

**Hard constraints for the executor:**

- Conventions of `src/README.md` / Stories 02–05 (no semicolons, import extensions, `import type`, no `any`, named exports, `.tsx` files export only components).
- All code in `src/features/companies/`; others import only `src/features/companies/index.ts`. Files only through `src/features/files/index.ts`.
- API calls only in `services/companyService.ts`; query hooks only in `hooks/useCompanies.ts`; every mutation invalidates the `['companies']` prefix (lists and the all-companies list).
- PATCH image semantics from the contract: **omitted keeps, `null` removes (and deletes the file), a new url replaces**. Never resend an unchanged image url.
- No new dependencies.

---

## Context — Read These Files First

1. `backend/contracts/companies.md` — whole file (fields, image rules 1–4, error messages, search fields).
2. `backend/contracts/README.md` — "Lists and pagination", "Upload-first file flow".
3. `src/features/files/index.ts` — `ImageUploadField` props (`id`, `label`, `ownerType`, `value`, `onChange`, `error`), `AuthImage` (`url`, `alt`, `className`).
4. `src/shared/services/httpClient.ts` (`apiRequest` `query` option), `src/shared/services/fetchAllPages.ts`, `src/shared/types/api.ts`.
5. `src/shared/hooks/useListParams.ts`, `src/shared/components/ui/Pagination.tsx`, `SearchInput.tsx`, `ConfirmDialog.tsx`.
6. `src/features/users/` (Story 04) — page / form / hook pattern to mirror.
7. `src/config/routes.ts`, `src/app/routes/router.tsx`, `src/app/layout/navigation.ts`.

---

## Implementation tasks

### 1 — Routes and navigation

**File: `src/config/routes.ts`** — add (keep the existing keys):

```ts
  companies: '/companies',
  newCompany: '/companies/new',
  company: (id: string): string => `/companies/${id}`,
  editCompany: (id: string): string => `/companies/${id}/edit`,
```

**File: `src/app/layout/navigation.ts`** — insert `{ label: 'Companies', to: ROUTES.companies }`. Final sidebar order across all stories: Trips, Drivers, Vehicles, **Companies**, Countries, Inspection checklist, Users — so place it after Vehicles / Drivers / Trips (if present) and before Countries / Inspection checklist / Users (if present).

### 2 — Types and form schema

**New file: `src/features/companies/types/companies.ts`**

```ts
/** backend/contracts/companies.md `Company`. */
export interface Company {
  id: string
  name: string
  registrationNumber: string
  city: string
  address: string
  whatsAppNumber: string
  phoneNumber: string
  /** "/api/files/<id>/download" or null. */
  headerUrl: string | null
  footerUrl: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateCompanyRequest {
  name: string
  registrationNumber: string
  city: string
  address: string
  whatsAppNumber: string
  phoneNumber: string
  headerUrl?: string | null
  footerUrl?: string | null
}

/** Omitted = unchanged; headerUrl / footerUrl null = remove the image. */
export type UpdateCompanyRequest = Partial<CreateCompanyRequest>
```

**New file: `src/features/companies/types/companySchemas.ts`**

```ts
import { z } from 'zod'

const TEXT_MIN_LENGTH = 2
const TEXT_MAX_LENGTH = 256

function requiredText(label: string) {
  return z
    .string()
    .trim()
    .min(TEXT_MIN_LENGTH, `${label} needs at least ${TEXT_MIN_LENGTH} characters`)
    .max(TEXT_MAX_LENGTH, `${label} can have at most ${TEXT_MAX_LENGTH} characters`)
}

export const companyFormSchema = z.object({
  name: requiredText('Name'),
  registrationNumber: requiredText('Registration number'),
  city: requiredText('City'),
  address: requiredText('Address'),
  whatsAppNumber: requiredText('WhatsApp number'),
  phoneNumber: requiredText('Phone number'),
  headerUrl: z.string().nullable(),
  footerUrl: z.string().nullable(),
})

export type CompanyFormValues = z.infer<typeof companyFormSchema>

export const COMPANY_FORM_FIELDS = [
  'name',
  'registrationNumber',
  'city',
  'address',
  'whatsAppNumber',
  'phoneNumber',
  'headerUrl',
  'footerUrl',
] as const
```

### 3 — Request mapping

**New file: `src/features/companies/utils/companyRequests.ts`**

```ts
import type { Company, CreateCompanyRequest, UpdateCompanyRequest } from '../types/companies.ts'
import type { CompanyFormValues } from '../types/companySchemas.ts'

export function toCreateCompanyRequest(values: CompanyFormValues): CreateCompanyRequest {
  return { ...values }
}

/**
 * Image fields follow the PATCH rule: omitted keeps the image, null removes it (the backend
 * deletes the file), a new url replaces it. An unchanged url is never resent.
 */
export function toUpdateCompanyRequest(values: CompanyFormValues, company: Company): UpdateCompanyRequest {
  const body: UpdateCompanyRequest = {
    name: values.name,
    registrationNumber: values.registrationNumber,
    city: values.city,
    address: values.address,
    whatsAppNumber: values.whatsAppNumber,
    phoneNumber: values.phoneNumber,
  }
  if (values.headerUrl !== company.headerUrl) {
    body.headerUrl = values.headerUrl
  }
  if (values.footerUrl !== company.footerUrl) {
    body.footerUrl = values.footerUrl
  }
  return body
}

export function toCompanyFormValues(company: Company): CompanyFormValues {
  return {
    name: company.name,
    registrationNumber: company.registrationNumber,
    city: company.city,
    address: company.address,
    whatsAppNumber: company.whatsAppNumber,
    phoneNumber: company.phoneNumber,
    headerUrl: company.headerUrl,
    footerUrl: company.footerUrl,
  }
}
```

### 4 — Service

**New file: `src/features/companies/services/companyService.ts`**

```ts
import { fetchAllPages } from '../../../shared/services/fetchAllPages.ts'
import { apiRequest } from '../../../shared/services/httpClient.ts'
import type { ListQuery, Paginated } from '../../../shared/types/api.ts'
import type { Company, CreateCompanyRequest, UpdateCompanyRequest } from '../types/companies.ts'

export function fetchCompanies(query: ListQuery, signal?: AbortSignal): Promise<Paginated<Company>> {
  return apiRequest<Paginated<Company>>('/companies', {
    query: { page: query.page, limit: query.limit, search: query.search },
    signal,
  })
}

/** Every company (all pages), for dropdowns. */
export function fetchAllCompanies(signal?: AbortSignal): Promise<Company[]> {
  return fetchAllPages((page, limit) => fetchCompanies({ page, limit }, signal))
}

export function fetchCompany(id: string, signal?: AbortSignal): Promise<Company> {
  return apiRequest<Company>(`/companies/${id}`, { signal })
}

export function createCompany(body: CreateCompanyRequest): Promise<Company> {
  return apiRequest<Company>('/companies', { method: 'POST', body })
}

export function updateCompany(id: string, body: UpdateCompanyRequest): Promise<Company> {
  return apiRequest<Company>(`/companies/${id}`, { method: 'PATCH', body })
}

export function deleteCompany(id: string): Promise<void> {
  return apiRequest<void>(`/companies/${id}`, { method: 'DELETE' })
}
```

### 5 — Query hooks

**New file: `src/features/companies/hooks/useCompanies.ts`**

```ts
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
```

### 6 — Components

**New file: `src/features/companies/components/CompanyForm.tsx`**

```tsx
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { Link } from 'react-router'
import { Field } from '../../../shared/components/ui/Field.tsx'
import { FormError } from '../../../shared/components/ui/FormError.tsx'
import { applyServerErrors } from '../../../shared/utils/formErrors.ts'
import { ImageUploadField } from '../../files/index.ts'
import { COMPANY_FORM_FIELDS, companyFormSchema, type CompanyFormValues } from '../types/companySchemas.ts'

// Files uploaded for a company use this ownerType (backend/contracts/companies.md image rule 1).
const COMPANY_FILE_OWNER_TYPE = 'companies'

interface CompanyFormProps {
  defaultValues: CompanyFormValues
  submitLabel: string
  cancelTo: string
  /** Rejects with the API error; the form maps it to fields. */
  onSubmit: (values: CompanyFormValues) => Promise<void>
}

export function CompanyForm({ defaultValues, submitLabel, cancelTo, onSubmit }: CompanyFormProps) {
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CompanyFormValues>({ resolver: zodResolver(companyFormSchema), defaultValues })

  async function submit(values: CompanyFormValues): Promise<void> {
    try {
      await onSubmit(values)
    } catch (error) {
      applyServerErrors(error, setError, COMPANY_FORM_FIELDS)
    }
  }

  return (
    <form className="card form" onSubmit={handleSubmit(submit)} noValidate>
      <FormError message={errors.root?.server?.message} />
      <div className="form-grid">
        <Field label="Name" htmlFor="name" error={errors.name?.message}>
          <input id="name" className="input" aria-invalid={Boolean(errors.name)} {...register('name')} />
        </Field>
        <Field
          label="Registration number"
          htmlFor="registrationNumber"
          error={errors.registrationNumber?.message}
          hint="Must be unique."
        >
          <input
            id="registrationNumber"
            className="input"
            aria-invalid={Boolean(errors.registrationNumber)}
            {...register('registrationNumber')}
          />
        </Field>
        <Field label="City" htmlFor="city" error={errors.city?.message}>
          <input id="city" className="input" aria-invalid={Boolean(errors.city)} {...register('city')} />
        </Field>
        <Field label="Address" htmlFor="address" error={errors.address?.message}>
          <input id="address" className="input" aria-invalid={Boolean(errors.address)} {...register('address')} />
        </Field>
        <Field label="Phone number" htmlFor="phoneNumber" error={errors.phoneNumber?.message}>
          <input
            id="phoneNumber"
            type="tel"
            className="input"
            aria-invalid={Boolean(errors.phoneNumber)}
            {...register('phoneNumber')}
          />
        </Field>
        <Field label="WhatsApp number" htmlFor="whatsAppNumber" error={errors.whatsAppNumber?.message}>
          <input
            id="whatsAppNumber"
            type="tel"
            className="input"
            placeholder="+966500000000"
            aria-invalid={Boolean(errors.whatsAppNumber)}
            {...register('whatsAppNumber')}
          />
        </Field>
      </div>
      <div className="form-grid">
        <Controller
          name="headerUrl"
          control={control}
          render={({ field, fieldState }) => (
            <ImageUploadField
              id="headerUrl"
              label="Header image"
              ownerType={COMPANY_FILE_OWNER_TYPE}
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          name="footerUrl"
          control={control}
          render={({ field, fieldState }) => (
            <ImageUploadField
              id="footerUrl"
              label="Footer image"
              ownerType={COMPANY_FILE_OWNER_TYPE}
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />
      </div>
      <div className="form-actions">
        <Link to={cancelTo} className="btn btn-secondary">
          Cancel
        </Link>
        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  )
}
```

**New file: `src/features/companies/components/DeleteCompanyDialog.tsx`** — used by the list and the details page.

```tsx
import { ConfirmDialog } from '../../../shared/components/ui/ConfirmDialog.tsx'
import { useDeleteCompany } from '../hooks/useCompanies.ts'
import type { Company } from '../types/companies.ts'

interface DeleteCompanyDialogProps {
  /** The company to delete; null keeps the dialog closed. */
  company: Company | null
  onClose: () => void
  onDeleted?: () => void
}

export function DeleteCompanyDialog({ company, onClose, onDeleted }: DeleteCompanyDialogProps) {
  const deleteCompany = useDeleteCompany()

  function close(): void {
    deleteCompany.reset()
    onClose()
  }

  function confirm(): void {
    if (!company) {
      return
    }
    deleteCompany.mutate(company.id, {
      onSuccess: () => {
        close()
        onDeleted?.()
      },
    })
  }

  return (
    <ConfirmDialog
      open={company !== null}
      title="Delete company"
      pending={deleteCompany.isPending}
      error={deleteCompany.error}
      onConfirm={confirm}
      onCancel={close}
    >
      <p>
        Delete {company?.name} ({company?.registrationNumber})? Its vehicles are not deleted.
      </p>
    </ConfirmDialog>
  )
}
```

**New file: `src/features/companies/components/CompanySelect.tsx`** — for other features (vehicles). Works with `{...register('companyId')}` (React 19 passes `ref` as a prop) and as a controlled filter (`value` / `onChange`).

```tsx
import type { Ref, SelectHTMLAttributes } from 'react'
import { useAllCompanies } from '../hooks/useCompanies.ts'

type CompanySelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  /** Label of the empty option (value ""). */
  placeholder?: string
  ref?: Ref<HTMLSelectElement>
}

export function CompanySelect({ placeholder = 'Select a company', ref, className = '', ...props }: CompanySelectProps) {
  const companies = useAllCompanies()

  let emptyLabel = placeholder
  if (companies.isPending) {
    emptyLabel = 'Loading companies…'
  } else if (companies.isError) {
    emptyLabel = 'Could not load companies'
  }

  return (
    <select ref={ref} className={`input ${className}`} {...props}>
      <option value="">{emptyLabel}</option>
      {companies.data?.map((company) => (
        <option key={company.id} value={company.id}>
          {company.name} ({company.registrationNumber})
        </option>
      ))}
    </select>
  )
}
```

### 7 — Pages

**New file: `src/features/companies/pages/CompaniesPage.tsx`**

```tsx
import { useState } from 'react'
import { Link } from 'react-router'
import { ROUTES } from '../../../config/routes.ts'
import { PageHeader } from '../../../shared/components/layout/PageHeader.tsx'
import { EmptyState } from '../../../shared/components/ui/EmptyState.tsx'
import { ErrorAlert } from '../../../shared/components/ui/ErrorAlert.tsx'
import { LoadingState } from '../../../shared/components/ui/LoadingState.tsx'
import { Pagination } from '../../../shared/components/ui/Pagination.tsx'
import { SearchInput } from '../../../shared/components/ui/SearchInput.tsx'
import { useListParams } from '../../../shared/hooks/useListParams.ts'
import { DeleteCompanyDialog } from '../components/DeleteCompanyDialog.tsx'
import { useCompanies } from '../hooks/useCompanies.ts'
import type { Company } from '../types/companies.ts'

export function CompaniesPage() {
  const { page, search, setPage, setSearch } = useListParams()
  const companies = useCompanies({ page, search })
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null)
  const rows = companies.data?.data ?? []

  return (
    <>
      <PageHeader
        title="Companies"
        description="Leasing companies and their document header / footer images."
        actions={
          <Link to={ROUTES.newCompany} className="btn btn-primary">
            New company
          </Link>
        }
      />
      <div className="toolbar">
        <SearchInput
          defaultValue={search}
          onSearch={setSearch}
          placeholder="Search by name, registration number or city"
        />
      </div>
      {companies.isPending && <LoadingState />}
      <ErrorAlert error={companies.error} />
      {companies.data && rows.length === 0 && (
        <EmptyState message={search ? 'No companies match your search.' : 'No companies yet.'} />
      )}
      {rows.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Registration number</th>
                <th>City</th>
                <th>Phone</th>
                <th>WhatsApp</th>
                <th>
                  <span className="muted">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((company) => (
                <tr key={company.id}>
                  <td>
                    <Link to={ROUTES.company(company.id)}>{company.name}</Link>
                  </td>
                  <td>{company.registrationNumber}</td>
                  <td>{company.city}</td>
                  <td>{company.phoneNumber}</td>
                  <td>{company.whatsAppNumber}</td>
                  <td>
                    <div className="table-actions">
                      <Link to={ROUTES.editCompany(company.id)} className="btn btn-secondary btn-small">
                        Edit
                      </Link>
                      <button
                        type="button"
                        className="btn btn-danger btn-small"
                        onClick={() => setCompanyToDelete(company)}
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
      {companies.data && <Pagination meta={companies.data.meta} onPageChange={setPage} />}
      <DeleteCompanyDialog company={companyToDelete} onClose={() => setCompanyToDelete(null)} />
    </>
  )
}
```

**New file: `src/features/companies/pages/CompanyDetailsPage.module.css`**

```css
.image {
  max-height: 220px;
}
```

**New file: `src/features/companies/pages/CompanyDetailsPage.tsx`**

```tsx
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ROUTES } from '../../../config/routes.ts'
import { PageHeader } from '../../../shared/components/layout/PageHeader.tsx'
import { ErrorAlert } from '../../../shared/components/ui/ErrorAlert.tsx'
import { LoadingState } from '../../../shared/components/ui/LoadingState.tsx'
import { formatDateTime } from '../../../shared/utils/formatDate.ts'
import { AuthImage } from '../../files/index.ts'
import { DeleteCompanyDialog } from '../components/DeleteCompanyDialog.tsx'
import { useCompany } from '../hooks/useCompanies.ts'
import styles from './CompanyDetailsPage.module.css'

export function CompanyDetailsPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const company = useCompany(id)
  const [deleteOpen, setDeleteOpen] = useState(false)

  return (
    <>
      <PageHeader
        title={company.data?.name ?? 'Company'}
        description={company.data?.registrationNumber}
        actions={
          company.data && (
            <>
              <Link to={ROUTES.editCompany(id)} className="btn btn-secondary">
                Edit
              </Link>
              <button type="button" className="btn btn-danger" onClick={() => setDeleteOpen(true)}>
                Delete
              </button>
            </>
          )
        }
      />
      {company.isPending && <LoadingState />}
      <ErrorAlert error={company.error} />
      {company.data && (
        <div className="stack">
          <section className="card">
            <dl className="details">
              <dt>Registration number</dt>
              <dd>{company.data.registrationNumber}</dd>
              <dt>City</dt>
              <dd>{company.data.city}</dd>
              <dt>Address</dt>
              <dd>{company.data.address}</dd>
              <dt>Phone</dt>
              <dd>{company.data.phoneNumber}</dd>
              <dt>WhatsApp</dt>
              <dd>{company.data.whatsAppNumber}</dd>
              <dt>Created</dt>
              <dd>{formatDateTime(company.data.createdAt)}</dd>
              <dt>Updated</dt>
              <dd>{formatDateTime(company.data.updatedAt)}</dd>
            </dl>
          </section>
          <div className="form-grid">
            <section className="card">
              <h2>Header image</h2>
              <AuthImage url={company.data.headerUrl} alt={`${company.data.name} header`} className={styles.image} />
            </section>
            <section className="card">
              <h2>Footer image</h2>
              <AuthImage url={company.data.footerUrl} alt={`${company.data.name} footer`} className={styles.image} />
            </section>
          </div>
        </div>
      )}
      <DeleteCompanyDialog
        company={deleteOpen ? (company.data ?? null) : null}
        onClose={() => setDeleteOpen(false)}
        onDeleted={() => navigate(ROUTES.companies)}
      />
    </>
  )
}
```

**New file: `src/features/companies/pages/NewCompanyPage.tsx`**

```tsx
import { useNavigate } from 'react-router'
import { ROUTES } from '../../../config/routes.ts'
import { PageHeader } from '../../../shared/components/layout/PageHeader.tsx'
import { CompanyForm } from '../components/CompanyForm.tsx'
import { useCreateCompany } from '../hooks/useCompanies.ts'
import type { CompanyFormValues } from '../types/companySchemas.ts'
import { toCreateCompanyRequest } from '../utils/companyRequests.ts'

const EMPTY_COMPANY: CompanyFormValues = {
  name: '',
  registrationNumber: '',
  city: '',
  address: '',
  whatsAppNumber: '',
  phoneNumber: '',
  headerUrl: null,
  footerUrl: null,
}

export function NewCompanyPage() {
  const navigate = useNavigate()
  const createCompany = useCreateCompany()

  async function handleSubmit(values: CompanyFormValues): Promise<void> {
    const company = await createCompany.mutateAsync(toCreateCompanyRequest(values))
    navigate(ROUTES.company(company.id))
  }

  return (
    <>
      <PageHeader title="New company" />
      <CompanyForm
        defaultValues={EMPTY_COMPANY}
        submitLabel="Create company"
        cancelTo={ROUTES.companies}
        onSubmit={handleSubmit}
      />
    </>
  )
}
```

**New file: `src/features/companies/pages/EditCompanyPage.tsx`**

```tsx
import { useNavigate, useParams } from 'react-router'
import { ROUTES } from '../../../config/routes.ts'
import { PageHeader } from '../../../shared/components/layout/PageHeader.tsx'
import { ErrorAlert } from '../../../shared/components/ui/ErrorAlert.tsx'
import { LoadingState } from '../../../shared/components/ui/LoadingState.tsx'
import { CompanyForm } from '../components/CompanyForm.tsx'
import { useCompany, useUpdateCompany } from '../hooks/useCompanies.ts'
import type { CompanyFormValues } from '../types/companySchemas.ts'
import { toCompanyFormValues, toUpdateCompanyRequest } from '../utils/companyRequests.ts'

export function EditCompanyPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const company = useCompany(id)
  const updateCompany = useUpdateCompany()

  async function handleSubmit(values: CompanyFormValues): Promise<void> {
    if (!company.data) {
      return
    }
    await updateCompany.mutateAsync({ id, body: toUpdateCompanyRequest(values, company.data) })
    navigate(ROUTES.company(id))
  }

  return (
    <>
      <PageHeader title="Edit company" description={company.data?.name} />
      {company.isPending && <LoadingState />}
      <ErrorAlert error={company.error} />
      {company.data && (
        <CompanyForm
          defaultValues={toCompanyFormValues(company.data)}
          submitLabel="Save changes"
          cancelTo={ROUTES.company(id)}
          onSubmit={handleSubmit}
        />
      )}
    </>
  )
}
```

### 8 — Public API and routes

**New file: `src/features/companies/index.ts`**

```ts
export { CompanySelect } from './components/CompanySelect.tsx'
export { useAllCompanies } from './hooks/useCompanies.ts'
export { CompaniesPage } from './pages/CompaniesPage.tsx'
export { CompanyDetailsPage } from './pages/CompanyDetailsPage.tsx'
export { EditCompanyPage } from './pages/EditCompanyPage.tsx'
export { NewCompanyPage } from './pages/NewCompanyPage.tsx'
export type { Company } from './types/companies.ts'
```

**File: `src/app/routes/router.tsx`** — import the four pages from `../../features/companies/index.ts` and add to the `AppLayout` children, before `{ path: '*', … }`:

```tsx
          { path: ROUTES.companies, element: <CompaniesPage /> },
          { path: ROUTES.newCompany, element: <NewCompanyPage /> },
          { path: '/companies/:id', element: <CompanyDetailsPage /> },
          { path: '/companies/:id/edit', element: <EditCompanyPage /> },
```

### 9 — Plans

- New [00-overview.md](00-overview.md) for `companies` (the parent session adds the row to `../00-index.md`).

---

## Edge Cases & Failure Modes

- **Duplicate registration number** → 409 `Registration number is already in use` → no field prefix → `FormError` at the top.
- **Server field messages** (`name must be longer than or equal to 2 characters`, `headerUrl must point to a JPEG, PNG or WebP image`, `headerUrl and footerUrl must be different files`, `headerUrl must be the url of a file uploaded with ownerType "companies" and not used by another company`) start with the field name → shown under that field (the image ones under the upload field through `Controller`'s `fieldState.error`).
- **Unchanged image on edit** → not sent (`toUpdateCompanyRequest`), so the backend never deletes or re-links it.
- **Removed image** → `null` sent → backend deletes the file. **Replaced image** → new url sent → backend deletes the old file. Cancelling the form keeps the stored images; the new upload is left unlinked (Story 05 note).
- **Whitespace-only text** → trimmed → "needs at least 2 characters" before sending.
- **Search** goes to the API (`search`, 1–100 chars, empty not sent); page resets to 1 when the search changes; `keepPreviousData` keeps the old rows while the next page loads.
- **Page beyond the end** after deleting the last row of the last page → empty table + Pagination lets the user go back (Story 02 note).
- **Unknown / deleted id** → 404 `Company <id> not found`; bad id → 400 `Validation failed (uuid is expected)`; both shown by `ErrorAlert`.
- **Deleting from the details page** → detail cache removed, then navigate to the list. Vehicles of the company keep working (backend soft delete).
- **`CompanySelect` before the companies load:** the empty option reads "Loading companies…". A form that uses it with `register` and a **default value** (edit forms) must render after `useAllCompanies()` has data, otherwise the browser cannot select an option that does not exist yet. The vehicles story follows this rule.
- **More than 100 companies** → `fetchAllPages` loads every page for `CompanySelect`.

---

## Test Plan

No test runner. Manual, backend running, signed in, `npm run dev`:

1. Sidebar shows **Companies** in the right place; `/companies` lists companies, newest first.
2. New company with all fields + a PNG header image → details page shows the header image; Network shows `/api/files/…/download` with `Authorization` (no 401); footer shows "No image".
3. Upload a `.gif` or a file over 10 MB as footer → message under the field, no request.
4. Create another company with the same registration number → "Registration number is already in use".
5. Search by city → filtered rows; URL has `?search=`; reload keeps it; next / previous pages work (create > 10 companies or use `?page=2`).
6. Edit: change only the city → PATCH body (Network) has no `headerUrl` / `footerUrl`. Remove the header → PATCH has `"headerUrl": null` → details shows "No image". Add a new footer → PATCH has the new `footerUrl`.
7. Delete from the list → confirm → row gone. Delete from details → back on the list.
8. `/companies/00000000-0000-4000-8000-000000000000` → "Company … not found".
9. `CompanySelect` (temporary check until the vehicles story): `await (await import('/src/features/companies/services/companyService.ts')).fetchAllCompanies()` in the console → array with every company.

---

## Migration / Rollback

- No data migration. Rollback: delete `src/features/companies/`; revert `routes.ts`, `navigation.ts`, `router.tsx`. Companies created during testing can be deleted in the UI.

---

## Verification Steps

1. `npm run build` → no errors. 2. `npm run lint` → no errors. 3. `grep -rnw any src --include=*.ts --include=*.tsx` → none.
4. `grep -rn "features/companies/" src --include=*.ts --include=*.tsx | grep -v "^src/features/companies/" | grep -v "companies/index.ts'"` → no output.
5. `grep -rn "files/" src/features/companies --include=*.ts --include=*.tsx` → only `'../../files/index.ts'` imports (inside a feature the import is relative, so `features/files/` never matches).
6. Test Plan steps 1–9.

---

## Done Criteria

Implemented 2026-11-07. All code blocks above compiled and linted unchanged. Differences: none in code; Verification Steps 3 and 5 had wrong greps (3 was not limited to `.ts`/`.tsx`; 5 searched for `features/files/`, which a relative import inside a feature never contains) and were corrected. Verified headless: `npm run build` (passes; only Vite's existing >500 kB chunk-size warning), `npm run lint` (0 warnings, 0 errors), Verification greps 3–5, dev server returns 200 for `/companies`, `/companies/new`, `/companies/:id`, `/companies/:id/edit` and `/src/features/companies/index.ts`, and the feature's API calls through the Vite proxy with a Bearer token (PNG upload `ownerType=companies` → 201; create with it as `headerUrl` → 201; header download 200 with token, 401 without; list `search=` → the row; get → 200; duplicate registration number → 409 `Registration number is already in use`; PATCH without image keys keeps `headerUrl`; PATCH `{"headerUrl":null}` → removed, file now 404; delete → 204, then 404 `Company <id> not found`; test data deleted). Not run (browser only): Test Plan steps 1–9.

- [x] `src/features/companies/` with service, hooks (`companiesKeys`), schema, request mapping, `CompanyForm`, `DeleteCompanyDialog`, `CompanySelect`, four pages and `index.ts`.
- [x] Routes `/companies`, `/companies/new`, `/companies/:id`, `/companies/:id/edit`; `ROUTES` keys added; sidebar item **Companies** in the agreed order.
- [ ] Images uploaded first with `ownerType: "companies"`, shown with `AuthImage`; PATCH sends only changed image fields. — browser check not run yet (code in place; the API side of upload-first, keep-on-omit and null-removes was verified with curl).
- [x] `Company`, `useAllCompanies`, `CompanySelect` exported for the vehicles story.
- [x] `companies` overview updated.
- [x] `npm run build` and `npm run lint` pass; no `any`.

**STOP HERE. Report to the user and wait for confirmation before proceeding to Story 07.**
