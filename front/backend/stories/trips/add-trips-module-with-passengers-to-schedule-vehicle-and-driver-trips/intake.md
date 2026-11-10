# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/trips/add-trips-module-with-passengers-to-schedule-vehicle-and-driver-trips/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):** Trips — Trip Scheduling with Passengers
- **Feature slug (folder under `plans/`):** `trips`

## Tracker (metadata only)

- **Tracker type:** `none`
- **Work item id:** `` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `User story`
- **Status:** `New`
- **Assignee:** ``
- **Labels:** `trips, passengers, core-domain`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```text
Add Trips module with passengers to schedule vehicle and driver trips
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```text
User story: as a leasing company operator, I want to record a trip (which
vehicle, which driver, when) together with its passenger list, so that I can
schedule trips and know exactly who travels on each one.

Product context: companies, vehicles, countries and drivers already exist.
Trips are the next business module. A trip uses one vehicle and one driver
and carries many passengers.

Add a `trips` module to the existing Clean Modular Monolith, following the
drivers / vehicles modules (the latest modules on the crud-foundation pieces):
- Controller -> Service -> Repository. No DDD constructs.
- Controller handles HTTP only (DTOs, ParseUUIDPipe, status codes) and maps
  entities to response DTOs.
- Service holds the rules (vehicle/driver existence, passenger list writes).
- Repositories extend the shared BaseRepository.
- Keep ESM conventions (.js import suffixes, nodenext).
- Only create subfolders that hold something.

Trip fields (all strings are trimmed before validation):
- secretCode   optional string, 1-50 chars, nullable
- vehicleId    required uuid, FK to vehicles, must be an existing non-deleted vehicle
- driverId     required uuid, FK to drivers, must be an existing non-deleted driver
- date         required date of the trip, "YYYY-MM-DD"
- time         required time of the trip, "HH:mm" or "HH:mm:ss" (24h)
- tripName     optional string, 2-256 chars, nullable

Passenger fields (table "passengers", one trip has many passengers,
each passenger belongs to exactly one trip):
- name            required string, 2-256 chars
- identityNumber  required, digits only, 1-50 digits (see Extra notes)
- docType         required string, 1-50 chars (e.g. "national_id", "iqama", "passport")
- nationality     required string, 2-256 chars

Passengers are managed through the trip (nested), not through their own
endpoints:
- POST /trips accepts an optional `passengers` array (omitted = no passengers).
- PATCH /trips/:id with `passengers` REPLACES the whole list ([] clears it);
  omitting `passengers` leaves the list unchanged.
- Trip row and passenger rows are written in one database transaction.
- The same identityNumber cannot appear twice in one trip.

Target structure:

src/modules/trips/
├── trips.module.ts
├── trips.controller.ts
├── trips.service.ts
├── trips.repository.ts
├── passengers.repository.ts
├── dto/
│   ├── create-trip.dto.ts
│   ├── update-trip.dto.ts
│   ├── create-passenger.dto.ts
│   ├── list-trips-query.dto.ts
│   ├── trip-response.dto.ts
│   └── passenger-response.dto.ts
└── entities/
    ├── trip.entity.ts
    └── passenger.entity.ts

Endpoints (under the global /api prefix):
- POST   /trips          JSON body (with optional passengers) -> 201 trip with passengers
- GET    /trips          paginated list { data, meta }, filters below
- GET    /trips/:id      -> trip with passengers
- PATCH  /trips/:id      partial JSON body -> trip with passengers
- DELETE /trips/:id      -> 204, soft delete

List query: page, limit, search (tripName), vehicleId, driverId,
dateFrom, dateTo (inclusive). Ordered by date, then time, newest first.
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```text
Entities & migrations
- [ ] Trip entity (table "trips") extends BaseEntity and adds: secretCode
      (varchar 50, nullable), vehicleId (uuid, FK vehicles RESTRICT, indexed),
      driverId (uuid, FK drivers RESTRICT, indexed), date (date, indexed),
      time (time), tripName (varchar 256, nullable), deletedAt (@DeleteDateColumn).
- [ ] Passenger entity (table "passengers") extends BaseEntity and adds:
      tripId (uuid, FK trips ON DELETE CASCADE), name (varchar 256),
      identityNumber (varchar 50), docType (varchar 50), nationality (varchar 256).
- [ ] Unique index on passengers (trip_id, identity_number).
- [ ] Trip 1 -> N Passenger relation is mapped on both entities.
- [ ] Hand-written TypeORM migrations create both tables; synchronize stays
      disabled; migration:generate reports no drift.

Validation
- [ ] vehicleId, driverId, date, time are required on create; secretCode and
      tripName are optional and may be null.
- [ ] date must be a real calendar date in "YYYY-MM-DD"; time must be "HH:mm"
      or "HH:mm:ss" (00:00-23:59). Otherwise 400.
- [ ] Each passenger: name, identityNumber (digits only), docType, nationality
      required with the lengths above; otherwise 400.
- [ ] Duplicate identityNumber inside one request's passengers -> 400.
- [ ] At most 100 passengers per trip -> otherwise 400.
- [ ] PATCH accepts any subset; null for vehicleId, driverId, date, time or
      passengers -> 400; null for secretCode / tripName clears them.
- [ ] Unknown body fields (top level or inside a passenger) return 400.

CRUD
- [ ] Unknown or soft-deleted vehicleId / driverId on create or update -> 400.
- [ ] Create and PATCH return the trip with its passengers.
- [ ] PATCH with passengers replaces the whole list atomically; without it the
      list is unchanged.
- [ ] GET /trips is paginated ({ data, meta }), filters by vehicleId,
      driverId, dateFrom, dateTo, searches tripName, newest date/time first.
      dateFrom after dateTo -> 400.
- [ ] GET/PATCH/DELETE on an unknown or soft-deleted id -> 404; non-uuid id -> 400.
- [ ] DELETE soft-deletes the trip and returns 204; it disappears from lists.

Module boundaries
- [ ] TripsModule imports VehiclesModule and DriversModule and uses only
      VehiclesService.exists / DriversService.exists.
- [ ] DriversService gains a public exists(id) (same as VehiclesService.exists).
- [ ] Nothing outside src/modules/trips imports from it except app.module.ts.

Quality
- [ ] ESM setup preserved; `npm run build` and `npm run lint` pass.
- [ ] No test files added; nest-cli spec generation stays disabled.
```

---

## Attachments

Place files in `attachments/` next to this `intake.md`, then list them here so the planner knows what to open.

| File (relative to this folder) | What it is |
| ------------------------------ | ---------- |

None.

---

## Dependencies

- **Blocked by / related ids:** project-structure (Story 01), companies (Story 03, crud-foundation pieces), countries (Story 04), vehicles (Story 06) and drivers (Story 07).
- **Depends on code areas or other stories:** src/common (BaseEntity, BaseRepository,
  BaseListQueryDto, pagination and LIKE-escape helpers), src/modules/vehicles
  (VehiclesService.exists), src/modules/drivers (DriversService, gains exists).

## Extra notes (optional)

- **identityNumber is "a number" in the request, but is stored and sent as a
  string of digits** ("0123456789"). A JSON number would drop leading zeros
  and a 10-digit Saudi ID (2xxxxxxxxx) overflows a Postgres integer. Drivers
  already store their identity id as a string.
- **nationality is free text here**, unlike drivers, which reference the
  countries table by nationalityId. Switching passengers to a countries FK is a
  follow-up if the product wants it.
- **secretCode is returned in responses.** If it must be hidden from some
  callers, that comes with the auth story.
- The driver is not required to be the driver assigned to the vehicle
  (drivers.vehicleId); trips may pair any existing vehicle and driver.
- Trips in the past are allowed (historical records).

## Technical hints (optional)

- Stack: NestJS 12, TypeScript 6, ESM, oxlint, prettier, TypeORM + pg, Swagger
  CLI plugin with introspectComments (JSDoc on DTO fields becomes the docs).
- Trip <-> Passenger is the first two-way relation: wrap relation property types
  in TypeORM's `Relation<>` to avoid ESM circular-import errors.
- TypeORM hydrates `date` columns as "YYYY-MM-DD" strings and Postgres returns
  `time` as "HH:mm:ss".
- The global exception filter maps Postgres unique violations (23505) to 409.

## Out of scope

- What this story explicitly does **not** cover:
  - Separate passenger endpoints (/trips/:id/passengers/...).
  - Driver/vehicle double-booking checks (same driver or vehicle at the same date/time).
  - Vehicle capacity vs passenger count.
  - Linking trips to a company / tenant scoping (auth story).
  - Searching trips by passenger name or identity number.
  - Trip status (planned, in progress, done), routes, stops, pricing.
  - Authorization rules, tests, Docker, CI/CD.
