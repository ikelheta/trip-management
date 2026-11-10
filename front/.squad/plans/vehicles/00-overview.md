# vehicles — plan overview

Entry point for the **vehicles** feature. Stories execute in order by their `NN` prefix.

## Stories

| NN | File | Title | Tracker id | Depends on |
|----|------|-------|------------|------------|
| 08 | [08-story-vehicle-management-pages.md](08-story-vehicle-management-pages.md) | Vehicle management pages and a vehicle picker for other features | — | [03](../authentication/03-story-login-session-and-protected-routes.md), [06](../companies/06-story-company-management-pages.md), [07](../countries/07-story-country-management-page.md) |

## Dependency notes

- **Status:** Story 08 implemented 2026-11-07 (build, lint and API calls through the proxy verified; browser smoke test passed 2026-11-07; remaining manual checks in ../00-index.md "Verification").
- Covers backend Story 06 (`backend/contracts/vehicles.md`).
- Uses the companies feature only through `src/features/companies/index.ts` (`Company`, `useAllCompanies`, `CompanySelect`) for the company filter, the company-name column and the form's company picker.
- Public API (`src/features/vehicles/index.ts`): `Vehicle`, `useAllVehicles()` (key `['vehicles', 'all']`, 5 min, sorted by plate), `VehicleSelect`, `formatVehicleLabel`, and the three pages. Story 09 (drivers) and Story 11 (trips) use the picker and the label.
- Text in `i18n.ts` (English / Arabic) since Story 14 ([../localization/14-story-translate-feature-pages.md](../localization/14-story-translate-feature-pages.md)).
