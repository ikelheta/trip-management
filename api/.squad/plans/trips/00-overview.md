# trips — plan overview

Entry point for the **trips** feature. Stories execute in order by their `NN` prefix.

## Stories

| NN | File | Title | Tracker id | Depends on |
|----|------|-------|------------|------------|
| 08 | [08-story-trip-management-api.md](08-story-trip-management-api.md) | Add Trips module with passengers to schedule vehicle and driver trips | — | [01](../project-structure/01-story-restructure-project-as-clean-modular-monolith-no-ddd-no-test-files.md), [03](../companies/03-story-company-management-api.md), [04](../countries/04-story-countries-reference-data-api.md), [06](../vehicles/06-story-vehicle-management-api.md), [07](../drivers/07-story-driver-management-api.md) |
| 10 | [10-story-send-pre-trip-inspection-with-trip.md](10-story-send-pre-trip-inspection-with-trip.md) | Send the pre-trip inspection with trip creation and manage it through the trip | — | [08](08-story-trip-management-api.md), [09](../vehicle-inspections/09-story-pre-trip-vehicle-inspection.md) |
| 11 | [11-story-generate-trip-qr-code-after-creation.md](11-story-generate-trip-qr-code-after-creation.md) | Generate a QR code with the trip's url and id after the trip is created | — | [10](10-story-send-pre-trip-inspection-with-trip.md), [02](../files/02-story-shared-file-management-api.md) |
| 13 | [13-story-add-trip-origin-and-destination.md](13-story-add-trip-origin-and-destination.md) | Add the trip's origin and destination (from / to) | — | [11](11-story-generate-trip-qr-code-after-creation.md), [12](../auth/12-story-basic-jwt-authentication-with-email-and-password.md) |
| 14 | [14-story-add-trip-contract-number.md](14-story-add-trip-contract-number.md) | Add a contract number to every trip | — | [08](08-story-trip-management-api.md), [13](13-story-add-trip-origin-and-destination.md) |

## Dependency notes

- **Story 14 implemented 2026-11-09:** `contractNumber` (`YYYYMMDD-NNNN`, sequence per trip date, assigned on create under an advisory lock, never changed or reused, backfilled). The contract itself is printed by the front end (Story 18) from the browser; the backend renders no PDF (a Puppeteer plan was dropped the same day).

- **Story 13 implemented 2026-11-09:** required free-text `origin` / `destination` on create (nullable columns, `null` for older trips); `search` also matches them. Verified with curl (400 without the fields, trim, PATCH one field, `null` rejected, search with filters, `null` on old trips; migration `1793458800000-AddOriginAndDestinationToTrips` applied, no drift). Breaking for clients that create trips: ship with front-end Story 17.
- **Status:** Story 08 and Story 10 implemented 2026-10-31. Since Story 10, `POST /trips` requires the pre-trip inspection, `PATCH /trips/:id` edits it, and every trip response includes it. TripsModule imports TripInspectionsModule (one direction only).
- **Story 11 implemented 2026-10-31:** after the create transaction commits, TripsService renders a PNG QR code of the plain trip url `<TRIP_QR_BASE_URL>/<trip id>`, uploads it through `FilesService` (`ownerType: "trips"`) and stores its path in the new `trips.qr_code_url`; best effort on create, `POST /trips/:id/qr-code` regenerates. TripsModule imports FilesModule (one direction only).
- Builds on Story 01 (`ValidationPipe`, `AllExceptionsFilter` 23505 → 409) and Story 03's crud-foundation pieces (`BaseRepository`, `BaseListQueryDto`, pagination, `escapeLike`).
- The **vehicles**, **countries** and **drivers** modules were implemented before their plan files; those plans now exist ([countries 04](../countries/04-story-countries-reference-data-api.md), [vehicles 06](../vehicles/06-story-vehicle-management-api.md), [drivers 07](../drivers/07-story-driver-management-api.md)). Story 08 follows them as the pattern and references `vehicles` / `drivers` by foreign key. `NN` 08 comes after drivers (07): trips is the latest business story.
- **Touches the drivers module once:** adds a public `DriversService.exists(id)` (same as `VehiclesService.exists`). No other module outside `trips` changes besides `app.module.ts`.
- First two-way relation (Trip 1 → N Passenger) and first service that uses an explicit `DataSource.transaction`. Later child-list features should reuse the same "replace the list in the parent's transaction" approach.
- Follow-ups left open by the intake: passenger nationality as a countries FK, double-booking checks, vehicle capacity, company scoping of trips (with auth).
