# drivers — plan overview

Entry point for the **drivers** feature. Stories execute in order by their `NN` prefix.

## Stories

| NN | File | Title | Tracker id | Depends on |
|----|------|-------|------------|------------|
| 09 | [09-story-driver-management-pages.md](09-story-driver-management-pages.md) | Driver management pages and a driver picker for other features | — | [03](../authentication/03-story-login-session-and-protected-routes.md), [07](../countries/07-story-country-management-page.md), [08](../vehicles/08-story-vehicle-management-pages.md) |

## Dependency notes

- **Status:** Story 09 implemented 2026-11-07 (build, lint and API calls through the proxy verified; browser smoke test passed 2026-11-07; remaining manual checks in ../00-index.md "Verification").
- Covers backend Story 07 (`backend/contracts/drivers.md`).
- Uses countries (`CountrySelect`, `useAllCountries`; names via `bilingualLabel` from `shared/i18n/`) and vehicles (`VehicleSelect`, `useAllVehicles`, `formatVehicleLabel`) only through their `index.ts`.
- Public API (`src/features/drivers/index.ts`): `Driver`, `useAllDrivers()` (key `['drivers', 'all']`, 5 min, sorted by name), `DriverSelect` and the three pages. Story 11 (trips) uses the picker. Story 14 replaced `formatDriverLabel` with the dictionary function `driversMessages.select.option` (it was used only by `DriverSelect`).
- Text in `i18n.ts` (English / Arabic) since Story 14 ([../localization/14-story-translate-feature-pages.md](../localization/14-story-translate-feature-pages.md)).
