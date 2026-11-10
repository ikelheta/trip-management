# users — plan overview

Entry point for the **users** feature. Stories execute in order by their `NN` prefix.

## Stories

| NN | File | Title | Tracker id | Depends on |
|----|------|-------|------------|------------|
| 04 | [04-story-users-management-pages.md](04-story-users-management-pages.md) | Users management pages: list, create, edit (with password reset) and delete | — | [02](../app-foundation/02-story-app-shell-routing-api-client-and-shared-ui.md), [03](../authentication/03-story-login-session-and-protected-routes.md) |

## Dependency notes

- **Status:** Story 04 implemented 2026-11-07 (build, lint and API checks pass; browser smoke test passed 2026-11-07; remaining manual checks in ../00-index.md "Verification").
- Covers the backend users module and the password fields of backend Story 12 (`backend/contracts/users.md`).
- Uses the authentication feature only through its `index.ts` (`useAuth`, `CURRENT_USER_KEY`) and the shared `User` type from `src/shared/types/user.ts`.
- The API returns every user in one list (no pagination, no search), so the list page filters in the browser.
- The **Users** nav item is `adminOnly` and always the last sidebar item. The API does not enforce roles; hiding is cosmetic until a backend role story exists.
- Text in `i18n.ts` (English / Arabic) since Story 14 ([../localization/14-story-translate-feature-pages.md](../localization/14-story-translate-feature-pages.md)).
