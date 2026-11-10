# authentication — plan overview

Entry point for the **authentication** feature. Stories execute in order by their `NN` prefix.

## Stories

| NN | File | Title | Tracker id | Depends on |
|----|------|-------|------------|------------|
| 03 | [03-story-login-session-and-protected-routes.md](03-story-login-session-and-protected-routes.md) | Login page, session handling, protected routes, user menu and change password | — | [02](../app-foundation/02-story-app-shell-routing-api-client-and-shared-ui.md) |

## Dependency notes

- **Status:** implemented 2026-11-07 (Story 03). Covers backend Story 12 (`backend/contracts/auth.md`).
- **Changed by [Story 15](../user-experience/15-story-styling-refresh-and-account-page.md) (2026-11-08):** the top-bar `UserMenu` was removed. The user's details, Change password and Sign out now live on the "My account" page (`/account`, `AccountPage`); the top bar shows `AccountLink` and the sidebar `SignOutButton`.
- Every later page sits behind `RequireAuth`. The token reaches requests only through `configureHttpClient` (wired in `src/app/providers/connectSessionToApi.ts`).
- Adds `src/shared/types/user.ts` (`User`, `UserRole`, password limits), also used by the users story (04).
- Other features use the feature only through `src/features/authentication/index.ts` (`useAuth`, `CURRENT_USER_KEY`, `UserMenu`, …).
- Follow-ups: role enforcement waits for a backend story; refresh tokens and forgot-password do not exist in the API.
