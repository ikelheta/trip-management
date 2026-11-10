# Plans index

One row per feature folder under `.squad/plans/`. `NN` continues as a global execution sequence across all features when `naming.globalSequence` is `true` in `config.yaml`.

| Feature | Overview | NN range |
|---------|----------|----------|
| project-structure | [project-structure/00-overview.md](project-structure/00-overview.md) | 01 |
| app-foundation | [app-foundation/00-overview.md](app-foundation/00-overview.md) | 02 |
| authentication | [authentication/00-overview.md](authentication/00-overview.md) | 03 |
| users | [users/00-overview.md](users/00-overview.md) | 04 |
| files | [files/00-overview.md](files/00-overview.md) | 05 |
| companies | [companies/00-overview.md](companies/00-overview.md) | 06 |
| countries | [countries/00-overview.md](countries/00-overview.md) | 07 |
| vehicles | [vehicles/00-overview.md](vehicles/00-overview.md) | 08 |
| drivers | [drivers/00-overview.md](drivers/00-overview.md) | 09 |
| inspection-checklist | [inspection-checklist/00-overview.md](inspection-checklist/00-overview.md) | 10 |
| trips | [trips/00-overview.md](trips/00-overview.md) | 11, 12, 16, 17, 18 |
| localization | [localization/00-overview.md](localization/00-overview.md) | 13, 14 |
| user-experience | [user-experience/00-overview.md](user-experience/00-overview.md) | 15 |

## Backend story → frontend story

The backend's plans and contracts are mirrored in `backend/` (read-only).

| Backend story | Frontend story |
|---------------|----------------|
| 01 project structure, users module | 01 project structure, 02 app foundation, 04 users |
| 02 files | 05 shared file upload and authenticated images |
| 03 companies | 06 company pages |
| 04 countries | 07 country page |
| 06 vehicles | 08 vehicle pages |
| 07 drivers | 09 driver pages |
| 09 pre-trip inspection checklist | 10 inspection checklist admin page |
| 08 trips + 10 inspection sent with the trip | 11 trip list, details and form with passengers and inspection |
| 11 trip QR code | 12 QR code on the trip details page |
| 12 JWT authentication | 03 login, session, protected routes |
| — (frontend only) | 13 language switcher, RTL, translated shell; 14 translated feature pages |
| — (frontend only) | 15 styling refresh, "My account" page |
| — (frontend only) | 16 import trip passengers from Excel |
| 13 trip origin and destination | 17 From / To on the trip form, list and details |
| 14 trip contract number | 18 contract print page (browser "Save as PDF") |

Execution order is the `NN` order: each story only uses what earlier stories built.

## Verification (2026-11-07)

All stories 01–12 are implemented. `npm run build` and `npm run lint` pass with no warnings (Vite prints a "chunk larger than 500 kB" notice; route-level code splitting is a follow-up).

**Browser smoke test** (headless Chrome via Playwright, against the dev server and the real backend): 34/34 passed.

- Auth: signed-out redirect to `/login`, wrong-password message, sign-in to `/trips` with the user menu, reload keeps the session, sign out, protected page redirects, a garbage token signs out.
- Every page renders without error alerts (trips, drivers, vehicles, companies, countries, inspection checklist, users, change password, new trip, not-found); countries list paginates; sidebar order is Trips, Drivers, Vehicles, Companies, Countries, Inspection checklist, Users.
- Forms: create company (and its 409 message), vehicle (company select), driver (country + vehicle selects, leading zeros kept), trip (field errors before answering the inspection, add passenger, "Mark all good", create, details).
- Trip QR: image loads through the token, Regenerate shows a new image, Download PNG saves a `.png`. Edit trip time, delete trip from details.
- Role `user` does not see Users / Inspection checklist.
- No unexpected API errors and no console errors during the run.

**Still manual** (not covered by the smoke test): image upload / remove on company forms (`ImageUploadField`), checklist dialogs (create / edit / move / delete), country dialogs, users create / edit / self-restrictions, change-password success flow, filters and search on each list, Print preview, dark mode, narrow screens, token expiry timer and multi-tab sign-out.

## Verification — localization (2026-11-08)

Stories 13 and 14 are implemented. `npm run build` and `npm run lint` pass; the English smoke test is still 34/34.

- Arabic check (headless Chrome, `ar-*.png` screenshots reviewed): every page and form in Arabic, right-to-left layout, Arabic validation and API messages, Arabic plurals (0, 1, 2, 3, 11, 100), check and country names in the current language first, language switch mid-form keeps the values, other tabs follow the switch.
- Outside the plan: trip details no longer refetches a trip it has just deleted (`useTrip(id, enabled)`), which removed an occasional 404 after delete.
- **Still manual in Arabic:** image upload errors, print preview, narrow screens. Native date / time / file inputs follow the browser's language.
| 15 deployment (Docker Compose, one server) | — (this project only adds `Dockerfile` / `.dockerignore`; see `../../deploy/README.md`) |
