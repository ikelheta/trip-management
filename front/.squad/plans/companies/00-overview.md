# companies — plan overview

Entry point for the **companies** feature. Stories execute in order by their `NN` prefix.

## Stories

| NN | File | Title | Tracker id | Depends on |
|----|------|-------|------------|------------|
| 06 | [06-story-company-management-pages.md](06-story-company-management-pages.md) | Company management pages: list, details with header/footer images, create, edit and delete | — | [02](../app-foundation/02-story-app-shell-routing-api-client-and-shared-ui.md), [03](../authentication/03-story-login-session-and-protected-routes.md), [05](../files/05-story-shared-file-upload-and-authenticated-images.md) |

## Dependency notes

- **Status:** Story 06 implemented 2026-11-07 (build, lint and API calls through the proxy verified; browser smoke test passed 2026-11-07; remaining manual checks in ../00-index.md "Verification").
- Covers backend Story 03 (`backend/contracts/companies.md`).
- Uses the files feature only through `src/features/files/index.ts` (`ImageUploadField`, `AuthImage`); images follow the upload-first flow with `ownerType: "companies"`.
- Public API for other features (`src/features/companies/index.ts`): `Company`, `useAllCompanies()` (every company via `fetchAllPages`, key `['companies', 'all']`, 5-minute stale time) and `CompanySelect`. The vehicles story uses them. A form that uses `CompanySelect` with a default value must render after `useAllCompanies()` has data.
- Every companies mutation invalidates the `['companies']` prefix, so `CompanySelect` refreshes after a company is added, renamed or deleted.
- Text in `i18n.ts` (English / Arabic) since Story 14 ([../localization/14-story-translate-feature-pages.md](../localization/14-story-translate-feature-pages.md)).
