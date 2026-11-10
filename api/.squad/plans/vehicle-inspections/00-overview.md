# vehicle-inspections — plan overview

Entry point for the **vehicle-inspections** feature. Stories execute in order by their `NN` prefix.

## Stories

| NN | File | Title | Tracker id | Depends on |
|----|------|-------|------------|------------|
| 09 | [09-story-pre-trip-vehicle-inspection.md](09-story-pre-trip-vehicle-inspection.md) | Add pre-trip vehicle inspection with a configurable checklist of indicators and checks | — | [08](../trips/08-story-trip-management-api.md), [03](../companies/03-story-company-management-api.md) |

## Dependency notes

- **Status: implemented 2026-10-31** (after Story 08). **Changed by [Story 10](../trips/10-story-send-pre-trip-inspection-with-trip.md):** the inspection is now sent with `POST /trips` and edited through `PATCH /trips/:id`; the `/trips/:tripId/inspection` endpoints are gone and `trip-inspections` is an internal module used by `trips`.
- **Requires Story 08 implemented**: inspections reference `trips` by FK, and the story adds `TripsService.exists` to the trips module.
- Adds two modules: `inspection-checklist` (indicators + checks, admin-managed, seeded with 3 indicators / 16 checks) and `trip-inspections` (one live inspection per trip, one result per check).
- Inspection results **snapshot** indicator/check names and sort orders, so the checklist can change without rewriting past inspections. Checklist rows are only ever soft-deleted.
- Extends `npm run seed` (`src/database/seeds/run-seeds.ts`) with the checklist seed, following the countries seed.
- Follow-ups left open by the intake: periodic inspections without a trip, cross-trip inspection reports, photos per check, inspector identity (auth), blocking trips that failed inspection.
