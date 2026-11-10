# countries — plan overview

Entry point for the **countries** feature. Stories execute in order by their `NN` prefix.

## Stories

| NN | File | Title | Tracker id | Depends on |
|----|------|-------|------------|------------|
| 07 | [07-story-country-management-page.md](07-story-country-management-page.md) | Country management page and a country picker for other features | — | [02](../app-foundation/02-story-app-shell-routing-api-client-and-shared-ui.md), [03](../authentication/03-story-login-session-and-protected-routes.md) |

## Dependency notes

- **Status:** Story 07 implemented 2026-11-07 (build, lint and API calls through the proxy verified; browser smoke test passed 2026-11-07; remaining manual checks in ../00-index.md "Verification").
- Covers backend Story 04 (`backend/contracts/countries.md`).
- Public API (`src/features/countries/index.ts`): `Country`, `useAllCountries()` (key `['countries', 'all']`, 5 min stale time, sorted by English name), `CountrySelect`, `CountriesPage`. Story 09 (drivers) uses the picker and the name lookup for nationality. Story 14 removed `formatCountryName`; names are shown with `bilingualLabel` / `localizedName` from `shared/i18n/` (current language first), and `CountrySelect` sorts its options by the current language's name.
- Adds the global `.visually-hidden` class (used for the actions column header by the list stories).
- Text in `i18n.ts` (English / Arabic) since Story 14 ([../localization/14-story-translate-feature-pages.md](../localization/14-story-translate-feature-pages.md)).
