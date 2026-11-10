# Auth

Sign in with email and password and get a JWT access token. **Every other endpoint needs that token** except `GET /api/health` and `POST /api/auth/login`. Source: `src/modules/auth/`.

| Method | Path | Purpose | Auth | Success |
|--------|------|---------|------|---------|
| POST | `/api/auth/login` | Exchange email + password for an access token | public | 200 |
| GET | `/api/auth/me` | The signed-in user | token | 200 |
| POST | `/api/auth/change-password` | Change the signed-in user's password | token | 204 |

## Types

```ts
interface LoginBody {
  email: string;      // valid email, ≤ 255; trimmed and lower-cased, so " Admin@Example.com " works
  password: string;   // non-empty, ≤ 72
}

interface LoginResponse {
  accessToken: string;   // JWT (HS256)
  tokenType: 'Bearer';
  expiresIn: number;     // seconds until the token expires (server env JWT_EXPIRES_IN_SECONDS, default 3600)
  user: User;            // see users.md
}

interface ChangePasswordBody {
  currentPassword: string;  // non-empty, ≤ 72
  newPassword: string;      // 8–72 characters, not trimmed
}
```

## Sending the token

```http
Authorization: Bearer <accessToken>
```

The scheme is case-insensitive (`bearer` works). On every request the server re-loads the user, so a user who is deleted or deactivated is rejected on their next request even with an unexpired token.

| Problem | Status | `message` |
|---------|--------|-----------|
| No `Authorization` header, not `Bearer`, or `Bearer` with no token | 401 | `Missing access token` |
| Bad signature, malformed, expired, or the user was deleted / deactivated | 401 | `Invalid or expired access token` |

```json
{
  "statusCode": 401,
  "error": "Unauthorized",
  "message": "Missing access token",
  "path": "/api/trips",
  "timestamp": "2026-11-07T18:31:02.200Z"
}
```

The guard runs **before** body validation: an unauthenticated request with a bad body gets 401, not 400. Unknown routes still return 404.

## POST /api/auth/login

Public.

```json
{ "email": "admin@example.com", "password": "ChangeMe123!" }
```

**200**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "tokenType": "Bearer",
  "expiresIn": 3600,
  "user": {
    "id": "974e3bed-223f-487e-ada0-69e75787954c",
    "email": "admin@example.com",
    "firstName": "System",
    "lastName": "Admin",
    "role": "admin",
    "isActive": true,
    "createdAt": "2026-11-07T18:30:17.273Z",
    "updatedAt": "2026-11-07T18:30:17.273Z"
  }
}
```

The token payload is `{ sub: <user id>, email, role, iat, exp }`. Do **not** rely on its `role` / `email` for the UI: they are stale after an admin changes the user. Use `user` from this response or `GET /api/auth/me`.

Errors:

- **400** validation, e.g. `["email must be an email"]`, `["password should not be empty"]`; unknown property → `property role should not exist`.
- **401** `Invalid email or password` — the same message for unknown email, wrong password, an inactive user, or a user with no password yet.

## GET /api/auth/me

**200** — the signed-in `User` (same shape as `user` above). Errors: **401**.

## POST /api/auth/change-password

```json
{ "currentPassword": "ChangeMe123!", "newPassword": "Another123" }
```

**204**, no body. The old password stops working at once. Tokens already issued (on any device) **stay valid until they expire**.

Errors:

- **400** e.g. `["newPassword must be longer than or equal to 8 characters"]`.
- **401** `Current password is incorrect`; or a token error (table above).

## Front-end notes

- **Login page:** `POST /api/auth/login`, keep `accessToken` (memory + `localStorage`/`sessionStorage`), and keep `user` for the header / menu.
- **Every request:** add `Authorization: Bearer <accessToken>` (one fetch wrapper / axios interceptor).
- **Any 401 from a protected route** → drop the token and go to the login page. There is **no refresh token**: when `expiresIn` runs out the user signs in again. Optionally log out proactively at `Date.now() + expiresIn * 1000`.
- **Logout:** forget the token on the client; there is no server logout.
- **Images and file downloads need the token too** — `<img src="/api/files/…/download">` cannot send it. See [files.md](files.md#get-apifilesiddownload).
- **First sign-in:** the backend's `npm run seed` creates the first admin from `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` (local default `admin@example.com` / `ChangeMe123!`). Further users are created with `POST /api/users` (see [users.md](users.md)).
- **Roles are not enforced yet:** every signed-in user can call every route. Hide admin screens by `user.role` in the UI, but the API does not block them.
