# Story 04 — Users management pages: list, create, edit (with password reset) and delete

## Prerequisites

- **Story 02 completed:** [../app-foundation/02-story-app-shell-routing-api-client-and-shared-ui.md](../app-foundation/02-story-app-shell-routing-api-client-and-shared-ui.md) — `apiRequest`, `ApiError`, `queryClient`, router children, `NAV_ITEMS`, `ROUTES`, shared UI (`PageHeader`, `Field`, `FormError`, `ErrorAlert`, `LoadingState`, `EmptyState`, `SearchInput`, `ConfirmDialog`), `useListParams`, `applyServerErrors`, `formatDateTime`, global CSS.
- **Story 03 completed:** [../authentication/03-story-login-session-and-protected-routes.md](../authentication/03-story-login-session-and-protected-routes.md) — `useAuth`, `CURRENT_USER_KEY` from `src/features/authentication/index.ts`; `User`, `UserRole`, `PASSWORD_MIN_LENGTH`, `PASSWORD_MAX_LENGTH` in `src/shared/types/user.ts`; `NavItem.adminOnly` filtered by `useNavItems`.
- Intake: [../../stories/users/users-management-pages/intake.md](../../stories/users/users-management-pages/intake.md).
- API contract: `backend/contracts/users.md` (covers backend users module and backend Story 12 passwords).
- Backend running with the seeded admin for the Test Plan.
- **Do not start until `npm run build` passes on the current `src/`.**

---

## Story Goal

1. `/users` — all users in a table, filtered in the browser by name / email (the API is not paginated and has no search).
2. `/users/new` — create a user with a password.
3. `/users/:id/edit` — edit names, email, role, active; optional password reset (empty = keep).
4. Delete with confirmation; never offered for the signed-in user.
5. Sidebar item **Users** (`adminOnly`).

**Not in scope:** pagination, server search, role enforcement, invitations, tests.

**Hard constraints for the executor:**

- Conventions of `src/README.md` / Stories 02–03: no semicolons, `.ts`/`.tsx` import extensions, `import type`, no `any`, no enums, named exports, `.tsx` files export only components.
- All code in `src/features/users/`; other code imports it only through `src/features/users/index.ts`. Use the authentication feature only through `src/features/authentication/index.ts`.
- API calls only in `services/userService.ts`; query and mutation hooks only in `hooks/useUsers.ts`.
- Every field rule and message comes from `backend/contracts/users.md`. **Do not** send `isActive` on create (the API rejects unknown properties with 400).
- No new dependencies.

---

## Context — Read These Files First

1. `backend/contracts/users.md` — whole file (types, rules, error messages, notes).
2. `src/shared/types/user.ts` — `User`, `UserRole`, password limits.
3. `src/features/authentication/index.ts` — `useAuth`, `CURRENT_USER_KEY`.
4. `src/features/authentication/pages/ChangePasswordPage.tsx` — form pattern (react-hook-form + zod + `applyServerErrors` + `FormError`).
5. `src/app/routes/router.tsx` — children of `AppLayout` (feature routes go before the `'*'` route).
6. `src/app/layout/navigation.ts` — `NAV_ITEMS`, `NavItem.adminOnly`.
7. `src/config/routes.ts` — `ROUTES`.
8. `src/shared/hooks/useListParams.ts`, `src/shared/components/ui/SearchInput.tsx`, `ConfirmDialog.tsx`.
9. `src/shared/styles/index.css` — classes `table`, `table-wrap`, `table-actions`, `badge*`, `toolbar`, `form`, `form-grid`, `form-actions`, `checkbox`, `card`.

---

## Implementation tasks

### 1 — Routes and navigation

**File: `src/config/routes.ts`** — add the users keys:

```ts
export const ROUTES = {
  home: '/',
  login: '/login',
  changePassword: '/account/password',
  users: '/users',
  newUser: '/users/new',
  editUser: (id: string): string => `/users/${id}/edit`,
}
```

(Keep any keys other stories already added.)

**File: `src/app/layout/navigation.ts`** — add the item. Final sidebar order across all stories is Trips, Drivers, Vehicles, Companies, Countries, Inspection checklist, **Users** — Users is always last:

```ts
import { ROUTES } from '../../config/routes.ts'

// ...NavItem interface unchanged

export const NAV_ITEMS: NavItem[] = [
  // ...items added by other stories stay before this one
  { label: 'Users', to: ROUTES.users, adminOnly: true },
]
```

### 2 — Types and form schema

**New file: `src/features/users/types/users.ts`**

```ts
import type { UserRole } from '../../../shared/types/user.ts'

export interface CreateUserRequest {
  email: string
  firstName: string
  lastName: string
  password: string
  role?: UserRole
}

export interface UpdateUserRequest {
  email?: string
  firstName?: string
  lastName?: string
  password?: string
  role?: UserRole
  isActive?: boolean
}
```

**New file: `src/features/users/types/userSchemas.ts`** — one value shape for both forms; only the password rule differs.

```ts
import { z } from 'zod'
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '../../../shared/types/user.ts'

const EMAIL_MAX_LENGTH = 255
const NAME_MAX_LENGTH = 100

const userFields = {
  email: z
    .string()
    .trim()
    .max(EMAIL_MAX_LENGTH, `Use at most ${EMAIL_MAX_LENGTH} characters`)
    .pipe(z.email('Enter a valid email address')),
  firstName: z
    .string()
    .trim()
    .min(1, 'Enter a first name')
    .max(NAME_MAX_LENGTH, `Use at most ${NAME_MAX_LENGTH} characters`),
  lastName: z
    .string()
    .trim()
    .min(1, 'Enter a last name')
    .max(NAME_MAX_LENGTH, `Use at most ${NAME_MAX_LENGTH} characters`),
  role: z.enum(['admin', 'user']),
  isActive: z.boolean(),
}

export const createUserSchema = z.object({
  ...userFields,
  password: z
    .string()
    .min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters`)
    .max(PASSWORD_MAX_LENGTH, `Use at most ${PASSWORD_MAX_LENGTH} characters`),
})

// Empty = keep the current password.
export const editUserSchema = z.object({
  ...userFields,
  password: z
    .string()
    .max(PASSWORD_MAX_LENGTH, `Use at most ${PASSWORD_MAX_LENGTH} characters`)
    .refine((value) => value === '' || value.length >= PASSWORD_MIN_LENGTH, {
      error: `Use at least ${PASSWORD_MIN_LENGTH} characters, or leave it empty`,
    }),
})

export type UserFormValues = z.infer<typeof createUserSchema>
```

(In zod 4 `.refine` keeps the `ZodString` type, so both schemas have the same TypeScript type and either can be passed to `zodResolver`.)

### 3 — Service

**New file: `src/features/users/services/userService.ts`**

```ts
import { apiRequest } from '../../../shared/services/httpClient.ts'
import type { User } from '../../../shared/types/user.ts'
import type { CreateUserRequest, UpdateUserRequest } from '../types/users.ts'

export function fetchUsers(signal?: AbortSignal): Promise<User[]> {
  return apiRequest<User[]>('/users', { signal })
}

export function fetchUser(id: string, signal?: AbortSignal): Promise<User> {
  return apiRequest<User>(`/users/${id}`, { signal })
}

export function createUser(body: CreateUserRequest): Promise<User> {
  return apiRequest<User>('/users', { method: 'POST', body })
}

export function updateUser(id: string, body: UpdateUserRequest): Promise<User> {
  return apiRequest<User>(`/users/${id}`, { method: 'PATCH', body })
}

export function deleteUser(id: string): Promise<void> {
  return apiRequest<void>(`/users/${id}`, { method: 'DELETE' })
}
```

### 4 — Query hooks

**New file: `src/features/users/hooks/useUsers.ts`**

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { User } from '../../../shared/types/user.ts'
import { CURRENT_USER_KEY, useAuth } from '../../authentication/index.ts'
import { createUser, deleteUser, fetchUser, fetchUsers, updateUser } from '../services/userService.ts'
import type { UpdateUserRequest } from '../types/users.ts'

export const usersKeys = {
  all: ['users'] as const,
  list: () => [...usersKeys.all, 'list'] as const,
  detail: (id: string) => [...usersKeys.all, 'detail', id] as const,
}

export function useUsers() {
  return useQuery({
    queryKey: usersKeys.list(),
    queryFn: ({ signal }) => fetchUsers(signal),
  })
}

export function useUser(id: string) {
  return useQuery({
    queryKey: usersKeys.detail(id),
    queryFn: ({ signal }) => fetchUser(id, signal),
  })
}

export function useCreateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: usersKeys.all }),
  })
}

interface UpdateUserVariables {
  id: string
  body: UpdateUserRequest
}

export function useUpdateUser() {
  const queryClient = useQueryClient()
  const { user: currentUser } = useAuth()
  return useMutation({
    mutationFn: ({ id, body }: UpdateUserVariables) => updateUser(id, body),
    onSuccess: (user: User) => {
      queryClient.setQueryData(usersKeys.detail(user.id), user)
      // The header user menu reads the signed-in user from this key.
      if (user.id === currentUser?.id) {
        queryClient.setQueryData(CURRENT_USER_KEY, user)
      }
      return queryClient.invalidateQueries({ queryKey: usersKeys.list() })
    },
  })
}

export function useDeleteUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteUser,
    onSuccess: (_result, id) => {
      queryClient.removeQueries({ queryKey: usersKeys.detail(id) })
      return queryClient.invalidateQueries({ queryKey: usersKeys.list() })
    },
  })
}
```

### 5 — Form component

**New file: `src/features/users/components/UserForm.tsx`** — shared by create and edit. The page decides what to send; the form only collects and validates.

```tsx
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router'
import { ROUTES } from '../../../config/routes.ts'
import { Field } from '../../../shared/components/ui/Field.tsx'
import { FormError } from '../../../shared/components/ui/FormError.tsx'
import { applyServerErrors } from '../../../shared/utils/formErrors.ts'
import { createUserSchema, editUserSchema, type UserFormValues } from '../types/userSchemas.ts'

const USER_FORM_FIELDS = ['email', 'firstName', 'lastName', 'role', 'isActive', 'password'] as const

interface UserFormProps {
  mode: 'create' | 'edit'
  defaultValues: UserFormValues
  /** Editing the signed-in user: role and active are read-only. */
  isSelf?: boolean
  submitLabel: string
  /** Rejects with the API error; the form maps it to fields. */
  onSubmit: (values: UserFormValues) => Promise<void>
}

export function UserForm({ mode, defaultValues, isSelf = false, submitLabel, onSubmit }: UserFormProps) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<UserFormValues>({
    resolver: zodResolver(mode === 'create' ? createUserSchema : editUserSchema),
    defaultValues,
  })

  async function submit(values: UserFormValues): Promise<void> {
    try {
      await onSubmit(values)
    } catch (error) {
      applyServerErrors(error, setError, USER_FORM_FIELDS)
    }
  }

  return (
    <form className="card form" onSubmit={handleSubmit(submit)} noValidate>
      <FormError message={errors.root?.server?.message} />
      <div className="form-grid">
        <Field label="First name" htmlFor="firstName" error={errors.firstName?.message}>
          <input id="firstName" className="input" aria-invalid={Boolean(errors.firstName)} {...register('firstName')} />
        </Field>
        <Field label="Last name" htmlFor="lastName" error={errors.lastName?.message}>
          <input id="lastName" className="input" aria-invalid={Boolean(errors.lastName)} {...register('lastName')} />
        </Field>
      </div>
      <Field label="Email" htmlFor="email" error={errors.email?.message}>
        <input
          id="email"
          type="email"
          autoComplete="off"
          className="input"
          aria-invalid={Boolean(errors.email)}
          {...register('email')}
        />
      </Field>
      <Field
        label="Role"
        htmlFor="role"
        error={errors.role?.message}
        hint={isSelf ? 'You cannot change your own role.' : 'Admins see user management.'}
      >
        <select id="role" className="input" disabled={isSelf} {...register('role')}>
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
      </Field>
      {mode === 'edit' && (
        <div className="field">
          <label className="checkbox">
            <input type="checkbox" disabled={isSelf} {...register('isActive')} />
            Active
          </label>
          <p className="field-hint">
            {isSelf
              ? 'You cannot deactivate yourself.'
              : 'Inactive users cannot sign in and are signed out on their next request.'}
          </p>
        </div>
      )}
      <Field
        label={mode === 'create' ? 'Password' : 'New password'}
        htmlFor="password"
        error={errors.password?.message}
        hint={mode === 'create' ? '8–72 characters' : 'Leave empty to keep the current password. 8–72 characters.'}
      >
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          className="input"
          aria-invalid={Boolean(errors.password)}
          {...register('password')}
        />
      </Field>
      <div className="form-actions">
        <Link to={ROUTES.users} className="btn btn-secondary">
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

### 6 — Pages

**New file: `src/features/users/pages/UsersPage.tsx`**

```tsx
import { useState } from 'react'
import { Link } from 'react-router'
import { ROUTES } from '../../../config/routes.ts'
import { PageHeader } from '../../../shared/components/layout/PageHeader.tsx'
import { ConfirmDialog } from '../../../shared/components/ui/ConfirmDialog.tsx'
import { EmptyState } from '../../../shared/components/ui/EmptyState.tsx'
import { ErrorAlert } from '../../../shared/components/ui/ErrorAlert.tsx'
import { LoadingState } from '../../../shared/components/ui/LoadingState.tsx'
import { SearchInput } from '../../../shared/components/ui/SearchInput.tsx'
import { useListParams } from '../../../shared/hooks/useListParams.ts'
import type { User } from '../../../shared/types/user.ts'
import { formatDateTime } from '../../../shared/utils/formatDate.ts'
import { useAuth } from '../../authentication/index.ts'
import { useDeleteUser, useUsers } from '../hooks/useUsers.ts'

// The API returns every user (no pagination, no search), so filter in the browser.
function filterUsers(users: User[], search: string): User[] {
  const term = search.toLowerCase()
  if (!term) {
    return users
  }
  return users.filter((user) =>
    `${user.firstName} ${user.lastName} ${user.email}`.toLowerCase().includes(term),
  )
}

export function UsersPage() {
  const { search, setSearch } = useListParams()
  const { user: currentUser } = useAuth()
  const users = useUsers()
  const deleteUser = useDeleteUser()
  const [userToDelete, setUserToDelete] = useState<User | null>(null)

  function closeDeleteDialog(): void {
    setUserToDelete(null)
    deleteUser.reset()
  }

  function confirmDelete(): void {
    if (!userToDelete) {
      return
    }
    deleteUser.mutate(userToDelete.id, { onSuccess: closeDeleteDialog })
  }

  const visibleUsers = users.data ? filterUsers(users.data, search) : []

  return (
    <>
      <PageHeader
        title="Users"
        description="People who can sign in."
        actions={
          <Link to={ROUTES.newUser} className="btn btn-primary">
            New user
          </Link>
        }
      />
      <div className="toolbar">
        <SearchInput defaultValue={search} onSearch={setSearch} placeholder="Search by name or email" />
      </div>
      {users.isPending && <LoadingState />}
      <ErrorAlert error={users.error} />
      {users.data && visibleUsers.length === 0 && (
        <EmptyState message={search ? 'No users match your search.' : 'No users yet.'} />
      )}
      {visibleUsers.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Created</th>
                <th>
                  <span className="muted">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visibleUsers.map((user) => (
                <tr key={user.id}>
                  <td>
                    {user.firstName} {user.lastName}
                    {user.id === currentUser?.id && <span className="muted"> (you)</span>}
                  </td>
                  <td>{user.email}</td>
                  <td>
                    <span className="badge">{user.role}</span>
                  </td>
                  <td>
                    <span className={user.isActive ? 'badge badge-success' : 'badge badge-danger'}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>{formatDateTime(user.createdAt)}</td>
                  <td>
                    <div className="table-actions">
                      <Link to={ROUTES.editUser(user.id)} className="btn btn-secondary btn-small">
                        Edit
                      </Link>
                      {user.id !== currentUser?.id && (
                        <button
                          type="button"
                          className="btn btn-danger btn-small"
                          onClick={() => setUserToDelete(user)}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <ConfirmDialog
        open={userToDelete !== null}
        title="Delete user"
        pending={deleteUser.isPending}
        error={deleteUser.error}
        onConfirm={confirmDelete}
        onCancel={closeDeleteDialog}
      >
        <p>
          Delete {userToDelete?.firstName} {userToDelete?.lastName} ({userToDelete?.email})? Users are deleted
          permanently and are signed out on their next request.
        </p>
      </ConfirmDialog>
    </>
  )
}
```

**New file: `src/features/users/pages/NewUserPage.tsx`**

```tsx
import { useNavigate } from 'react-router'
import { ROUTES } from '../../../config/routes.ts'
import { PageHeader } from '../../../shared/components/layout/PageHeader.tsx'
import { UserForm } from '../components/UserForm.tsx'
import { useCreateUser } from '../hooks/useUsers.ts'
import type { UserFormValues } from '../types/userSchemas.ts'

const EMPTY_USER: UserFormValues = {
  email: '',
  firstName: '',
  lastName: '',
  role: 'user',
  isActive: true,
  password: '',
}

export function NewUserPage() {
  const navigate = useNavigate()
  const createUser = useCreateUser()

  async function handleSubmit(values: UserFormValues): Promise<void> {
    // isActive is not accepted on create (new users are always active).
    await createUser.mutateAsync({
      email: values.email,
      firstName: values.firstName,
      lastName: values.lastName,
      role: values.role,
      password: values.password,
    })
    navigate(ROUTES.users)
  }

  return (
    <>
      <PageHeader title="New user" />
      <UserForm mode="create" defaultValues={EMPTY_USER} submitLabel="Create user" onSubmit={handleSubmit} />
    </>
  )
}
```

**New file: `src/features/users/pages/EditUserPage.tsx`**

```tsx
import { useNavigate, useParams } from 'react-router'
import { ROUTES } from '../../../config/routes.ts'
import { PageHeader } from '../../../shared/components/layout/PageHeader.tsx'
import { ErrorAlert } from '../../../shared/components/ui/ErrorAlert.tsx'
import { LoadingState } from '../../../shared/components/ui/LoadingState.tsx'
import { useAuth } from '../../authentication/index.ts'
import { UserForm } from '../components/UserForm.tsx'
import { useUpdateUser, useUser } from '../hooks/useUsers.ts'
import type { UpdateUserRequest } from '../types/users.ts'
import type { UserFormValues } from '../types/userSchemas.ts'

export function EditUserPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { user: currentUser } = useAuth()
  const user = useUser(id)
  const updateUser = useUpdateUser()
  const isSelf = id === currentUser?.id

  async function handleSubmit(values: UserFormValues): Promise<void> {
    const body: UpdateUserRequest = {
      email: values.email,
      firstName: values.firstName,
      lastName: values.lastName,
    }
    // Role and active are read-only for yourself, so they are not sent.
    if (!isSelf) {
      body.role = values.role
      body.isActive = values.isActive
    }
    if (values.password) {
      body.password = values.password
    }
    await updateUser.mutateAsync({ id, body })
    navigate(ROUTES.users)
  }

  return (
    <>
      <PageHeader title="Edit user" description={user.data?.email} />
      {user.isPending && <LoadingState />}
      <ErrorAlert error={user.error} />
      {user.data && (
        <UserForm
          mode="edit"
          isSelf={isSelf}
          defaultValues={{
            email: user.data.email,
            firstName: user.data.firstName,
            lastName: user.data.lastName,
            role: user.data.role,
            isActive: user.data.isActive,
            password: '',
          }}
          submitLabel="Save changes"
          onSubmit={handleSubmit}
        />
      )}
    </>
  )
}
```

### 7 — Public API and routes

**New file: `src/features/users/index.ts`**

```ts
export { EditUserPage } from './pages/EditUserPage.tsx'
export { NewUserPage } from './pages/NewUserPage.tsx'
export { UsersPage } from './pages/UsersPage.tsx'
```

**File: `src/app/routes/router.tsx`** — import the pages from `../../features/users/index.ts` and add to the `AppLayout` children, before `{ path: '*', … }`:

```tsx
          { path: ROUTES.users, element: <UsersPage /> },
          { path: ROUTES.newUser, element: <NewUserPage /> },
          { path: '/users/:id/edit', element: <EditUserPage /> },
```

### 8 — Plans

- New [00-overview.md](00-overview.md) for `users` (the parent session adds the row to `../00-index.md`).
- Update the overview's status line when implemented.

---

## Edge Cases & Failure Modes

- **Duplicate email** → 409 `Email is already in use` (no field prefix) → shown by `FormError` at the top of the form.
- **Server validation** (e.g. `password must be longer than or equal to 8 characters`) → `applyServerErrors` puts it on the `password` field; client rules normally catch it first.
- **Email case/spaces:** the API trims and lower-cases; the form trims. Editing `Sara@Example.com` to `sara@example.com` is not a conflict.
- **Empty password on edit** → not sent → unchanged. Passwords are not trimmed (spaces count).
- **Editing yourself:** role / active are disabled and not sent, so you cannot lock yourself out or lose admin. Name / email changes update the header immediately (`CURRENT_USER_KEY` set in `useUpdateUser`). Resetting your own password here is allowed; your session stays valid until it expires.
- **Deactivating or deleting another user** ends their session on their next request (backend behaviour).
- **Delete yourself:** button hidden. A deleted user's URL `/users/<id>/edit` → 404 `User <id> not found` in `ErrorAlert`.
- **Bad id in URL** (`/users/abc/edit`) → 400 `Validation failed (uuid is expected)` shown by `ErrorAlert`.
- **Search** is in the URL (`?search=`), so it survives reload; it filters names and email case-insensitively.
- **Role "user"** does not see the nav item but can still open `/users` directly; the API allows it (no role enforcement yet).
- **Delete error** (e.g. 404 because someone else deleted it) → shown inside the dialog; Cancel resets it.

---

## Test Plan

No test runner. Manual, backend running, signed in as `admin@example.com`:

1. Sidebar shows **Users** last; `/users` lists the admin with "(you)" and no Delete button.
2. New user: submit empty → field errors, no request; password `short` → "Use at least 8 characters"; valid (`Test User`, `test.user@example.com`, role User, `Secret123`) → back to list, row visible.
3. Create again with the same email → "Email is already in use".
4. Search `test.user` → only that row; reload keeps the filter; clear → all rows.
5. Edit that user: change last name, leave password empty → saved; sign in as them in a private window with `Secret123` works. Set a new password `NewPass123` → the old one fails, the new one works.
6. Edit: untick Active → their private-window session goes to `/login` on the next navigation.
7. Sign in (private window) as a role `user` account → no Users item in the sidebar.
8. Edit yourself: role and Active are disabled; change your first name → header updates at once.
9. Delete the test user → confirm dialog → row disappears.
10. `/users/00000000-0000-4000-8000-000000000000/edit` → "User … not found".

---

## Migration / Rollback

- No data migration. Rollback: delete `src/features/users/` and revert `routes.ts`, `navigation.ts`, `router.tsx`.

---

## Verification Steps

1. `npm run build` → no errors. 2. `npm run lint` → no errors or warnings. 3. `grep -rnw any src --include=*.ts --include=*.tsx` → no output.
4. `grep -rn "features/users/" src --include=*.ts --include=*.tsx | grep -v "^src/features/users/" | grep -v "users/index.ts'"` → no output.
5. Test Plan steps 1–10.

---

## Done Criteria

Implemented 2026-11-07. All code blocks compiled and linted as written. Differences: none in code (in `navigation.ts` the comment reads "Users is always the last item."); Verification step 3 grep limited to `.ts`/`.tsx`. Headless checks run: `npm run build` and `npm run lint` clean, both greps no output; with the dev server, `/users`, `/users/new`, `/users/<uuid>/edit` and `src/features/users/index.ts` return 200; through the `/api` proxy with a Bearer token: list 200, create 201 (email trimmed + lower-cased), duplicate 409 `Email is already in use`, `isActive` on create 400 `property isActive should not exist`, short password 400, PATCH (names, role, `isActive: false`, password) 200 and inactive login 401, DELETE 204 then GET 404, bad uuid 400; test user removed. Test Plan steps 1–10 (browser) not run yet.

- [x] `src/features/users/` with service, hooks, schemas, `UserForm`, three pages and `index.ts`.
- [x] Routes `/users`, `/users/new`, `/users/:id/edit`; `ROUTES.users`, `newUser`, `editUser`.
- [x] Sidebar item **Users** (`adminOnly`, last).
- [x] Create requires a password; edit resets it only when filled; `isActive` never sent on create.
- [ ] Self: no delete, role / active read-only, header updates after saving. (Code in place; browser check not run yet.)
- [x] `users` overview updated.
- [x] `npm run build` and `npm run lint` pass; no `any`.

**STOP HERE. Report to the user and wait for confirmation before proceeding to Story 05.**
