# inspection-checklist — plan overview

Entry point for the **inspection-checklist** feature. Stories execute in order by their `NN` prefix.

## Stories

| NN | File | Title | Tracker id | Depends on |
|----|------|-------|------------|------------|
| 10 | [10-story-inspection-checklist-admin-page.md](10-story-inspection-checklist-admin-page.md) | Inspection checklist admin page (indicators and their checks) | — | [03](../authentication/03-story-login-session-and-protected-routes.md), [07](../countries/07-story-country-management-page.md) |

## Dependency notes

- **Status:** Story 10 implemented 2026-11-07 (browser smoke test passed 2026-11-07; remaining manual checks in ../00-index.md "Verification").
- Covers backend Story 09 (`backend/contracts/inspection-checklist.md`). The GET list is not paginated and already sorted; there is no checks list endpoint.
- Public API (`src/features/inspection-checklist/index.ts`): `InspectionIndicator`, `InspectionCheck`, `useInspectionChecklist()` (key `['inspection-checklist']`, default stale time so the trip form sees recent edits), `InspectionChecklistPage`. Story 11 (trips) renders the inspection section of the trip form from `useInspectionChecklist()`.
- Sidebar item is `adminOnly` (hidden from role `user` by Story 03's `useNavItems`; the API does not enforce roles).
- Depends on Story 07 only for the global `.visually-hidden` class.
- Text in `i18n.ts` (English / Arabic) since Story 14 ([../localization/14-story-translate-feature-pages.md](../localization/14-story-translate-feature-pages.md)).
