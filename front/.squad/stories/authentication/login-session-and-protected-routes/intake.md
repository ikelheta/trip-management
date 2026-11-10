# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/authentication/login-session-and-protected-routes/intake.md`

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit.

---

## Feature

- **Feature name (display):** Authentication
- **Feature slug (folder under `plans/`):** `authentication`

## Tracker (metadata only)

- **Tracker type:** `none`
- **Work item id:** ``
- **Work item type:** `Story`
- **Status:** `New`
- **Labels:** `frontend`, `auth`, `backend-story-12`

---

## Title

```text
Login page, session handling, protected routes, user menu and change password
```

---

## Description

```text
Backend Story 12 (backend/contracts/auth.md) protects every API route with a
JWT. The front end must sign the user in and send the token on every request.

- Login page (/login): email + password -> POST /api/auth/login ->
  { accessToken, tokenType: "Bearer", expiresIn (seconds), user }.
  Wrong credentials -> 401 "Invalid email or password" shown on the form.
- Keep the token in localStorage with its expiry time, so a reload keeps the
  user signed in until the token expires. Other tabs follow (storage event).
- Every API request sends Authorization: Bearer <token> (Story 02's
  configureHttpClient).
- On start-up with a stored token, load the user with GET /api/auth/me.
- Any 401 "Missing access token" / "Invalid or expired access token" from a
  protected route -> sign out and go to /login. Other 401s (wrong current
  password) stay form errors.
- When the token's expiresIn runs out -> sign out (no refresh token exists).
- Every page except /login requires a signed-in user; visiting one while
  signed out redirects to /login and back to the page after sign-in.
- Header user menu: full name, role badge, "Change password" link, "Sign out".
- Change password page (/account/password): current, new, confirm ->
  POST /api/auth/change-password -> 204; "Current password is incorrect"
  shown on the current-password field.
- Sign out: forget the token, clear cached server data (no server logout).
- Role: the API does not enforce roles. The UI hides admin-only navigation
  (NavItem.adminOnly) from role "user".
```

---

## Acceptance criteria

```text
- [ ] Signed out, any page -> /login; after sign-in -> back to that page.
- [ ] admin@example.com / ChangeMe123! signs in; wrong password shows
      "Invalid email or password".
- [ ] Reload keeps the session; a token past its expiry signs the user out.
- [ ] A 401 session error from any request signs out and shows /login.
- [ ] Header shows the user's name and role; Sign out works.
- [ ] Change password: wrong current -> error on that field; success message;
      new / confirm mismatch caught before sending.
- [ ] Signed in, /login redirects home.
- [ ] npm run build and npm run lint pass.
```

---

## Dependencies

- **Blocked by:** Story 02 (app foundation).
- Backend Story 12 (implemented): `backend/contracts/auth.md`, `backend/contracts/users.md` (User shape).

## Extra notes (optional)

- localStorage (not a cookie) because the API uses a Bearer header. XSS hardening is a separate concern.
- `User` is used by authentication and users → `src/shared/types/user.ts`.

## Out of scope

- Users management pages (Story 04), refresh tokens, "remember me", forgot password, role enforcement beyond hiding nav items, tests.
