# auth — plan overview

Entry point for the **auth** feature. Stories execute in order by their `NN` prefix.

## Stories

| NN | File | Title | Tracker id | Depends on |
|----|------|-------|------------|------------|
| 12 | [12-story-basic-jwt-authentication-with-email-and-password.md](12-story-basic-jwt-authentication-with-email-and-password.md) | Basic JWT authentication with email and password | — | [01](../project-structure/01-story-restructure-project-as-clean-modular-monolith-no-ddd-no-test-files.md) |

## Dependency notes

- **Status:** Story 12 implemented 2026-11-07. File downloads stay protected (the intake's open question was not answered; default kept).
- Builds on Story 01's `users` module: adds `users.password_hash` (bcrypt, `select: false`), password on create/update, and a `UserResponseDto` mapped in the controller. This overlaps with the open crud-foundation work (`UserResponseDto`); that story should reuse the DTO, not recreate it.
- `AuthModule` imports `UsersModule` (one direction only) and registers the global `JwtAuthGuard` as `APP_GUARD`. Every module from Stories 02–11 becomes protected without code changes; only `health` gains `@Public()` (from `src/common/decorators/public.decorator.ts`).
- Front-end impact (recorded in `contract/`): every request sends `Authorization: Bearer <token>`; file downloads can no longer be used directly in `<img src>`; the trip QR url returns 401 until a public trip page exists.
- Follow-ups left open by the intake: role-based authorization (admin-only user management), company scoping, refresh tokens / logout, forgot-password, login rate limiting, public file downloads or signed urls, a public trip page for QR codes.
