# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/vehicle-inspections/add-pre-trip-vehicle-inspection-with-configurable-checklist/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):** Vehicle Inspections — Pre-trip Inspection with Configurable Checklist
- **Feature slug (folder under `plans/`):** `vehicle-inspections`

## Tracker (metadata only)

- **Tracker type:** `none`
- **Work item id:** `` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `User story`
- **Status:** `New`
- **Assignee:** ``
- **Labels:** `inspections, trips, vehicles, safety, core-domain`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```text
Add pre-trip vehicle inspection with a configurable checklist of indicators and checks
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```text
User story: as a leasing company operator, before a trip starts I want to
record a vehicle inspection against a standard checklist (each check good /
not good, with a note), so that I have a safety record for every trip and can
see which checks failed.

Product context: trips (Story 08) use one vehicle and one driver. Each trip
gets one pre-trip inspection of its vehicle.

Two parts:

A) Configurable checklist (admin data)
   The checklist is made of INDICATORS (groups), each with many CHECKS.
   Both live in the database and can be managed through the API.
   Every indicator and check has an Arabic and an English name and a sort order.

   Initial data (seeded, safe to re-run):

   1. فحص مؤشرات لوحة القيادة | Dashboard Indicators
      - مؤشر الوقود | Fuel gauge
      - مؤشر الحرارة | Temperature gauge
      - مؤشر ضغط الزيت | Oil pressure gauge
      - لمبة فحص المحرك | Check engine light
      - لمبة ABS | ABS Light
      - لمبات التحذير | Warning Light

   2. الفحص الخارجي | External Inspection
      - الإطارات وضغط الهواء | Tires and Air pressure
      - الأنوار الأمامية والخلفية | Headlights and Taillights
      - الإشارات التحذيرية | Warning Signals
      - الزجاج والمرايا | Glass and Mirrors
      - عدم وجود تسربات | No leaks

   3. أدوات السلامة | Safety Requirements
      - طفاية حريق سارية الصلاحية | Valid Fire Extinguisher
      - مثلث تحذيري | Warning Triangle
      - حقيبة إسعافات أولية | First Aid Kit
      - مطرقة كسر الزجاج | Glass Breaker Hammer
      - أحزمة الأمان | Safety Belts

   Indicator fields: nameAr, nameEn (2-256, each unique among non-deleted
   indicators), sortOrder (integer 0-1000, default 0).
   Check fields: indicatorId (existing indicator), nameAr, nameEn (2-256,
   each unique within its indicator among non-deleted checks), sortOrder.

B) Trip inspection (one per trip)
   An inspection belongs to exactly one trip (tripId). A trip has at most one
   live inspection.
   Inspection fields: inspectedAt (optional ISO timestamp, defaults to now).
   For EVERY check of the checklist the inspection stores a result:
   - status  required boolean (true = good, false = not good)
   - note    optional string, 1-500 chars, nullable

   On create, the client must send exactly one result for every current
   (non-deleted) check — no missing, unknown, deleted or duplicate checks.
   Each result keeps a snapshot of the indicator and check names and sort
   orders at inspection time, so renaming or deleting a check later does not
   change past inspections.

Modules (Clean Modular Monolith, same rules as drivers / trips):
- Controller -> Service -> Repository. No DDD constructs.
- Repositories extend BaseRepository. ESM .js import suffixes.
- Entities mapped to response DTOs in the controller.

src/modules/inspection-checklist/   (indicators + checks, seeded)
src/modules/trip-inspections/       (inspections + results)

Endpoints (under the global /api prefix):

Checklist
- POST   /inspection-indicators          -> 201 indicator
- GET    /inspection-indicators          -> full checklist: all indicators with
                                            their checks, sorted (not paginated)
- GET    /inspection-indicators/:id      -> indicator with checks
- PATCH  /inspection-indicators/:id      -> indicator
- DELETE /inspection-indicators/:id      -> 204 soft delete; 409 while it still
                                            has checks
- POST   /inspection-checks              -> 201 check
- GET    /inspection-checks/:id          -> check
- PATCH  /inspection-checks/:id          -> check (may move to another indicator)
- DELETE /inspection-checks/:id          -> 204 soft delete

Trip inspection
- POST   /trips/:tripId/inspection       -> 201 inspection (409 if the trip has one)
- GET    /trips/:tripId/inspection       -> inspection
- PATCH  /trips/:tripId/inspection       -> inspection (inspectedAt and/or some results)
- DELETE /trips/:tripId/inspection       -> 204 soft delete (a new one can then be created)

Inspection response: id, tripId, inspectedAt, passed (all checks good),
failedCount, indicators[] { indicatorId, nameAr, nameEn, passed,
checks[] { checkId, nameAr, nameEn, status, note } }, createdAt, updatedAt.
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```text
Entities, migrations, seed
- [ ] inspection_indicators: nameAr, nameEn (varchar 256, partial unique
      where deleted_at IS NULL), sortOrder (int, default 0), deletedAt.
- [ ] inspection_checks: indicatorId (FK RESTRICT), nameAr, nameEn
      (partial unique per indicator), sortOrder, deletedAt.
- [ ] trip_inspections: tripId (FK trips RESTRICT, partial unique where
      deleted_at IS NULL), inspectedAt (timestamptz), deletedAt.
- [ ] trip_inspection_results: inspectionId (FK CASCADE), checkId (FK
      inspection_checks RESTRICT), status (boolean), note (varchar 500,
      nullable), snapshot columns (indicatorId, indicator names and sort
      order, check names and sort order); unique (inspection_id, check_id).
- [ ] Hand-written migrations; synchronize stays disabled; no drift.
- [ ] `npm run seed` inserts the 3 indicators and 16 checks above; re-running
      inserts nothing; indicators deleted by an admin are not brought back.

Checklist API
- [ ] Indicator/check CRUD with the validation above; duplicate names -> 409.
- [ ] GET /inspection-indicators returns every live indicator with its live
      checks, both sorted by sortOrder then nameEn.
- [ ] Creating or moving a check to an unknown/deleted indicator -> 400.
- [ ] Deleting an indicator that still has live checks -> 409.
- [ ] Unknown/soft-deleted id -> 404; non-uuid -> 400; unknown fields -> 400.

Trip inspection API
- [ ] Unknown or soft-deleted trip -> 404.
- [ ] Second live inspection for the same trip -> 409.
- [ ] Create requires a result for every live check, exactly once; missing,
      unknown/deleted or duplicate checkIds -> 400 naming the offending ids.
- [ ] No live checks configured -> 400.
- [ ] Inspection and its results are written in one transaction.
- [ ] PATCH may change inspectedAt and replace status + note of any subset of
      the inspection's own checks; a checkId not in the inspection -> 400.
- [ ] Response groups results by indicator (snapshot names and order) and
      includes passed and failedCount.
- [ ] Renaming or deleting a check after an inspection does not change that
      inspection's response.
- [ ] DELETE soft-deletes; afterwards GET -> 404 and a new POST is allowed.

Module boundaries
- [ ] TripInspectionsModule uses only TripsService.exists (new) and
      InspectionChecklistService.findActiveChecks from other modules.
- [ ] Nothing outside the two new modules imports from them except
      app.module.ts and the seed files.

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

- **Blocked by / related ids:** trips (Story 08) must be implemented first.
- **Depends on code areas or other stories:** src/modules/trips (TripsService,
  gains exists), src/common (BaseEntity, BaseRepository), src/database/seeds
  (countries seed as the pattern), countries module (nameAr/nameEn uniqueness pattern).

## Extra notes (optional)

- A note is not required when a check fails. Making it required for
  status=false is a one-line rule if the product wants it.
- Checks added to the checklist after an inspection are not part of that
  inspection and cannot be added to it by PATCH (delete and re-create instead).
- The inspection does not block the trip (a trip with failed checks can still
  be saved and edited). Blocking or trip status is a later story.
- The vehicle is the trip's vehicle; the inspection does not store vehicleId.

## Technical hints (optional)

- Indicator <-> Check and Inspection <-> Result are two-way relations: wrap the
  relation property types in TypeORM `Relation<>` (ESM circular imports), as
  Story 08 does for Trip <-> Passenger.
- TypeORM adds `deleted_at IS NULL` to joined relations unless `withDeleted`,
  so loading indicators with `relations: { checks: true }` returns live checks only.
- The global exception filter maps Postgres unique violations (23505) to 409.

## Out of scope

- What this story explicitly does **not** cover:
  - Inspections not linked to a trip (periodic vehicle inspections).
  - Listing/searching inspections across trips (reports, dashboards).
  - Photos or file attachments on checks.
  - Inspector identity / signature (comes with users + auth).
  - Blocking a trip that failed inspection, trip status.
  - Restoring soft-deleted indicators or checks.
  - Authorization rules, tests, Docker, CI/CD.
