# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/users/users-management-pages/intake.md`

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit.

---

## Feature

- **Feature name (display):** Users
- **Feature slug (folder under `plans/`):** `users`

## Tracker (metadata only)

- **Tracker type:** `none`
- **Work item id:** ``
- **Work item type:** `Story`
- **Status:** `New`
- **Labels:** `frontend`, `users`, `backend-users-module`, `backend-story-12`

---

## Title

```text
Users management pages: list, create, edit (with password reset) and delete
```

---

## Description

```text
Covers the backend users module (backend/contracts/users.md) including the
password fields added by backend Story 12.

API facts:
- GET /api/users -> User[] (NOT paginated), newest first.
- POST /api/users { email, firstName, lastName, password, role? } -> 201.
  email valid, <= 255, trimmed + lower-cased, unique (409 "Email is already
  in use"); names non-empty <= 100; password 8–72 characters, not trimmed.
- GET /api/users/:id -> User; 404 "User <id> not found".
- PATCH /api/users/:id any subset + isActive; password resets it.
  isActive false locks the user out immediately.
- DELETE /api/users/:id -> 204, hard delete; the user's tokens stop working.
- Roles are not enforced by the API.

Pages:
- /users: table of users (name, email, role badge, active/inactive badge,
  created) with a search box that filters by name or email in the browser
  (the API has no search). Edit and Delete actions; Delete is hidden on the
  signed-in user's own row. Delete asks for confirmation.
- /users/new: create form (first name, last name, email, role, password).
- /users/:id/edit: edit form (names, email, role, active, optional new
  password: empty = keep). For the signed-in user, role and active are
  read-only (avoid locking yourself out). Saving the signed-in user updates
  the header user menu.
- Sidebar item "Users", admin only (hidden from role "user").
```

---

## Acceptance criteria

```text
- [ ] /users lists every user; typing in search filters by name / email.
- [ ] Create: missing / short password blocked in the form; duplicate email
      shows "Email is already in use"; success returns to the list.
- [ ] Edit: empty password keeps the old one; a new password (8–72) resets it.
- [ ] Editing yourself: role and active cannot be changed; the header name
      updates after saving.
- [ ] Delete asks for confirmation; not offered for yourself.
- [ ] "Users" nav item visible to admins only.
- [ ] npm run build and npm run lint pass.
```

---

## Dependencies

- **Blocked by:** Story 02 (app foundation), Story 03 (authentication: `useAuth`, `CURRENT_USER_KEY`, `User` type in `src/shared/types/user.ts`).
- Backend: users module + Story 12 (implemented).

## Extra notes (optional)

- Client-side filtering is fine: the list is small and not paginated by the API.
- Hiding the nav item is cosmetic; the API lets any signed-in user manage users.

## Out of scope

- Pagination, server-side search, role enforcement, self sign-up, invitations, tests.
