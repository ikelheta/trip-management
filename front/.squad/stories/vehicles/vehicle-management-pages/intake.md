# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/vehicles/vehicle-management-pages/intake.md`

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit.

---

## Feature

- **Feature name (display):** Vehicles
- **Feature slug (folder under `plans/`):** `vehicles`

## Tracker (metadata only)

- **Tracker type:** `none`
- **Work item id:** ``
- **Work item type:** `Story`
- **Status:** `New`
- **Labels:** `frontend`, `vehicles`, `backend-story-06`

---

## Title

```text
Vehicle management pages and a vehicle picker for other features
```

---

## Description

```text
Backend Story 06 (backend/contracts/vehicles.md): a vehicle has a plate number
(unique), model, type (free text, e.g. "Bus") and belongs to a company.

Pages:
- /vehicles — paginated list. search matches plate number, model and type.
  Company filter (companyId query) with the companies picker. Columns: plate
  number, model, type, company name, last updated, actions (Edit, Delete).
  The API returns only companyId; names come from the companies list
  (Story 06 useAllCompanies).
- /vehicles/new and /vehicles/:id/edit — form: plateNumber (trimmed, 1–50),
  model (1–256), type (1–256), company (required). Errors from the API:
  409 "Plate number is already in use", 400 "Company <id> does not exist",
  404 on edit for an unknown / deleted vehicle.
- Delete asks for confirmation (soft delete; drivers and trips keep their
  vehicleId, but new ones cannot use it).

For other features (drivers Story 09, trips Story 11), export from index.ts:
- Vehicle type, useAllVehicles() (all pages, cached 5 minutes),
  VehicleSelect (label "plate number — model"), formatVehicleLabel.

Sidebar item "Vehicles".
```

---

## Acceptance criteria

```text
- [ ] /vehicles lists, searches, paginates; filter by company works and is
      kept in the URL.
- [ ] Company names show in the list.
- [ ] Create and edit with validation; duplicate plate shows the API message.
- [ ] Editing an unknown id shows "Vehicle <id> not found".
- [ ] Delete asks first and removes the row.
- [ ] npm run build and npm run lint pass.
```

---

## Dependencies

- **Blocked by:** Story 03 (authentication) and Story 06 (companies: `Company`, `useAllCompanies`, `CompanySelect` from `src/features/companies/index.ts`).
- Backend Story 06 (implemented).

## Out of scope

- Vehicle details page, capacity, documents / images, tests.
