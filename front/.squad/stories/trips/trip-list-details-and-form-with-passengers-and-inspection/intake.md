# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/trips/trip-list-details-and-form-with-passengers-and-inspection/intake.md`

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit.

---

## Feature

- **Feature name (display):** Trips
- **Feature slug (folder under `plans/`):** `trips`

## Tracker (metadata only)

- **Tracker type:** `none`
- **Work item id:** ``
- **Work item type:** `Story`
- **Status:** `New`
- **Labels:** `frontend`, `trips`, `backend-story-08`, `backend-story-10`

---

## Title

```text
Trips list, details, create and edit with passengers and the pre-trip inspection
```

---

## Description

```text
Covers backend Story 08 (trips with passengers) and Story 10 (the pre-trip
inspection is required when a trip is created and edited through the trip).
Contract: backend/contracts/trips.md, backend/contracts/inspection-checklist.md.

Pages:
- /trips — paginated list (latest date/time first). Filters kept in the URL:
  search (matches trip name), vehicle, driver, dateFrom, dateTo. Columns:
  date, time, trip name, vehicle plate, driver name (the API returns only ids;
  resolve them with the vehicles / drivers "all" hooks), passenger count,
  inspection badge (Passed / N failed / No inspection), View and Edit.
  "dateFrom must be on or before dateTo" from the API is shown.
- /trips/:id — details: date, time, vehicle (plate + model), driver, secret
  code, created / updated; passengers table; inspection grouped by indicator
  (indicator passed / failed, each check Good / Faulty with its note,
  inspectedAt). Edit and Delete (confirm; soft delete).
- /trips/new — form: vehicle, driver, date, time, optional trip name (2–256)
  and secret code (1–50); passengers (add / remove rows, max 100; name 2–256,
  identityNumber 1–50 digits, docType 1–50, nationality 2–256; identity
  numbers unique within the trip); inspection section built from
  GET /api/inspection-indicators: one Good / Faulty choice and an optional
  note (≤ 500) per check, grouped by indicator, every check must be answered,
  optional "inspected at" (default now on the server); "Mark all good".
- /trips/:id/edit — same form prefilled. PATCH sends only what changed:
  scalar fields that changed; tripName / secretCode cleared with null;
  passengers only if the list changed (it replaces the whole list); only the
  inspection results whose status or note changed; inspectedAt only if
  changed. Trips without an inspection (created before Story 10) edit
  without the inspection section.
- Server errors are shown on the form (field messages on fields, others such
  as "Vehicle <id> does not exist", "Missing results for checks: …" on top).
- Sidebar item "Trips" first; the home route (/) redirects to /trips.
```

---

## Acceptance criteria

```text
- [ ] Creating a trip with 2 passengers and one faulty check shows it on the
      details page with "1 failed" and the faulty check's note.
- [ ] Unanswered checks, bad identity numbers and duplicate identity numbers
      are caught before sending.
- [ ] List filters (search, vehicle, driver, date range) and page survive a
      reload; the list shows plates and driver names.
- [ ] Edit sends only changed fields (check the request body in DevTools);
      clearing the trip name sends tripName: null.
- [ ] Delete removes the trip from the list.
- [ ] / opens the trips list.
- [ ] npm run build and npm run lint pass.
```

---

## Dependencies

- **Blocked by:** Stories 02, 03, 08 (vehicles: `useAllVehicles`, `VehicleSelect`), 09 (drivers: `useAllDrivers`, `DriverSelect`), 10 (inspection checklist: `useInspectionChecklist`).

## Out of scope

- QR code (Story 12), printing a trip sheet, double-booking warnings, passenger nationality as a country picker (the API takes free text), tests.
