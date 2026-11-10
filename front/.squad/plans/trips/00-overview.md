# trips — plan overview

Entry point for the **trips** feature. Stories execute in order by their `NN` prefix.

## Stories

| NN | File | Title | Tracker id | Depends on |
|----|------|-------|------------|------------|
| 11 | [11-story-trip-list-details-and-form-with-passengers-and-inspection.md](11-story-trip-list-details-and-form-with-passengers-and-inspection.md) | Trips list, details, create and edit with passengers and the pre-trip inspection | — | [02](../app-foundation/02-story-app-shell-routing-api-client-and-shared-ui.md), [03](../authentication/03-story-login-session-and-protected-routes.md), 08 (vehicles), 09 (drivers), 10 (inspection checklist) |
| 12 | [12-story-trip-qr-code-on-trip-details.md](12-story-trip-qr-code-on-trip-details.md) | Show, download, print and regenerate the trip QR code on the trip details page | — | [11](11-story-trip-list-details-and-form-with-passengers-and-inspection.md), 05 (files) |
| 16 | [16-story-passenger-excel-import.md](16-story-passenger-excel-import.md) | Import trip passengers from an Excel file | — | [11](11-story-trip-list-details-and-form-with-passengers-and-inspection.md), 14 (translations), 15 (styles) |
| 17 | [17-story-trip-origin-and-destination.md](17-story-trip-origin-and-destination.md) | Trip origin and destination (from / to) on the trip form, list and details | — | [11](11-story-trip-list-details-and-form-with-passengers-and-inspection.md), 14 (translations), backend Story 13 |
| 18 | [18-story-trip-contract-print-page.md](18-story-trip-contract-print-page.md) | Trip contract print page: print or save the driver's contract as PDF from the browser | — | [11](11-story-trip-list-details-and-form-with-passengers-and-inspection.md), [12](12-story-trip-qr-code-on-trip-details.md), 05 (files), 06 (companies), 08 (vehicles), 09 (drivers), backend Story 14 |

## Dependency notes

- **Status:** Story 11 implemented 2026-11-07 (browser smoke test passed 2026-11-07; remaining manual checks in ../00-index.md "Verification"). Story 12 implemented 2026-11-07 (browser smoke test passed 2026-11-07; remaining manual checks in ../00-index.md "Verification"). Story 16 and Story 17 implemented 2026-11-09 (build, lint and a 35-check browser smoke test pass). Story 17 needs backend Story 13 (implemented the same day) (ship together: the API then requires `origin` / `destination` on create).
- **Story 18 implemented 2026-11-09** (build, lint, 32-check browser test, print PDFs inspected); needs backend Story 14 (`contractNumber`). Printed by the browser (`window.print()`, "Save as PDF"), no PDF library; full-page route outside `AppLayout`; adds `jsbarcode` (loaded with `import()`) and `@fontsource/cairo`. Also scopes the QR card's global print rule (`body:has(.printArea)`). A server-rendered PDF plan was dropped the same day.
- **Story 16:** client-side only (no backend change); added `read-excel-file` and `write-excel-file`, loaded on demand with `import()`.
- **Backend mapping:** Story 11 covers backend Stories 08 (trips with passengers) and 10 (inspection required on create, edited through the trip) — they are one form because `POST /api/trips` requires the inspection. Story 12 covers backend Story 11 (QR code).
- Uses other features only through their `index.ts`: vehicles (`useAllVehicles`, `VehicleSelect`), drivers (`useAllDrivers`, `DriverSelect`), inspection-checklist (`useInspectionChecklist`, `InspectionIndicator`), files (`AuthImage`, `downloadFile`). Nothing imports trips except the router (`src/app/routes/router.tsx`).
- Story 11 makes `/` redirect to `/trips` and removes `src/app/pages/HomePage.tsx`; Trips is the first sidebar item.
- `TripListQuery` is a `type` alias so it fits `RequestOptions['query']`; other features' list query types should follow the same rule.
- Follow-ups: a public trip page for scanned QR codes (needs a backend story), double-booking warnings, a printable trip sheet.
- Text in `i18n.ts` (English / Arabic) since Story 14 ([../localization/14-story-translate-feature-pages.md](../localization/14-story-translate-feature-pages.md)).
