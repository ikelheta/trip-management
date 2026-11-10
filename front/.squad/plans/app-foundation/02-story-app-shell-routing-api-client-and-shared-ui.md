# Story 02 — App shell, routing, API client and shared UI building blocks

## Prerequisites

- **Story 01 completed:** [../project-structure/01-story-project-structure.md](../project-structure/01-story-project-structure.md) — `src/` has `app/`, `features/`, `shared/` (`components/ui`, `components/layout`, `hooks`, `services`, `types`, `utils`, `styles`), `assets/`, `config/`; `src/app/App.tsx` renders the placeholder; `src/README.md` holds the conventions; TypeScript `strict` is on.
- Intake: [../../stories/app-foundation/app-shell-routing-api-client-and-shared-ui/intake.md](../../stories/app-foundation/app-shell-routing-api-client-and-shared-ui/intake.md).
- API contract: `backend/contracts/README.md` (base path, error body, pagination). Backend running on `http://localhost:3000` for Verification step 4 only.
- **Do not start until `npm run build` passes on the current `src/`.**

---

## Story Goal

Add the shared foundation every page uses, once:

1. Libraries: `react-router`, `@tanstack/react-query`, `react-hook-form`, `zod`, `@hookform/resolvers`.
2. Vite proxies `/api` to the backend; `API_BASE_URL` config.
3. One HTTP client (`apiRequest`, `apiBlob`, `ApiError`, `configureHttpClient`, `toApiPath`).
4. Shared API types, QueryClient, router with an app layout, home / not-found / error pages.
5. Shared UI components, the `useListParams` hook, form-error and date helpers, design tokens and global CSS classes.

**Not in scope:** login, tokens, protected routes (Story 03), any feature page, toasts, i18n / RTL, tests.

**Hard constraints for the executor:**

- Follow `src/README.md`: single quotes, **no semicolons**, 2-space indent, explicit `.ts` / `.tsx` extensions in relative imports, `import type` for type-only imports (`verbatimModuleSyntax`), no `enum` and no constructor parameter properties (`erasableSyntaxOnly`), no `any`.
- Shared components use **named exports** (`export function Field(...)`). `src/app/App.tsx` keeps its default export.
- A `.tsx` file exports only components (oxlint `react/only-export-components`). Non-component values live in `.ts` files.
- `shared/` never imports from `features/` or `app/`. Features import other features only through their `index.ts`.
- Delete a folder's `.gitkeep` when its first real file is added.
- Plain CSS: global classes in `src/shared/styles/index.css`, component-specific styles in a `*.module.css` next to the component. No CSS framework.

---

## Context — Read These Files First

1. `src/README.md` — conventions (Story 01).
2. `src/main.tsx` — imports `./shared/styles/index.css` and `./app/App.tsx`, renders `<App />` in `<StrictMode>`.
3. `src/app/App.tsx` — placeholder `function App()` with `export default App`.
4. `src/shared/styles/index.css` — the neutral base from Story 01 (`:root` font + `color-scheme`, `body { margin: 0 }`); replaced in Task 9.
5. `vite.config.ts` — `defineConfig({ plugins: [react()] })`.
6. `tsconfig.app.json` — `types: ["vite/client"]`, `allowImportingTsExtensions`, `verbatimModuleSyntax`, `erasableSyntaxOnly`, `strict`.
7. `.oxlintrc.json` — `react/only-export-components` (warn, `allowConstantExport`).
8. `backend/contracts/README.md` — sections "Base URL, CORS and docs", "Lists and pagination", "Errors".

---

## Implementation tasks

### 1 — Dependencies

```bash
npm install react-router@^8.5.1 @tanstack/react-query@^5.107.1 react-hook-form@^7.91.0 zod@^4.6.7 @hookform/resolvers@^7.0.3
```

### 2 — Vite proxy and config

**File: `vite.config.ts`**

```ts
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // The backend has no CORS; the dev server forwards API calls (and file downloads) to it.
    proxy: { '/api': 'http://localhost:3000' },
  },
})
```

**New file: `src/vite-env.d.ts`**

```ts
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
}
```

**New file: `src/config/env.ts`** (delete `src/config/.gitkeep`)

```ts
// Same-origin '/api' works in development through the Vite proxy (vite.config.ts).
export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? '/api'
```

**New file: `src/config/routes.ts`** — paths shared by the router, links and redirects. Each feature story adds its own keys here.

```ts
export const ROUTES = {
  home: '/',
}
```

### 3 — Shared API types

**New file: `src/shared/types/api.ts`** (delete `src/shared/types/.gitkeep`)

```ts
/** `meta` of every paginated list (backend/contracts/README.md "Lists and pagination"). */
export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface Paginated<T> {
  data: T[]
  meta: PaginationMeta
}

/**
 * Query accepted by every paginated list endpoint. A `type` alias, not an interface: interfaces
 * have no implicit index signature, so they cannot be passed as `RequestOptions['query']`.
 * Feature list queries extend it the same way: `type TripListQuery = ListQuery & { … }`.
 */
export type ListQuery = {
  page?: number
  limit?: number
  search?: string
}

/** Body of every error response. */
export interface ApiErrorBody {
  statusCode: number
  error: string
  message: string | string[]
  path: string
  timestamp: string
}
```

### 4 — HTTP client

**New file: `src/shared/services/httpClient.ts`** (delete `src/shared/services/.gitkeep`)

```ts
import { API_BASE_URL } from '../../config/env.ts'
import type { ApiErrorBody } from '../types/api.ts'

type QueryValue = string | number | boolean | null | undefined

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  /** Sent as JSON. */
  body?: unknown
  /** Sent as multipart/form-data (file upload). */
  formData?: FormData
  /** Empty, null and undefined values are left out. */
  query?: Record<string, QueryValue>
  signal?: AbortSignal
}

interface HttpClientHooks {
  getToken: () => string | null
  onUnauthorized: () => void
}

/** An API error response, or a network failure (status 0). */
export class ApiError extends Error {
  readonly status: number
  readonly messages: string[]

  constructor(status: number, messages: string[]) {
    super(messages.join('\n'))
    this.name = 'ApiError'
    this.status = status
    this.messages = messages
  }
}

const NETWORK_ERROR_MESSAGE = 'Cannot reach the server. Check your connection and try again.'

// Only these 401 messages mean the session is gone; other 401s (wrong password) are form errors.
const SESSION_ERROR_MESSAGES = ['Missing access token', 'Invalid or expired access token']

let hooks: HttpClientHooks = {
  getToken: () => null,
  onUnauthorized: () => {},
}

/** Called once at start-up (authentication story) so requests carry the token. */
export function configureHttpClient(next: HttpClientHooks): void {
  hooks = next
}

/** JSON request. Resolves with the parsed body, or undefined for 204. */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await send(path, options)
  if (response.status === 204) {
    return undefined as T
  }
  return (await response.json()) as T
}

/** Binary download (files need the token, so <img src> cannot load them directly). */
export async function apiBlob(path: string, signal?: AbortSignal): Promise<Blob> {
  const response = await send(path, { signal })
  return response.blob()
}

/** Turns a url returned by the API ("/api/files/<id>/download") into a path for apiRequest / apiBlob. */
export function toApiPath(url: string): string {
  return url.startsWith('/api/') ? url.slice('/api'.length) : url
}

async function send(path: string, options: RequestOptions): Promise<Response> {
  const headers = new Headers()
  const token = hooks.getToken()
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  let body: BodyInit | undefined
  if (options.formData) {
    body = options.formData
  } else if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json')
    body = JSON.stringify(options.body)
  }

  let response: Response
  try {
    response = await fetch(buildUrl(path, options.query), {
      method: options.method ?? 'GET',
      headers,
      body,
      signal: options.signal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error
    }
    throw new ApiError(0, [NETWORK_ERROR_MESSAGE])
  }

  if (response.ok) {
    return response
  }
  const error = await toApiError(response)
  if (
    error.status === 401 &&
    token &&
    error.messages.some((message) => SESSION_ERROR_MESSAGES.includes(message))
  ) {
    hooks.onUnauthorized()
  }
  throw error
}

function buildUrl(path: string, query: RequestOptions['query']): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null || value === '') {
      continue
    }
    params.set(key, String(value))
  }
  const search = params.toString()
  return `${API_BASE_URL}${path}${search ? `?${search}` : ''}`
}

async function toApiError(response: Response): Promise<ApiError> {
  const body = (await response.json().catch(() => null)) as Partial<ApiErrorBody> | null
  const message = body?.message ?? (response.statusText || 'Request failed')
  return new ApiError(response.status, Array.isArray(message) ? message : [message])
}
```

**New file: `src/shared/services/fetchAllPages.ts`** — for dropdowns that need every row (companies, countries, vehicles, drivers). The API caps `limit` at 100.

```ts
import type { Paginated } from '../types/api.ts'

export const MAX_PAGE_SIZE = 100

/** Loads page 1, then the remaining pages in parallel, and returns all rows in order. */
export async function fetchAllPages<T>(
  fetchPage: (page: number, limit: number) => Promise<Paginated<T>>,
): Promise<T[]> {
  const first = await fetchPage(1, MAX_PAGE_SIZE)
  const rest = await Promise.all(
    Array.from({ length: first.meta.totalPages - 1 }, (_, index) => fetchPage(index + 2, MAX_PAGE_SIZE)),
  )
  return [first, ...rest].flatMap((page) => page.data)
}
```

### 5 — Query client and providers

**New file: `src/app/providers/queryClient.ts`** (delete `src/app/providers/.gitkeep`)

```ts
import { QueryClient } from '@tanstack/react-query'
import { ApiError } from '../../shared/services/httpClient.ts'

const MAX_RETRIES = 2
const STALE_TIME_MS = 30_000

function shouldRetry(failureCount: number, error: Error): boolean {
  // A 4xx answer will not change on retry.
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
    return false
  }
  return failureCount < MAX_RETRIES
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: STALE_TIME_MS, refetchOnWindowFocus: false, retry: shouldRetry },
    mutations: { retry: false },
  },
})
```

**New file: `src/app/providers/AppProviders.tsx`**

```tsx
import { QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { queryClient } from './queryClient.ts'

interface AppProvidersProps {
  children: ReactNode
}

export function AppProviders({ children }: AppProvidersProps) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
```

### 6 — Shared UI components

All in `src/shared/components/ui/` (delete its `.gitkeep`) unless noted.

**`Field.tsx`** — label + control + hint / error. The control (`<input className="input" id=…>`) is passed as `children`.

```tsx
import type { ReactNode } from 'react'

interface FieldProps {
  label: string
  htmlFor: string
  error?: string
  hint?: string
  children: ReactNode
}

export function Field({ label, htmlFor, error, hint, children }: FieldProps) {
  return (
    <div className="field">
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {hint && !error && <p className="field-hint">{hint}</p>}
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
```

**`ErrorAlert.tsx`** — shows an `ApiError`'s messages, or a generic text for anything else. Renders nothing for `null` / `undefined`.

```tsx
import { ApiError } from '../../services/httpClient.ts'

interface ErrorAlertProps {
  error: unknown
  title?: string
}

const FALLBACK_MESSAGE = 'Something went wrong. Please try again.'

export function ErrorAlert({ error, title }: ErrorAlertProps) {
  if (!error) {
    return null
  }
  const messages = error instanceof ApiError ? error.messages : [FALLBACK_MESSAGE]
  return (
    <div className="alert alert-error" role="alert">
      {title && <strong>{title}</strong>}
      {messages.length === 1 ? (
        <p>{messages[0]}</p>
      ) : (
        <ul>
          {messages.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

**`FormError.tsx`** — the form-level message set by `applyServerErrors` (Task 8).

```tsx
interface FormErrorProps {
  message?: string
}

export function FormError({ message }: FormErrorProps) {
  if (!message) {
    return null
  }
  return (
    <div className="alert alert-error" role="alert">
      {message.split('\n').map((line) => (
        <p key={line}>{line}</p>
      ))}
    </div>
  )
}
```

**`LoadingState.tsx`**

```tsx
interface LoadingStateProps {
  label?: string
}

export function LoadingState({ label = 'Loading…' }: LoadingStateProps) {
  return (
    <p className="muted" role="status">
      {label}
    </p>
  )
}
```

**`EmptyState.tsx`**

```tsx
import type { ReactNode } from 'react'

interface EmptyStateProps {
  message: string
  children?: ReactNode
}

export function EmptyState({ message, children }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <p>{message}</p>
      {children}
    </div>
  )
}
```

**`Pagination.tsx`**

```tsx
import type { PaginationMeta } from '../../types/api.ts'

interface PaginationProps {
  meta: PaginationMeta
  onPageChange: (page: number) => void
}

export function Pagination({ meta, onPageChange }: PaginationProps) {
  if (meta.totalPages <= 1) {
    return null
  }
  return (
    <nav className="pagination" aria-label="Pagination">
      <button
        type="button"
        className="btn btn-secondary btn-small"
        disabled={meta.page <= 1}
        onClick={() => onPageChange(meta.page - 1)}
      >
        Previous
      </button>
      <span>
        Page {meta.page} of {meta.totalPages} ({meta.total} total)
      </span>
      <button
        type="button"
        className="btn btn-secondary btn-small"
        disabled={meta.page >= meta.totalPages}
        onClick={() => onPageChange(meta.page + 1)}
      >
        Next
      </button>
    </nav>
  )
}
```

**`SearchInput.tsx`** — uncontrolled input; calls `onSearch` with the trimmed text after the user stops typing. `key`/`defaultValue` come from the URL (see `useListParams`).

```tsx
import { useEffect, useRef } from 'react'

interface SearchInputProps {
  defaultValue: string
  onSearch: (value: string) => void
  placeholder?: string
  label?: string
}

const SEARCH_DEBOUNCE_MS = 300
const MAX_SEARCH_LENGTH = 100

export function SearchInput({
  defaultValue,
  onSearch,
  placeholder = 'Search…',
  label = 'Search',
}: SearchInputProps) {
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  function handleChange(value: string) {
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => onSearch(value.trim()), SEARCH_DEBOUNCE_MS)
  }

  return (
    <input
      type="search"
      className="input search-input"
      aria-label={label}
      placeholder={placeholder}
      defaultValue={defaultValue}
      maxLength={MAX_SEARCH_LENGTH}
      onChange={(event) => handleChange(event.target.value)}
    />
  )
}
```

**`ConfirmDialog.tsx`** — native `<dialog>`; the effect syncs the `open` prop with `showModal()` / `close()` (a DOM API, so an effect is the right tool).

```tsx
import { useEffect, useRef, type ReactNode } from 'react'
import { ErrorAlert } from './ErrorAlert.tsx'

interface ConfirmDialogProps {
  open: boolean
  title: string
  children: ReactNode
  confirmLabel?: string
  pending?: boolean
  error?: unknown
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel = 'Delete',
  pending = false,
  error,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const element = dialog.current
    if (!element) {
      return
    }
    if (open && !element.open) {
      element.showModal()
    } else if (!open && element.open) {
      element.close()
    }
  }, [open])

  return (
    <dialog ref={dialog} className="dialog" onCancel={onCancel} aria-labelledby="confirm-dialog-title">
      <h2 id="confirm-dialog-title">{title}</h2>
      <div className="dialog-body">{children}</div>
      <ErrorAlert error={error} />
      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={pending}>
          Cancel
        </button>
        <button type="button" className="btn btn-danger" onClick={onConfirm} disabled={pending}>
          {pending ? 'Working…' : confirmLabel}
        </button>
      </div>
    </dialog>
  )
}
```

**`src/shared/components/ui/Dialog.tsx`** — the same native dialog for forms (create / edit in place). Used by the countries and inspection-checklist stories.

```tsx
import { useEffect, useRef, type ReactNode } from 'react'

interface DialogProps {
  open: boolean
  title: string
  children: ReactNode
  onClose: () => void
}

export function Dialog({ open, title, children, onClose }: DialogProps) {
  const dialog = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const element = dialog.current
    if (!element) {
      return
    }
    if (open && !element.open) {
      element.showModal()
    } else if (!open && element.open) {
      element.close()
    }
  }, [open])

  return (
    <dialog ref={dialog} className="dialog" onCancel={onClose} aria-labelledby="dialog-title">
      <h2 id="dialog-title">{title}</h2>
      {open && children}
    </dialog>
  )
}
```

(`{open && children}` remounts the form each time, so it starts from fresh default values.)

**New file: `src/shared/components/layout/PageHeader.tsx`** (delete `src/shared/components/layout/.gitkeep`)

```tsx
import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  description?: string
  actions?: ReactNode
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
        {description && <p className="muted">{description}</p>}
      </div>
      {actions && <div className="page-header-actions">{actions}</div>}
    </header>
  )
}
```

### 7 — Shared hook: list parameters in the URL

**New file: `src/shared/hooks/useListParams.ts`** (delete `src/shared/hooks/.gitkeep`) — page, search and extra filters live in the URL, so lists survive reload and back / forward.

```ts
import { useSearchParams } from 'react-router'

export interface ListParams {
  page: number
  search: string
  getFilter: (key: string) => string
  setPage: (page: number) => void
  setSearch: (search: string) => void
  /** Empty string removes the filter. Changing a filter goes back to page 1. */
  setFilter: (key: string, value: string) => void
}

export function useListParams(): ListParams {
  const [searchParams, setSearchParams] = useSearchParams()
  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const search = searchParams.get('search') ?? ''

  function update(changes: Record<string, string>, resetPage: boolean): void {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current)
        for (const [key, value] of Object.entries(changes)) {
          if (value) {
            next.set(key, value)
          } else {
            next.delete(key)
          }
        }
        if (resetPage) {
          next.delete('page')
        }
        return next
      },
      { replace: true },
    )
  }

  return {
    page,
    search,
    getFilter: (key) => searchParams.get(key) ?? '',
    setPage: (nextPage) => update({ page: nextPage > 1 ? String(nextPage) : '' }, false),
    setSearch: (nextSearch) => update({ search: nextSearch }, true),
    setFilter: (key, value) => update({ [key]: value }, true),
  }
}
```

### 8 — Shared utils

**New file: `src/shared/utils/formErrors.ts`** (delete `src/shared/utils/.gitkeep`)

```ts
import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import { ApiError } from '../services/httpClient.ts'

const FALLBACK_MESSAGE = 'Something went wrong. Please try again.'

/**
 * Puts API validation messages ("email must be an email") on the matching form field and
 * the rest (e.g. 409 "Email is already in use") on `root.server`, shown with <FormError>.
 */
export function applyServerErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
): void {
  const messages = error instanceof ApiError ? error.messages : [FALLBACK_MESSAGE]
  const unmatched: string[] = []
  for (const message of messages) {
    const field = fields.find((name) => message.startsWith(`${name} `))
    if (field) {
      setError(field, { type: 'server', message })
    } else {
      unmatched.push(message)
    }
  }
  if (unmatched.length > 0) {
    setError('root.server', { type: 'server', message: unmatched.join('\n') })
  }
}
```

**New file: `src/shared/utils/formatDate.ts`**

```ts
const dateTimeFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })
const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })

/** ISO timestamp ("2026-10-31T18:44:48.228Z") in the user's locale and timezone. */
export function formatDateTime(iso: string): string {
  return dateTimeFormat.format(new Date(iso))
}

/** "YYYY-MM-DD" wall-clock date (no timezone shift). */
export function formatDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number)
  return dateFormat.format(new Date(year, month - 1, day))
}

/** "HH:mm:ss" -> "HH:mm". */
export function formatTime(time: string): string {
  return time.slice(0, 5)
}
```

### 9 — Design tokens and global CSS

**File: `src/shared/styles/index.css`** — replace with:

```css
:root {
  font-family: system-ui, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.5;
  color-scheme: light dark;

  --color-bg: #f6f7f9;
  --color-surface: #ffffff;
  --color-text: #1d2433;
  --color-muted: #5f6b7a;
  --color-border: #d9dee5;
  --color-primary: #1f6feb;
  --color-primary-text: #ffffff;
  --color-danger: #c62828;
  --color-success: #1e7e34;
  --color-warning: #a15c00;
  --color-danger-soft: #fdecea;
  --color-success-soft: #e6f4ea;
  --color-info-soft: #e8f0fe;

  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --space-6: 32px;
  --radius: 6px;
  --sidebar-width: 220px;
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-bg: #0f141b;
    --color-surface: #18202a;
    --color-text: #e6eaf0;
    --color-muted: #9aa5b4;
    --color-border: #2d3846;
    --color-primary: #4c8dff;
    --color-danger: #ff6b6b;
    --color-success: #4cc06c;
    --color-warning: #f0a640;
    --color-danger-soft: #3a1f22;
    --color-success-soft: #1b3324;
    --color-info-soft: #1c2a40;
  }
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: var(--color-bg);
  color: var(--color-text);
}

h1,
h2,
h3 {
  margin: 0 0 var(--space-3);
  line-height: 1.25;
}

h1 {
  font-size: 1.5rem;
}

h2 {
  font-size: 1.15rem;
}

a {
  color: var(--color-primary);
}

.muted {
  color: var(--color-muted);
}

/* Buttons: <button> or <Link> */
.btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  border: 1px solid transparent;
  border-radius: var(--radius);
  font: inherit;
  text-decoration: none;
  cursor: pointer;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--color-primary);
  color: var(--color-primary-text);
}

.btn-secondary {
  background: var(--color-surface);
  border-color: var(--color-border);
  color: var(--color-text);
}

.btn-danger {
  background: var(--color-danger);
  color: #ffffff;
}

.btn-small {
  padding: var(--space-1) var(--space-3);
  font-size: 0.875rem;
}

/* Forms */
.form {
  display: grid;
  gap: var(--space-4);
  max-width: 640px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: var(--space-4);
}

.form-actions {
  display: flex;
  gap: var(--space-2);
  justify-content: flex-end;
  margin-top: var(--space-4);
}

.field {
  display: grid;
  gap: var(--space-1);
}

.field label {
  font-weight: 600;
  font-size: 0.875rem;
}

.field-hint {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--color-muted);
}

.field-error {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--color-danger);
}

.input {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-surface);
  color: var(--color-text);
  font: inherit;
}

.input[aria-invalid='true'] {
  border-color: var(--color-danger);
}

.checkbox {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}

/* Surfaces */
.card {
  padding: var(--space-5);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-surface);
}

.stack {
  display: grid;
  gap: var(--space-4);
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  align-items: center;
  margin-bottom: var(--space-4);
}

.search-input {
  max-width: 320px;
}

.page-header {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--space-5);
}

.page-header-actions {
  display: flex;
  gap: var(--space-2);
}

/* Tables */
.table-wrap {
  overflow-x: auto;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-surface);
}

.table {
  width: 100%;
  border-collapse: collapse;
}

.table th,
.table td {
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--color-border);
  text-align: start;
  vertical-align: top;
}

.table th {
  font-size: 0.8125rem;
  color: var(--color-muted);
  font-weight: 600;
}

.table tr:last-child td {
  border-bottom: none;
}

.table-actions {
  display: flex;
  gap: var(--space-2);
  justify-content: flex-end;
}

.pagination {
  display: flex;
  gap: var(--space-3);
  align-items: center;
  justify-content: flex-end;
  margin-top: var(--space-4);
}

/* Badges and alerts */
.badge {
  display: inline-block;
  padding: 0 var(--space-2);
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  background: var(--color-border);
  color: var(--color-text);
}

.badge-success {
  background: var(--color-success-soft);
  color: var(--color-success);
}

.badge-danger {
  background: var(--color-danger-soft);
  color: var(--color-danger);
}

.alert {
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius);
}

.alert p,
.alert ul {
  margin: 0;
}

.alert-error {
  background: var(--color-danger-soft);
  color: var(--color-danger);
}

.alert-info {
  background: var(--color-info-soft);
}

.alert-success {
  background: var(--color-success-soft);
  color: var(--color-success);
}

.empty-state {
  padding: var(--space-6);
  text-align: center;
  color: var(--color-muted);
}

/* Dialogs */
.dialog {
  width: min(560px, calc(100vw - 2 * var(--space-4)));
  padding: var(--space-5);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-surface);
  color: var(--color-text);
}

.dialog::backdrop {
  background: rgb(0 0 0 / 40%);
}

/* Read-only label/value lists on detail pages */
.details {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: var(--space-2) var(--space-5);
  margin: 0;
}

.details dt {
  color: var(--color-muted);
}

.details dd {
  margin: 0;
}
```

### 10 — App shell: layout, navigation and pages

**New file: `src/app/layout/navigation.ts`** — the sidebar items. Each feature story appends its item.

```ts
export interface NavItem {
  label: string
  to: string
  /** Shown only to admins (filtered in the layout once authentication exists). */
  adminOnly?: boolean
}

export const NAV_ITEMS: NavItem[] = []
```

**New file: `src/app/layout/AppLayout.module.css`**

```css
.shell {
  display: grid;
  grid-template-columns: var(--sidebar-width) 1fr;
  min-height: 100vh;
}

.sidebar {
  padding: var(--space-5) var(--space-4);
  border-inline-end: 1px solid var(--color-border);
  background: var(--color-surface);
}

.brand {
  display: block;
  margin-bottom: var(--space-5);
  font-weight: 700;
  color: var(--color-text);
  text-decoration: none;
}

.nav {
  display: grid;
  gap: var(--space-1);
}

.navLink {
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius);
  color: var(--color-text);
  text-decoration: none;
}

.navLink:hover {
  background: var(--color-bg);
}

.active {
  background: var(--color-info-soft);
  font-weight: 600;
}

.header {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: var(--space-3);
  min-height: 56px;
  padding: var(--space-2) var(--space-5);
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
}

.content {
  padding: var(--space-5);
}

@media (max-width: 720px) {
  .shell {
    grid-template-columns: 1fr;
  }

  .sidebar {
    border-inline-end: none;
    border-bottom: 1px solid var(--color-border);
  }
}
```

**New file: `src/app/layout/AppLayout.tsx`**

```tsx
import { Link, NavLink, Outlet } from 'react-router'
import { ROUTES } from '../../config/routes.ts'
import styles from './AppLayout.module.css'
import { NAV_ITEMS } from './navigation.ts'

export function AppLayout() {
  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <Link to={ROUTES.home} className={styles.brand}>
          Trip Management
        </Link>
        <nav className={styles.nav} aria-label="Main">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div>
        <header className={styles.header} />
        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
```

**New file: `src/app/pages/HomePage.tsx`**

```tsx
import { Link } from 'react-router'
import { PageHeader } from '../../shared/components/layout/PageHeader.tsx'
import { NAV_ITEMS } from '../layout/navigation.ts'

export function HomePage() {
  return (
    <>
      <PageHeader title="Trip Management" description="Manage companies, vehicles, drivers and trips." />
      <div className="form-grid">
        {NAV_ITEMS.map((item) => (
          <Link key={item.to} to={item.to} className="card">
            {item.label}
          </Link>
        ))}
      </div>
    </>
  )
}
```

**New file: `src/app/pages/NotFoundPage.tsx`**

```tsx
import { Link } from 'react-router'
import { ROUTES } from '../../config/routes.ts'
import { EmptyState } from '../../shared/components/ui/EmptyState.tsx'

export function NotFoundPage() {
  return (
    <EmptyState message="This page does not exist.">
      <Link to={ROUTES.home}>Go to the home page</Link>
    </EmptyState>
  )
}
```

**New file: `src/app/pages/RouteErrorPage.tsx`** — `errorElement` for render errors.

```tsx
import { Link, useRouteError } from 'react-router'
import { ROUTES } from '../../config/routes.ts'
import { ErrorAlert } from '../../shared/components/ui/ErrorAlert.tsx'

export function RouteErrorPage() {
  const error = useRouteError()
  return (
    <main className="stack" style={{ padding: 'var(--space-5)' }}>
      <ErrorAlert error={error} title="The page failed to load." />
      <Link to={ROUTES.home}>Go to the home page</Link>
    </main>
  )
}
```

(The inline style is the only one: this page renders outside the layout.)

**New file: `src/app/routes/router.tsx`** (delete `src/app/routes/.gitkeep`) — each feature story adds its routes to `children`.

```tsx
import { createBrowserRouter } from 'react-router'
import { AppLayout } from '../layout/AppLayout.tsx'
import { HomePage } from '../pages/HomePage.tsx'
import { NotFoundPage } from '../pages/NotFoundPage.tsx'
import { RouteErrorPage } from '../pages/RouteErrorPage.tsx'

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <HomePage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
```

**File: `src/app/App.tsx`** — replace with:

```tsx
import { RouterProvider } from 'react-router'
import { AppProviders } from './providers/AppProviders.tsx'
import { router } from './routes/router.tsx'

function App() {
  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  )
}

export default App
```

### 11 — Docs

- **`src/README.md`** — add a section **"Shared building blocks"** listing: `shared/services/httpClient.ts` (`apiRequest`, `apiBlob`, `ApiError`, `toApiPath`), `shared/services/fetchAllPages.ts`, `shared/types/api.ts`, the UI components (`Field`, `FormError`, `ErrorAlert`, `LoadingState`, `EmptyState`, `Pagination`, `SearchInput`, `ConfirmDialog`, `Dialog`, `PageHeader`), `useListParams`, `applyServerErrors`, `formatDate` helpers, the global CSS classes (`btn*`, `input`, `field*`, `form`, `form-grid`, `form-actions`, `card`, `stack`, `toolbar`, `table*`, `badge*`, `alert*`, `details`, `dialog`, `muted`), and the patterns below:
  - **Server state:** one `services/<feature>Service.ts` with plain functions calling `apiRequest`; one `hooks/use<Feature>.ts` with the TanStack Query hooks; query keys as a `<feature>Keys` object in the hooks file; mutations invalidate the feature's keys.
  - **Forms:** react-hook-form + a zod schema in `<feature>/types/` or next to the form; `zodResolver`; server errors through `applyServerErrors` + `<FormError message={errors.root?.server?.message} />`.
  - **Lists:** `useListParams` + `SearchInput` + `Pagination`, query with `placeholderData: keepPreviousData`.
  - **Routes:** paths in `src/config/routes.ts`; routes in `src/app/routes/router.tsx`; sidebar items in `src/app/layout/navigation.ts`.
- **Root `README.md`** — mention the backend must run on port 3000 (proxy) and `VITE_API_BASE_URL` for non-proxied builds.

### 12 — Plans

- New [00-overview.md](00-overview.md) for `app-foundation`; add the row to [../00-index.md](../00-index.md).

---

## Edge Cases & Failure Modes

- **Backend not running:** fetch rejects → `ApiError(0, ['Cannot reach the server…'])`; pages show it through `ErrorAlert`. The proxy logs `ECONNREFUSED` in the Vite terminal.
- **Non-JSON error body** (proxy 502 HTML page): `toApiError` falls back to `response.statusText` / `'Request failed'`.
- **204 responses** (DELETE, change password) → `apiRequest` resolves `undefined`; call it as `apiRequest<void>`.
- **Aborted queries** (TanStack Query cancels on unmount / key change) → the `AbortError` is re-thrown untouched, not turned into a network error.
- **`retry`:** 4xx never retried; 5xx / network retried twice.
- **Empty query values:** `buildUrl` drops `''`, `null`, `undefined`, so `search: ''` does not send `?search=` (the backend rejects an empty search: 1–100 chars).
- **`page` in the URL** is clamped to ≥ 1; a page beyond `totalPages` returns an empty `data` from the API — the list shows its empty state and the pagination lets the user go back.
- **Field matching in `applyServerErrors`:** `"name must be longer than…"` → field `name`. Messages for nested paths (`inspection.results.0.status …`) or without a field prefix go to `root.server`. Pass every top-level field name in `fields`.
- **Dialogs:** pressing Esc fires `cancel` → `onCancel` / `onClose`; parent state stays the source of truth.
- **`react/only-export-components`:** `router.tsx` exports only `router` (no component), `navigation.ts` / `queryClient.ts` are `.ts`. Do not add non-component exports to component files.
- **Dark mode** follows the OS (`prefers-color-scheme`).

---

## Test Plan

No test runner (project rule for now). Manual smoke tests:

1. `npm run dev`, open `http://localhost:5173` → sidebar "Trip Management", empty header bar, home page heading, no console errors.
2. Open `http://localhost:5173/nope` → "This page does not exist." inside the layout.
3. With the backend running, open `http://localhost:5173/api/health` → `{"status":"ok"}` (proxy works).
4. In the browser console: `await import('/src/shared/services/httpClient.ts').then(m => m.apiRequest('/trips').catch(e => [e.name, e.status, e.messages]))` → `['ApiError', 401, ['Missing access token']]` (array/string message handling). Stop the backend and repeat → `status 0`, network message.
5. Toggle the OS dark mode → colours switch.

---

## Migration / Rollback

- No data. Rollback: revert the files listed above and `npm uninstall react-router @tanstack/react-query react-hook-form zod @hookform/resolvers`.

---

## Verification Steps

1. `npm run build` → no TypeScript errors.
2. `npm run lint` → no errors, no `only-export-components` warnings.
3. `grep -rnw "any" src` → no output.
4. Test Plan steps 1–5.
5. `find src -name .gitkeep` → only folders still empty (`src/features/.gitkeep`, `src/assets/.gitkeep`).

---

## Done Criteria

> Implemented 2026-11-07. Every code block was used exactly as written (no compile or lint fixes needed). Differences: none in code. Task 12: `00-overview.md` and the `00-index.md` row already existed, so only the overview status was changed. Verified headless: `npm run build` and `npm run lint` (0 warnings, 0 errors), no `any` in `.ts`/`.tsx`, only `src/features/.gitkeep` and `src/assets/.gitkeep` left; via `npm run dev` the app HTML is served, `/api/health` returns `{"status":"ok"}` and `/api/trips` returns the 401 `Missing access token` JSON through the proxy. Test Plan steps 1, 2, 4 (browser console), 5 (dark mode) were not run in a browser.

- [x] Dependencies installed at the versions in Task 1.
- [x] Vite proxies `/api`; `API_BASE_URL` and `ROUTES` exist in `src/config/`.
- [x] `httpClient.ts` provides `apiRequest`, `apiBlob`, `ApiError`, `configureHttpClient`, `toApiPath` as specified; `fetchAllPages.ts` exists.
- [x] `queryClient` and `AppProviders` wrap the router in `App.tsx`.
- [x] Router renders `AppLayout` with home, not-found and error pages.
- [x] Shared UI components, `useListParams`, `applyServerErrors`, date helpers and the global CSS exist as specified.
- [x] `src/README.md` documents the shared building blocks and patterns; root README mentions the proxy.
- [x] `app-foundation` overview and `00-index.md` updated.
- [x] `npm run build` and `npm run lint` pass; no `any`.

**STOP HERE. Report to the user and wait for confirmation before proceeding to Story 03.**
