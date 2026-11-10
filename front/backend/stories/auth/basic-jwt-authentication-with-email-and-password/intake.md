# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/auth/basic-jwt-authentication-with-email-and-password/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):** Auth — Authentication
- **Feature slug (folder under `plans/`):** `auth`

## Tracker (metadata only)

- **Tracker type:** `none`
- **Work item id:** `` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `User story`
- **Status:** `New`
- **Assignee:** ``
- **Labels:** `auth, users, security, api-change`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```text
Basic JWT authentication with email and password
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```text
User story: as a leasing company operator, I sign in with my email and
password and get an access token, so that only signed-in users can use the
API (and later the React front end).

Current behaviour:
- Every route is open. Users (Story 01) have email, names, role
  (admin | user) and isActive, but no password.

New behaviour:
- Users get a password, stored only as a bcrypt hash in a new nullable column
  users.password_hash. The hash is never returned by any route.
- POST /api/users requires `password`; PATCH /api/users/:id accepts an
  optional `password` (an admin resets it). Rules: string, 8–72 characters.
- POST /api/auth/login { email, password } -> 200
    { accessToken, tokenType: "Bearer", expiresIn, user }
  Email is trimmed and lower-cased like on user create. Unknown email, wrong
  password, a user without a password and an inactive user all get the same
  401 "Invalid email or password".
- The access token is a JWT signed with HS256 using JWT_SECRET, payload
  { sub: user id, email, role }, valid for JWT_EXPIRES_IN_SECONDS
  (default 3600).
- Every route requires `Authorization: Bearer <token>` except:
    GET  /api/health
    POST /api/auth/login
  (Swagger /api/docs is not behind the guard.)
- Missing token -> 401 "Missing access token". Bad signature, malformed or
  expired token -> 401 "Invalid or expired access token". The same 401 when
  the token's user was deleted or deactivated after the token was issued
  (the user is re-loaded on every request).
- GET /api/auth/me -> 200 the signed-in user.
- POST /api/auth/change-password { currentPassword, newPassword } -> 204.
  Wrong current password -> 401 "Current password is incorrect".
- A first admin is created by `npm run seed` from SEED_ADMIN_EMAIL and
  SEED_ADMIN_PASSWORD (skipped when they are not set, or the email exists).
- Swagger shows a bearer "Authorize" button.
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```text
API
- [ ] POST /auth/login with a seeded admin -> 200 with accessToken,
      tokenType "Bearer", expiresIn 3600 and the user (no passwordHash).
- [ ] Wrong password, unknown email, inactive user, user without a password
      -> 401 "Invalid email or password".
- [ ] GET /trips without a token -> 401 "Missing access token"; with a
      garbage or expired token -> 401 "Invalid or expired access token";
      with a valid token -> 200.
- [ ] GET /health and POST /auth/login work without a token.
- [ ] GET /auth/me returns the signed-in user.
- [ ] POST /auth/change-password -> 204; the old password stops working and
      the new one logs in; wrong current password -> 401.
- [ ] POST /users without password -> 400; with a 7-character password -> 400.
- [ ] No users response (POST, GET list, GET :id, PATCH, /auth/me, login)
      contains passwordHash.
- [ ] A token of a user who is then deactivated or deleted -> 401.

Structure
- [ ] New AuthModule (src/modules/auth) uses the users module only through
      UsersService. Hashing lives in the users module.
- [ ] One global guard (APP_GUARD); public routes use a @Public() decorator
      from src/common/decorators.
- [ ] One new migration adds users.password_hash varchar(255) NULL;
      migration:generate reports no drift afterwards.
- [ ] JWT_SECRET (required, min 32 chars), JWT_EXPIRES_IN_SECONDS,
      SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD validated in env.validation.ts
      and listed in .env.example.
- [ ] New dependencies: @nestjs/jwt, bcryptjs.

Docs
- [ ] contract/auth.md added; contract/README.md, users.md and files.md
      updated; openapi.json regenerated.

Quality
- [ ] `npm run build` and `npm run lint` pass; no test files.
```

---

## Attachments

Place files in `attachments/` next to this `intake.md`, then list them here so the planner knows what to open.

| File (relative to this folder) | What it is |
| ------------------------------ | ---------- |

None.

---

## Dependencies

- **Blocked by / related ids:** project-structure (Story 01: users module, ValidationPipe, AllExceptionsFilter). All business stories (02–11) are implemented and become protected.
- **Depends on code areas or other stories:** src/modules/users, src/main.ts (Swagger), src/app.module.ts, src/config/env.validation.ts, src/database/seeds.

## Extra notes (optional)

- **Decided — every route is protected by default** (global guard + @Public opt-out), so a new module can never be left open by mistake.
- **Decided — file downloads are protected too.** `<img src="/api/files/…/download">` cannot send a header, so the front end fetches images with the token and shows them through an object URL. Open question for the product owner: make `GET /files/:id/download` public instead (file ids are random UUIDs).
- **Decided — no roles enforcement yet.** Any signed-in user can call every route, including user management. Role checks (admin-only user management) are the next story.
- Existing users have password_hash NULL and cannot log in until an admin sets a password with PATCH /users/:id, or the seed creates an admin.
- The trip QR url (default `/api/trips/:id`) now needs a token, so a phone camera gets 401. A public trip page is a separate story.
- CORS stays off; the React dev server proxies `/api`.

## Technical hints (optional)

- @nestjs/jwt's JwtService (no Passport): a CanActivate guard that reads the Bearer header, verifyAsync, then UsersService loads the user.
- bcryptjs v3 (pure JS, ESM, own types; no native build on Windows), cost 12.
- users.password_hash with `select: false`, so normal reads never load it; a dedicated repository query adds it for login and change-password.
- Users routes return the entity today; add a UserResponseDto (controller mapping, like CompanyResponseDto) so the hash can never leak.
- Swagger: DocumentBuilder.addBearerAuth() + addSecurityRequirements('bearer') + addGlobalResponse(401).

## Out of scope

- What this story explicitly does **not** cover:
  - Role-based authorization (admin-only routes), company scoping.
  - Refresh tokens, logout / token revocation lists, remember-me.
  - Self sign-up, email verification, forgot / reset password by email.
  - Login rate limiting or account lockout (follow-up: @nestjs/throttler).
  - Password strength rules beyond length.
  - CORS, cookies, a public trip page.
  - Tests.
