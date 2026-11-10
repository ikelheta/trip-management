# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/vehicles/add-vehicles-module-to-register-company-vehicles-with-unique-plate-numbers/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):** Vehicles — Company Fleet
- **Feature slug (folder under `plans/`):** `vehicles`

## Tracker (metadata only)

- **Tracker type:** `none`
- **Work item id:** `` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `User story`
- **Status:** `Done`
- **Assignee:** ``
- **Labels:** `vehicles, fleet, crud`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```text
Add Vehicles module to register company vehicles with unique plate numbers
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```text
As an operations admin, I want to register each leasing company's vehicles, so
that trips and drivers can be assigned to a real vehicle.

Add a `vehicles` module to the existing Clean Modular Monolith. Follow the
crud-foundation conventions exactly (BaseRepository, BaseListQueryDto,
PaginatedResult, escapeLike, response DTO mapped in the controller), using the
companies module as the worked example:
- Controller -> Service -> Repository. No DDD constructs.
- Controller handles HTTP only (DTOs, ParseUUIDPipe, status codes, mapping
  entities to VehicleResponseDto).
- Service holds the rules (uniqueness -> 409, unknown company -> 400,
  not found -> 404).
- VehiclesRepository extends BaseRepository<Vehicle> and adds only the
  paginated search query and softDelete.
- Keep ESM conventions (.js import suffixes, nodenext).

Vehicle fields (strings are trimmed before validation):
- plateNumber  required string, 1-50, unique among non-deleted vehicles
- model        required string, 1-256
- type         required string, 1-256 (free text, e.g. "Bus", "Van")
- companyId    required uuid, FK to companies, must be an existing
               non-deleted company

Endpoints (under the global /api prefix):
- POST   /vehicles        JSON body -> 201 vehicle
- GET    /vehicles        page, limit, search, companyId -> { data, meta },
                          newest first; search matches plateNumber, model, type
- GET    /vehicles/:id    -> vehicle
- PATCH  /vehicles/:id    partial JSON body -> vehicle
- DELETE /vehicles/:id    -> 204, soft delete

CompaniesService gains a public exists(id) so VehiclesService can check a
company id without importing the companies repository. VehiclesService exposes
exists(id) for drivers and trips.
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```text
Entity & migration
- [ ] Vehicle entity (table "vehicles") extends BaseEntity and adds plateNumber
      (plate_number varchar 50), model (varchar 256), type (varchar 256),
      companyId (company_id uuid) and deletedAt (@DeleteDateColumn).
- [ ] company_id is a FK to companies(id) ON DELETE RESTRICT, named
      FK_vehicles_company_id, and indexed (IDX_vehicles_company_id).
- [ ] Partial unique index UQ_vehicles_plate_number on plate_number where
      deleted_at IS NULL.
- [ ] A hand-written TypeORM migration creates the table; synchronize stays
      disabled; migration:generate reports no drift.

Validation
- [ ] All four fields are required on create; strings are trimmed and length
      checked; companyId must be a uuid. Violations return 400.
- [ ] PATCH accepts any subset of the same fields; null for any field returns
      400 (not 500). Unknown body fields return 400.
- [ ] Invalid list query (page=0, limit=101, companyId=abc) returns 400.

CRUD
- [ ] Unknown or soft-deleted companyId on create or update returns 400.
- [ ] Duplicate plateNumber on create or update returns 409; PATCH with the
      vehicle's own plate number succeeds.
- [ ] GET /api/vehicles returns { data, meta }, newest first; search is
      case-insensitive over plateNumber, model and type and treats % and _
      literally; companyId narrows the list and combines with search.
- [ ] GET/PATCH/DELETE on an unknown or soft-deleted id return 404; a non-uuid
      id returns 400.
- [ ] DELETE soft-deletes and returns 204; the plate number can be reused.
- [ ] All endpoints return VehicleResponseDto, never the entity.
- [ ] VehiclesModule exports only VehiclesService; VehiclesService.exists(id)
      is public.

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

- **Blocked by / related ids:** project-structure (Story 01), companies (Story 03 — crud-foundation pieces and the companies table).
- **Depends on code areas or other stories:** src/common/{dto,repositories,utils},
  src/common/entities/base.entity.ts, src/modules/companies (pattern + CompaniesService.exists).
- **Blocks:** drivers (`drivers.vehicle_id` FK, `VehiclesService.exists`), trips (`trips.vehicle_id` FK).

## Extra notes (optional)

- Plate numbers are compared exactly after trimming: "ABC 123" and "abc123" are
  different plates. Normalization is a follow-up if the product wants it.
- Several drivers may be assigned to the same vehicle (no limit in this story).

## Technical hints (optional)

- Stack: NestJS 12, TypeScript 6, ESM, oxlint, prettier, TypeORM 1.x + pg.
- The global exception filter already maps Postgres unique violations (23505) to 409.
- `PartialType(..., { skipNullProperties: false })` is needed so null is
  validated instead of reaching NOT NULL columns.
- TypeORM's primary key name is `"PK_" + sha1("<table>_id").substring(0, 27)`.

## Out of scope

- What this story explicitly does **not** cover:
  - Vehicle documents/images, capacity, year, VIN, status or any other column.
  - Plate number normalization or case-insensitive uniqueness.
  - Blocking or cascading when the owning company is soft-deleted.
  - Nested company data in responses (ids only).
  - Authorization / company scoping, tests, Docker, CI/CD.
