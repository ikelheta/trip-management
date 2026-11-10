# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/drivers/add-drivers-module-with-nationality-and-assigned-vehicle/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):** Drivers — Driver Registry
- **Feature slug (folder under `plans/`):** `drivers`

## Tracker (metadata only)

- **Tracker type:** `none`
- **Work item id:** `` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `User story`
- **Status:** `Done`
- **Assignee:** ``
- **Labels:** `drivers, fleet, crud`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```text
Add Drivers module with nationality and assigned vehicle
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```text
As an operations admin, I want to register drivers with their identity number,
nationality and assigned vehicle, so that trips can be planned with a known
driver.

Add a `drivers` module to the existing Clean Modular Monolith. Follow the
crud-foundation conventions exactly, using the vehicles module (the closest
module with foreign keys) as the worked example:
- Controller -> Service -> Repository. No DDD constructs.
- Controller handles HTTP only (DTOs, ParseUUIDPipe, status codes, mapping
  entities to DriverResponseDto).
- Service holds the rules (uniqueness -> 409, unknown country/vehicle -> 400,
  not found -> 404).
- DriversRepository extends BaseRepository<Driver> and adds only the
  paginated search query and softDelete.
- Keep ESM conventions (.js import suffixes, nodenext).

Driver fields (strings are trimmed before validation):
- name           required string, 2-256
- identityId     required string, 1-50 (national ID / iqama, kept as a string
                 so leading zeros survive), unique among non-deleted drivers
- nationalityId  required uuid, FK to countries, existing non-deleted country
- vehicleId      required uuid, FK to vehicles, existing non-deleted vehicle

Endpoints (under the global /api prefix):
- POST   /drivers        JSON body -> 201 driver
- GET    /drivers        page, limit, search, nationalityId, vehicleId ->
                         { data, meta }, newest first; search matches name and
                         identityId
- GET    /drivers/:id    -> driver
- PATCH  /drivers/:id    partial JSON body -> driver
- DELETE /drivers/:id    -> 204, soft delete

DriversModule imports CountriesModule and VehiclesModule and uses only
CountriesService.exists / VehiclesService.exists.
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```text
Entity & migration
- [ ] Driver entity (table "drivers") extends BaseEntity and adds name
      (varchar 256), identityId (identity_id varchar 50), nationalityId
      (nationality_id uuid), vehicleId (vehicle_id uuid) and deletedAt.
- [ ] nationality_id FK to countries(id) and vehicle_id FK to vehicles(id),
      both ON DELETE RESTRICT, named FK_drivers_nationality_id /
      FK_drivers_vehicle_id, each indexed.
- [ ] Partial unique index UQ_drivers_identity_id where deleted_at IS NULL.
- [ ] A hand-written migration creates the table after the countries and
      vehicles migrations; synchronize stays disabled; no drift.

Validation
- [ ] All four fields are required on create, trimmed and length checked;
      nationalityId and vehicleId must be uuids. Violations return 400.
- [ ] PATCH accepts any subset; null for any field returns 400 (not 500).
      Unknown body fields return 400.
- [ ] Invalid list query (page=0, vehicleId=abc) returns 400.

CRUD
- [ ] Unknown or soft-deleted nationalityId or vehicleId on create or update
      returns 400.
- [ ] Duplicate identityId on create or update returns 409; PATCH with the
      driver's own identity id succeeds.
- [ ] GET /api/drivers returns { data, meta }, newest first; search over name
      and identityId; nationalityId and vehicleId filter and combine with each
      other and with search.
- [ ] GET/PATCH/DELETE on an unknown or soft-deleted id return 404; a non-uuid
      id returns 400.
- [ ] DELETE soft-deletes and returns 204; the identity id can be reused.
- [ ] All endpoints return DriverResponseDto, never the entity.
- [ ] DriversModule exports only DriversService.

Quality
- [ ] ESM preserved; `npm run build` and `npm run lint` pass.
- [ ] No test files added.
```

---

## Attachments

Place files in `attachments/` next to this `intake.md`, then list them here so the planner knows what to open.

| File (relative to this folder) | What it is |
| ------------------------------ | ---------- |

None.

---

## Dependencies

- **Blocked by / related ids:** vehicles (Story 06), countries (Story 04 — countries table and `CountriesService.exists`).
- **Depends on code areas or other stories:** src/common (crud-foundation pieces),
  src/modules/vehicles (pattern + VehiclesService.exists), src/modules/countries.
- **Blocks:** trips (`trips.driver_id` FK; the trips story adds `DriversService.exists`).

## Extra notes (optional)

- vehicleId is required: a driver cannot be registered without a vehicle.
  Making it nullable is an open product question.
- Several drivers may share one vehicle; one-driver-per-vehicle is not enforced.
- Soft-deleting a country or vehicle does not touch drivers that point to it.

## Technical hints (optional)

- Same as the vehicles story: 23505 → 409 in the global filter,
  `skipNullProperties: false` on the update DTO, TypeORM PK naming formula.

## Out of scope

- What this story explicitly does **not** cover:
  - Driver documents (licence, iqama scans), phone, licence expiry, status.
  - Nested nationality/vehicle data in responses (ids only).
  - One-driver-per-vehicle, optional vehicle, cascading soft deletes.
  - DriversService.exists (added by the trips story).
  - Authorization / company scoping, tests, Docker, CI/CD.
