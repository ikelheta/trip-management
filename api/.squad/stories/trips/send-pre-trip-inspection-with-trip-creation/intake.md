# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/trips/send-pre-trip-inspection-with-trip-creation/intake.md`
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
- **Labels:** `trips, inspections, api-change`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```text
Send the pre-trip inspection with trip creation and manage it through the trip
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```text
User story: as a leasing company operator, I record the pre-trip vehicle
inspection in the same request that creates the trip, so a trip never exists
without its inspection, and I read and correct the inspection through the trip.

Current behaviour (Stories 08 and 09):
- POST /trips creates a trip with passengers; no inspection.
- The inspection is a separate resource: POST/GET/PATCH/DELETE
  /trips/:tripId/inspection.

New behaviour:
- POST /trips REQUIRES an `inspection` object:
    { inspectedAt?: ISO timestamp, results: [{ checkId, status, note? }] }
  with the same rules as today's POST /trips/:tripId/inspection: exactly one
  result for every live checklist check (missing / unknown / deleted /
  duplicate -> 400; no checks configured -> 400).
  The trip, its passengers and its inspection are written in ONE transaction:
  any failure creates nothing.
- PATCH /trips/:id accepts an optional `inspection` object:
    { inspectedAt?, results?: [{ checkId, status, note? }] }
  same rules as today's PATCH /trips/:tripId/inspection (each listed check's
  status + note replaced; checkIds not in the inspection -> 400). It is applied
  in the same transaction as the other trip changes.
- Every trip response (POST, GET list, GET :id, PATCH) includes `inspection`
  with today's inspection response shape (passed, failedCount, indicators[]
  with checks[]). `inspection` is null only for a trip that has none (trips
  created before this story).
- The /trips/:tripId/inspection endpoints are REMOVED.
- Deleting a trip soft-deletes only the trip; the inspection row stays (it is
  unreachable through a deleted trip).

Module structure:
- trips -> trip-inspections -> inspection-checklist (one direction only).
  trip-inspections no longer imports trips and has no controller;
  TripInspectionsService becomes an internal service for TripsService
  (prepare, createForTrip, updateForTrip, findByTripId(s)).
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```text
API
- [ ] POST /trips without `inspection`, or with `inspection: null` -> 400.
- [ ] POST /trips with missing / unknown / duplicate checkIds, empty results,
      invalid status/note/inspectedAt -> 400; nothing is created.
- [ ] POST /trips when no live checks exist -> 400.
- [ ] POST /trips success -> 201 with passengers and the full inspection.
- [ ] PATCH /trips/:id with `inspection.results` replaces status + note of
      those checks; with `inspection.inspectedAt` moves the time; foreign
      checkId -> 400 and none of the PATCH (trip fields, passengers) is saved.
- [ ] PATCH /trips/:id with `inspection: null` -> 400; omitted -> unchanged.
- [ ] GET /trips and GET /trips/:id include `inspection` for every trip.
- [ ] /api/trips/:tripId/inspection routes no longer exist (404).

Structure
- [ ] TripsModule imports TripInspectionsModule; TripInspectionsModule imports
      only InspectionChecklistModule (no TripsModule, no controller).
- [ ] No schema change, no new migration.
- [ ] Stories 08 and 09 plans are marked as partly superseded by this story.

Quality
- [ ] `npm run build` and `npm run lint` pass; no test files.
```

---

## Attachments

Place files in `attachments/` next to this `intake.md`, then list them here so the planner knows what to open.

| File (relative to this folder) | What it is |
| ------------------------------ | ---------- |

None.

---

## Dependencies

- **Blocked by / related ids:** trips (Story 08) and vehicle-inspections (Story 09), both implemented.
- **Depends on code areas or other stories:** src/modules/trips, src/modules/trip-inspections.

## Extra notes (optional)

- Creating a trip now requires a seeded checklist (`npm run seed`).
- A trip without an inspection (created before this story) cannot get one
  through PATCH: PATCH `inspection` on such a trip -> 400. The local database
  has no such trips; a backfill is not needed.

## Technical hints (optional)

- Keep TripResponseDto mapping in the controller; reuse
  TripInspectionResponseDto.fromEntity for the nested inspection.
- The inspection is attached to the Trip entity as a non-column property
  (like FileEntity.url), so TripsService keeps returning Trip.

## Out of scope

- What this story explicitly does **not** cover:
  - Changing the checklist API (/inspection-indicators, /inspection-checks).
  - Replacing the whole inspection on PATCH, or deleting an inspection.
  - Backfilling inspections for existing trips.
  - Authorization rules, tests.
