# Users

Users who sign in (see [auth.md](auth.md)). All routes need a token; roles are **not enforced** yet, so any signed-in user can manage users. Source: `src/modules/users/`.

| Method | Path | Purpose | Success |
|--------|------|---------|---------|
| POST | `/api/users` | Create a user with a password | 201 |
| GET | `/api/users` | List all users, newest first (**not paginated**) | 200 |
| GET | `/api/users/:id` | Get a user | 200 |
| PATCH | `/api/users/:id` | Update a user, or reset their password | 200 |
| DELETE | `/api/users/:id` | Delete a user (**hard delete**) | 204 |

## Types

```ts
type UserRole = 'admin' | 'user';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;      // default 'user'
  isActive: boolean;   // default true; false = cannot sign in, existing tokens rejected
  createdAt: string;
  updatedAt: string;
}
// The password (or its hash) is never returned.

interface CreateUserBody {
  email: string;       // valid email, ≤ 255, trimmed and lower-cased; unique
  firstName: string;   // non-empty, ≤ 100
  lastName: string;    // non-empty, ≤ 100
  password: string;    // 8–72 characters, not trimmed
  role?: UserRole;
}

interface UpdateUserBody extends Partial<CreateUserBody> {
  isActive?: boolean;
}
```

## POST /api/users

```json
{
  "email": "sara@example.com",
  "firstName": "Sara",
  "lastName": "Ahmed",
  "password": "Secret123",
  "role": "admin"
}
```

**201**

```json
{
  "id": "0b8f7c2e-1d3a-4e5b-9c6d-7e8f9a0b1c2d",
  "email": "sara@example.com",
  "firstName": "Sara",
  "lastName": "Ahmed",
  "role": "admin",
  "isActive": true,
  "createdAt": "2026-10-31T18:00:00.000Z",
  "updatedAt": "2026-10-31T18:00:00.000Z"
}
```

Errors:

- **400** validation, e.g. missing password → `["password must be shorter than or equal to 72 characters", "password must be longer than or equal to 8 characters", "password must be a string"]`; short → `["password must be longer than or equal to 8 characters"]`; `passwordHash` in the body → `property passwordHash should not exist`.
- **409** `Email is already in use`.

The new user signs in with `POST /api/auth/login`.

## GET /api/users

**200** — array of `User` (example: `[]` when empty).

## GET /api/users/:id

**200** — `User`. Errors: **400** bad uuid; **404** `User <id> not found`.

## PATCH /api/users/:id

Any subset of `UpdateUserBody`, e.g. `{ "isActive": false }` or `{ "password": "NewPass123" }` (admin reset; the old password stops working, tokens already issued stay valid until they expire). **200** — updated `User`.

- `isActive: false` locks the user out immediately: login → 401 and their existing token → 401 on the next request.

Errors: **400** validation; **404**; **409** `Email is already in use`.

## DELETE /api/users/:id

**204**. The user's tokens are rejected from the next request. Errors: **400** bad uuid; **404**.

## Notes

- Users created before passwords existed have none and cannot sign in until one is set with `PATCH /api/users/:id { "password": … }`.
- The first admin comes from the backend seed (`npm run seed` with `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`).
