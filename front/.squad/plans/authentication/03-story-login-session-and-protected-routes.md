# Story 03 — Login page, session handling, protected routes, user menu and change password

## Prerequisites

- **Story 02 completed:** [../app-foundation/02-story-app-shell-routing-api-client-and-shared-ui.md](../app-foundation/02-story-app-shell-routing-api-client-and-shared-ui.md) — `httpClient.ts` (`apiRequest`, `ApiError`, `configureHttpClient`), `queryClient`, `AppProviders`, `router.tsx`, `AppLayout`, `navigation.ts`, `ROUTES`, shared UI (`Field`, `FormError`, `ErrorAlert`, `LoadingState`, `PageHeader`), `applyServerErrors`, global CSS.
- Intake: [../../stories/authentication/login-session-and-protected-routes/intake.md](../../stories/authentication/login-session-and-protected-routes/intake.md).
- API contract: `backend/contracts/auth.md` (login, me, change-password, 401 messages, front-end notes) and `backend/contracts/users.md` (`User`).
- Backend running with the seeded admin (`admin@example.com` / `ChangeMe123!`) for the Test Plan.
- **Do not start until `npm run build` passes on the current `src/`.**

---

## Story Goal

1. `/login` signs the user in; the token and its expiry are kept in `localStorage`.
2. Every request sends `Authorization: Bearer <token>` (wired once in `main.tsx` through `configureHttpClient`).
3. A stored token loads the user with `GET /api/auth/me`; session-ending 401s and token expiry sign the user out.
4. Every route except `/login` requires a signed-in user (`RequireAuth`), with a redirect back after sign-in.
5. Header user menu (name, role, change password, sign out); `/account/password` page.
6. Admin-only navigation items are hidden from role `user`.

**Not in scope:** users management (Story 04), refresh tokens, remember-me, forgot password, server logout, role enforcement beyond hiding nav items, tests.

**Hard constraints for the executor:**

- Conventions from `src/README.md` and Story 02 (no semicolons, `.ts`/`.tsx` import extensions, `import type`, no `any`, named exports, `.tsx` exports only components).
- All authentication code lives in `src/features/authentication/`; other code imports it **only** from `src/features/authentication/index.ts`.
- `src/shared/` must not import from the feature. The token reaches the HTTP client only through `configureHttpClient`.
- No new dependencies.

---

## Context — Read These Files First

1. `backend/contracts/auth.md` — whole file: bodies, `LoginResponse`, the two session 401 messages, "Front-end notes".
2. `backend/contracts/users.md` — `User` type and password rules (8–72).
3. `src/shared/services/httpClient.ts` — `configureHttpClient({ getToken, onUnauthorized })`; `onUnauthorized` only fires for the two session messages when a token was sent.
4. `src/app/providers/AppProviders.tsx`, `src/app/providers/queryClient.ts` — `queryClient` singleton.
5. `src/app/routes/router.tsx` — the single layout route (Story 02).
6. `src/app/layout/AppLayout.tsx`, `src/app/layout/navigation.ts` (`NavItem.adminOnly`), `src/app/pages/HomePage.tsx`.
7. `src/config/routes.ts` — `ROUTES`.
8. `src/shared/utils/formErrors.ts` — `applyServerErrors`; `src/shared/components/ui/Field.tsx`, `FormError.tsx`.
9. `src/main.tsx` — entry point.

---

## Implementation tasks

### 1 — Shared user type

**New file: `src/shared/types/user.ts`** (used by authentication and users)

```ts
export type UserRole = 'admin' | 'user'

/** backend/contracts/users.md `User`. The password is never returned. */
export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// Backend rule for every password (bcrypt reads at most 72 bytes).
export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_MAX_LENGTH = 72
```

### 2 — Routes

**File: `src/config/routes.ts`**

```ts
export const ROUTES = {
  home: '/',
  login: '/login',
  changePassword: '/account/password',
}
```

### 3 — Feature types, schemas and service

**New file: `src/features/authentication/types/auth.ts`**

```ts
import type { User } from '../../../shared/types/user.ts'

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  accessToken: string
  tokenType: 'Bearer'
  /** Seconds until the token expires. */
  expiresIn: number
  user: User
}

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}
```

**New file: `src/features/authentication/types/authSchemas.ts`**

```ts
import { z } from 'zod'
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '../../../shared/types/user.ts'

export const loginSchema = z.object({
  email: z.string().trim().pipe(z.email('Enter a valid email address')),
  password: z.string().min(1, 'Enter your password').max(PASSWORD_MAX_LENGTH),
})

export type LoginFormValues = z.infer<typeof loginSchema>

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password').max(PASSWORD_MAX_LENGTH),
    newPassword: z
      .string()
      .min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters`)
      .max(PASSWORD_MAX_LENGTH, `Use at most ${PASSWORD_MAX_LENGTH} characters`),
    confirmPassword: z.string(),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    error: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>
```

**New file: `src/features/authentication/services/authService.ts`**

```ts
import { apiRequest } from '../../../shared/services/httpClient.ts'
import type { User } from '../../../shared/types/user.ts'
import type { ChangePasswordRequest, LoginRequest, LoginResponse } from '../types/auth.ts'

export function login(body: LoginRequest): Promise<LoginResponse> {
  return apiRequest<LoginResponse>('/auth/login', { method: 'POST', body })
}

export function fetchCurrentUser(signal?: AbortSignal): Promise<User> {
  return apiRequest<User>('/auth/me', { signal })
}

export function changePassword(body: ChangePasswordRequest): Promise<void> {
  return apiRequest<void>('/auth/change-password', { method: 'POST', body })
}
```

### 4 — Session store (token in localStorage, external store for React)

**New file: `src/features/authentication/utils/sessionStore.ts`**

```ts
const STORAGE_KEY = 'trip-management.session'
const MS_PER_SECOND = 1000

interface StoredSession {
  accessToken: string
  /** Epoch milliseconds. */
  expiresAt: number
}

const listeners = new Set<() => void>()

function readSession(): StoredSession | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return null
    }
    const session = JSON.parse(raw) as Partial<StoredSession>
    if (typeof session.accessToken !== 'string' || typeof session.expiresAt !== 'number') {
      return null
    }
    return { accessToken: session.accessToken, expiresAt: session.expiresAt }
  } catch {
    return null
  }
}

function notify(): void {
  for (const listener of listeners) {
    listener()
  }
}

/** The stored token, or null when there is none or it has expired. A string, so it is a stable snapshot. */
export function readAccessToken(): string | null {
  const session = readSession()
  return session && session.expiresAt > Date.now() ? session.accessToken : null
}

export function readExpiresAt(): number | null {
  return readSession()?.expiresAt ?? null
}

export function saveSession(accessToken: string, expiresInSeconds: number): void {
  const session: StoredSession = {
    accessToken,
    expiresAt: Date.now() + expiresInSeconds * MS_PER_SECOND,
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  notify()
}

export function clearSession(): void {
  window.localStorage.removeItem(STORAGE_KEY)
  notify()
}

/** For useSyncExternalStore. Also follows sign-in / sign-out in other tabs. */
export function subscribeToSession(listener: () => void): () => void {
  listeners.add(listener)
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) {
      listener()
    }
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}
```

### 5 — Auth context, provider and guard

**New file: `src/features/authentication/hooks/useAuth.ts`**

```ts
import { createContext, useContext } from 'react'
import type { User } from '../../../shared/types/user.ts'
import type { LoginRequest } from '../types/auth.ts'

export type AuthStatus = 'anonymous' | 'loading' | 'authenticated' | 'error'

export interface AuthContextValue {
  status: AuthStatus
  user: User | null
  /** Why the current user could not be loaded (status "error"). */
  error: unknown
  retry: () => void
  login: (body: LoginRequest) => Promise<void>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

/** Query key of GET /auth/me. Invalidate it after changing the signed-in user. */
export const CURRENT_USER_KEY = ['auth', 'me'] as const

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)
  if (!value) {
    throw new Error('useAuth must be used inside <AuthProvider>')
  }
  return value
}
```

**New file: `src/features/authentication/components/AuthProvider.tsx`**

```tsx
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useSyncExternalStore, type ReactNode } from 'react'
import { fetchCurrentUser, login as loginRequest } from '../services/authService.ts'
import type { LoginRequest } from '../types/auth.ts'
import { AuthContext, CURRENT_USER_KEY, type AuthStatus } from '../hooks/useAuth.ts'
import {
  clearSession,
  readAccessToken,
  readExpiresAt,
  saveSession,
  subscribeToSession,
} from '../utils/sessionStore.ts'

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const queryClient = useQueryClient()
  const token = useSyncExternalStore(subscribeToSession, readAccessToken)
  const currentUser = useQuery({
    queryKey: CURRENT_USER_KEY,
    queryFn: ({ signal }) => fetchCurrentUser(signal),
    enabled: token !== null,
    staleTime: Infinity,
  })

  function logout(): void {
    clearSession()
    queryClient.clear()
  }

  // There is no refresh token: sign out when the token expires.
  useEffect(() => {
    const expiresAt = readExpiresAt()
    if (!token || !expiresAt) {
      return
    }
    const timer = window.setTimeout(() => {
      clearSession()
      queryClient.clear()
    }, expiresAt - Date.now())
    return () => window.clearTimeout(timer)
  }, [token, queryClient])

  async function login(body: LoginRequest): Promise<void> {
    const response = await loginRequest(body)
    // Seed the user first so the session flip does not trigger a /auth/me request.
    queryClient.setQueryData(CURRENT_USER_KEY, response.user)
    saveSession(response.accessToken, response.expiresIn)
  }

  let status: AuthStatus = 'loading'
  if (!token) {
    status = 'anonymous'
  } else if (currentUser.data) {
    status = 'authenticated'
  } else if (currentUser.isError) {
    status = 'error'
  }

  return (
    <AuthContext
      value={{
        status,
        user: currentUser.data ?? null,
        error: currentUser.error,
        retry: () => void currentUser.refetch(),
        login,
        logout,
      }}
    >
      {children}
    </AuthContext>
  )
}
```

**New file: `src/features/authentication/components/RequireAuth.tsx`**

```tsx
import { Navigate, Outlet, useLocation } from 'react-router'
import { ROUTES } from '../../../config/routes.ts'
import { ErrorAlert } from '../../../shared/components/ui/ErrorAlert.tsx'
import { LoadingState } from '../../../shared/components/ui/LoadingState.tsx'
import { useAuth } from '../hooks/useAuth.ts'

/** Layout route: renders its children only for a signed-in user. */
export function RequireAuth() {
  const { status, error, retry } = useAuth()
  const location = useLocation()

  if (status === 'anonymous') {
    return (
      <Navigate
        to={ROUTES.login}
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    )
  }
  if (status === 'loading') {
    return (
      <main className="page-center">
        <LoadingState label="Loading your session…" />
      </main>
    )
  }
  if (status === 'error') {
    return (
      <main className="page-center">
        <div className="stack">
          <ErrorAlert error={error} title="Could not load your account." />
          <button type="button" className="btn btn-primary" onClick={retry}>
            Try again
          </button>
        </div>
      </main>
    )
  }
  return <Outlet />
}
```

### 6 — User menu

**New file: `src/features/authentication/components/UserMenu.module.css`**

```css
.menu {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}
```

**New file: `src/features/authentication/components/UserMenu.tsx`**

```tsx
import { Link } from 'react-router'
import { ROUTES } from '../../../config/routes.ts'
import { useAuth } from '../hooks/useAuth.ts'
import styles from './UserMenu.module.css'

export function UserMenu() {
  const { user, logout } = useAuth()
  if (!user) {
    return null
  }
  return (
    <div className={styles.menu}>
      <span>
        {user.firstName} {user.lastName}
      </span>
      <span className="badge">{user.role}</span>
      <Link to={ROUTES.changePassword} className="btn btn-secondary btn-small">
        Change password
      </Link>
      <button type="button" className="btn btn-secondary btn-small" onClick={logout}>
        Sign out
      </button>
    </div>
  )
}
```

### 7 — Pages

**New file: `src/features/authentication/pages/LoginPage.module.css`**

```css
.card {
  width: min(400px, 100%);
}
```

**New file: `src/features/authentication/pages/LoginPage.tsx`**

```tsx
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Navigate, useLocation } from 'react-router'
import { ROUTES } from '../../../config/routes.ts'
import { Field } from '../../../shared/components/ui/Field.tsx'
import { FormError } from '../../../shared/components/ui/FormError.tsx'
import { applyServerErrors } from '../../../shared/utils/formErrors.ts'
import { useAuth } from '../hooks/useAuth.ts'
import { loginSchema, type LoginFormValues } from '../types/authSchemas.ts'
import styles from './LoginPage.module.css'

interface LoginLocationState {
  from?: string
}

export function LoginPage() {
  const { status, login } = useAuth()
  const location = useLocation()
  const from = (location.state as LoginLocationState | null)?.from ?? ROUTES.home
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  // Also runs right after a successful login: the session flips to "authenticated".
  if (status === 'authenticated') {
    return <Navigate to={from} replace />
  }

  async function onSubmit(values: LoginFormValues): Promise<void> {
    try {
      await login(values)
    } catch (error) {
      applyServerErrors(error, setError, ['email', 'password'])
    }
  }

  return (
    <main className="page-center">
      <form className={`card form ${styles.card}`} onSubmit={handleSubmit(onSubmit)} noValidate>
        <h1>Sign in</h1>
        <FormError message={errors.root?.server?.message} />
        <Field label="Email" htmlFor="email" error={errors.email?.message}>
          <input
            id="email"
            type="email"
            autoComplete="username"
            className="input"
            aria-invalid={Boolean(errors.email)}
            {...register('email')}
          />
        </Field>
        <Field label="Password" htmlFor="password" error={errors.password?.message}>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            className="input"
            aria-invalid={Boolean(errors.password)}
            {...register('password')}
          />
        </Field>
        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  )
}
```

**New file: `src/features/authentication/pages/ChangePasswordPage.tsx`**

```tsx
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { PageHeader } from '../../../shared/components/layout/PageHeader.tsx'
import { Field } from '../../../shared/components/ui/Field.tsx'
import { FormError } from '../../../shared/components/ui/FormError.tsx'
import { ApiError } from '../../../shared/services/httpClient.ts'
import { applyServerErrors } from '../../../shared/utils/formErrors.ts'
import { changePassword } from '../services/authService.ts'
import { changePasswordSchema, type ChangePasswordFormValues } from '../types/authSchemas.ts'

const EMPTY_FORM: ChangePasswordFormValues = { currentPassword: '', newPassword: '', confirmPassword: '' }

export function ChangePasswordPage() {
  const [saved, setSaved] = useState(false)
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: EMPTY_FORM,
  })

  async function onSubmit(values: ChangePasswordFormValues): Promise<void> {
    setSaved(false)
    try {
      await changePassword({ currentPassword: values.currentPassword, newPassword: values.newPassword })
      reset(EMPTY_FORM)
      setSaved(true)
    } catch (error) {
      // 401 "Current password is incorrect" is a form error, not a session error.
      if (error instanceof ApiError && error.status === 401) {
        setError('currentPassword', { type: 'server', message: error.messages[0] })
        return
      }
      applyServerErrors(error, setError, ['currentPassword', 'newPassword'])
    }
  }

  return (
    <>
      <PageHeader title="Change password" />
      <form className="card form" onSubmit={handleSubmit(onSubmit)} noValidate>
        {saved && (
          <div className="alert alert-success" role="status">
            Password changed. Other devices stay signed in until their session expires.
          </div>
        )}
        <FormError message={errors.root?.server?.message} />
        <Field label="Current password" htmlFor="currentPassword" error={errors.currentPassword?.message}>
          <input
            id="currentPassword"
            type="password"
            autoComplete="current-password"
            className="input"
            aria-invalid={Boolean(errors.currentPassword)}
            {...register('currentPassword')}
          />
        </Field>
        <Field label="New password" htmlFor="newPassword" error={errors.newPassword?.message} hint="8–72 characters">
          <input
            id="newPassword"
            type="password"
            autoComplete="new-password"
            className="input"
            aria-invalid={Boolean(errors.newPassword)}
            {...register('newPassword')}
          />
        </Field>
        <Field label="Confirm new password" htmlFor="confirmPassword" error={errors.confirmPassword?.message}>
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            className="input"
            aria-invalid={Boolean(errors.confirmPassword)}
            {...register('confirmPassword')}
          />
        </Field>
        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Change password'}
          </button>
        </div>
      </form>
    </>
  )
}
```

### 8 — Public API of the feature

**New file: `src/features/authentication/index.ts`** (delete `src/features/.gitkeep`)

```ts
export { AuthProvider } from './components/AuthProvider.tsx'
export { RequireAuth } from './components/RequireAuth.tsx'
export { UserMenu } from './components/UserMenu.tsx'
export { CURRENT_USER_KEY, useAuth } from './hooks/useAuth.ts'
export { ChangePasswordPage } from './pages/ChangePasswordPage.tsx'
export { LoginPage } from './pages/LoginPage.tsx'
export { clearSession, readAccessToken } from './utils/sessionStore.ts'
```

### 9 — Wire it into the app

**New file: `src/app/providers/connectSessionToApi.ts`**

```ts
import { clearSession, readAccessToken } from '../../features/authentication/index.ts'
import { configureHttpClient } from '../../shared/services/httpClient.ts'
import { queryClient } from './queryClient.ts'

/** Every request carries the stored token; a session 401 signs the user out. Call once before rendering. */
export function connectSessionToApi(): void {
  configureHttpClient({
    getToken: readAccessToken,
    onUnauthorized: () => {
      clearSession()
      queryClient.clear()
    },
  })
}
```

**File: `src/main.tsx`** — call it before `createRoot`:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './shared/styles/index.css'
import App from './app/App.tsx'
import { connectSessionToApi } from './app/providers/connectSessionToApi.ts'

connectSessionToApi()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

**File: `src/app/providers/AppProviders.tsx`** — wrap children in `AuthProvider` (inside the QueryClientProvider):

```tsx
import { QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { AuthProvider } from '../../features/authentication/index.ts'
import { queryClient } from './queryClient.ts'

interface AppProvidersProps {
  children: ReactNode
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  )
}
```

**New file: `src/app/layout/useNavItems.ts`** — admin-only items hidden from role `user` (the API does not enforce roles; this only tidies the UI).

```ts
import { useAuth } from '../../features/authentication/index.ts'
import { NAV_ITEMS, type NavItem } from './navigation.ts'

export function useNavItems(): NavItem[] {
  const { user } = useAuth()
  return NAV_ITEMS.filter((item) => !item.adminOnly || user?.role === 'admin')
}
```

**File: `src/app/layout/AppLayout.tsx`** — use `useNavItems()` instead of `NAV_ITEMS`, and render `<UserMenu />` inside the header:

```tsx
import { Link, NavLink, Outlet } from 'react-router'
import { ROUTES } from '../../config/routes.ts'
import { UserMenu } from '../../features/authentication/index.ts'
import styles from './AppLayout.module.css'
import { useNavItems } from './useNavItems.ts'

export function AppLayout() {
  const navItems = useNavItems()
  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <Link to={ROUTES.home} className={styles.brand}>
          Trip Management
        </Link>
        <nav className={styles.nav} aria-label="Main">
          {navItems.map((item) => (
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
        <header className={styles.header}>
          <UserMenu />
        </header>
        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
```

**File: `src/app/pages/HomePage.tsx`** — replace `NAV_ITEMS` with `useNavItems()` (same import change).

**File: `src/app/routes/router.tsx`**

```tsx
import { createBrowserRouter } from 'react-router'
import { ROUTES } from '../../config/routes.ts'
import { ChangePasswordPage, LoginPage, RequireAuth } from '../../features/authentication/index.ts'
import { AppLayout } from '../layout/AppLayout.tsx'
import { HomePage } from '../pages/HomePage.tsx'
import { NotFoundPage } from '../pages/NotFoundPage.tsx'
import { RouteErrorPage } from '../pages/RouteErrorPage.tsx'

export const router = createBrowserRouter([
  { path: ROUTES.login, element: <LoginPage />, errorElement: <RouteErrorPage /> },
  {
    element: <RequireAuth />,
    errorElement: <RouteErrorPage />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <HomePage /> },
          { path: ROUTES.changePassword, element: <ChangePasswordPage /> },
          // Feature routes go here.
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
])
```

**File: `src/shared/styles/index.css`** — add after `.muted`:

```css
.page-center {
  display: grid;
  place-items: center;
  min-height: 100vh;
  padding: var(--space-4);
}
```

### 10 — Docs and plans

- `src/README.md` "Shared building blocks": add `src/shared/types/user.ts` and a short **Authentication** note: `useAuth()` from `features/authentication/index.ts` gives `user` / `status` / `logout`; every route under `RequireAuth`; invalidate `CURRENT_USER_KEY` after editing the signed-in user.
- New [00-overview.md](00-overview.md) for `authentication`; row in [../00-index.md](../00-index.md).

---

## Edge Cases & Failure Modes

- **Stored token already expired** at start-up → `readAccessToken` returns `null` → anonymous, no request.
- **Stored token revoked** (user deleted / deactivated, `JWT_SECRET` rotated) → `/auth/me` 401 `Invalid or expired access token` → `onUnauthorized` clears the session → `/login`.
- **Wrong credentials** → 401 `Invalid email or password` (no field prefix) → shown by `FormError`. A stale token sent with the login request does not sign anyone out (message is not a session message).
- **Change password 401** → field error on `currentPassword`; the session stays. Other devices keep their tokens until expiry (message on success).
- **Backend down at start-up with a token** → `status: 'error'` → "Could not load your account." + Try again (not a sign-out).
- **Token expiry while the app is open** → timer clears the session; `RequireAuth` redirects to `/login` with `from` = current page.
- **Other tab signs out / in** → `storage` event → this tab follows.
- **Corrupt localStorage value** → treated as no session.
- **`setTimeout` limit** (~24.8 days) is above the backend maximum (7 days), so the timer is safe.
- **Sign out** clears all cached server data, so the next user never sees the previous user's lists.
- **`from` state** only keeps the in-app path; `/login` with no state goes home.
- **Roles:** a `user` can still open admin URLs directly; the API allows it. Hiding is cosmetic until the backend enforces roles.

---

## Test Plan

No test runner. Manual, backend running, `npm run dev`:

1. Fresh browser → `http://localhost:5173/` redirects to `/login`.
2. Wrong password → "Invalid email or password"; bad email format → field error, no request (Network tab).
3. `admin@example.com` / `ChangeMe123!` → home; header shows "System Admin", badge `admin`.
4. Reload → still signed in; Network shows `GET /api/auth/me` with `Authorization: Bearer …`.
5. Open `http://localhost:5173/nope` while signed out → `/login`; sign in → back at `/nope` (not-found page).
6. Sign out → `/login`; Back button does not show protected content.
7. Change password: wrong current → error under "Current password"; mismatch → "Passwords do not match" with no request; correct → success message; sign out / in with the new password; change it back to `ChangeMe123!`.
8. Session end: in DevTools → Application → Local Storage, set `expiresAt` in `trip-management.session` to a past time and reload → `/login`. Then sign in, edit the token string to garbage, navigate to home → any API call returns 401 → `/login`.
9. Two tabs: sign out in one → the other goes to `/login`.

---

## Migration / Rollback

- No data. Rollback: revert the files above; `localStorage` key `trip-management.session` can be left.

---

## Verification Steps

1. `npm run build` → no errors. 2. `npm run lint` → no errors. 3. `grep -rnw "any" src --include=*.ts --include=*.tsx` → none (without `--include` it matches the "Never use `any`" rule in `src/README.md`).
4. `grep -rn "features/authentication/" src --include=*.ts --include=*.tsx | grep -v "^src/features/authentication/" | grep -v "index.ts'"` → no output (only the public API is used outside the feature).
5. `grep -rn "features/" src/shared` → no output.
6. Test Plan steps 1–9.

---

## Done Criteria

> Implemented 2026-11-07. All code blocks were used as written; `npm run build` and `npm run lint` (oxlint, 0 diagnostics) pass, the `any` and import-boundary greps return nothing, and through the Vite proxy `POST /api/auth/login` (admin) returns a Bearer token that `GET /api/auth/me` accepts. Test Plan steps 1–9 are browser checks and were not run. Differences: Verification step 3 grep restricted to `*.ts`/`*.tsx` (the old command matched `src/README.md`); `src/README.md` also lists `page-center` among the global CSS classes; `00-overview.md` and the `00-index.md` row already existed, so only the overview status changed.

- [x] `User` type and password limits in `src/shared/types/user.ts`.
- [x] Login page, session store, `AuthProvider`, `RequireAuth`, `UserMenu`, change-password page in `src/features/authentication/`, exported from its `index.ts`.
- [x] `connectSessionToApi()` wires the token and the session 401 handler before render.
- [ ] Every route except `/login` is behind `RequireAuth`; redirect back after sign-in works. *(code in place; browser check — Test Plan — not run yet)*
- [ ] Token expiry and session 401s sign out; other tabs follow. *(code in place; browser check — Test Plan — not run yet)*
- [ ] Admin-only nav items hidden from role `user`. *(code in place; browser check — Test Plan — not run yet)*
- [x] `src/README.md`, `authentication` overview and `00-index.md` updated.
- [x] `npm run build` and `npm run lint` pass; no `any`.

**STOP HERE. Report to the user and wait for confirmation before proceeding to Story 04.**
