# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/drivers/driver-management-pages/intake.md`

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit.

---

## Feature

- **Feature name (display):** Drivers
- **Feature slug (folder under `plans/`):** `drivers`

## Tracker (metadata only)

- **Tracker type:** `none`
- **Work item id:** ``
- **Work item type:** `Story`
- **Status:** `New`
- **Labels:** `frontend`, `drivers`, `backend-story-07`

---

## Title

```text
Driver management pages and a driver picker for other features
```

---

## Description

```text
Backend Story 07 (backend/contracts/drivers.md): a driver has a name, an
identity id (national ID / iqama, unique), a nationality (country) and an
assigned vehicle.

Pages:
- /drivers — paginated list. search matches name and identity id. Filters:
  nationality (nationalityId, countries picker) and vehicle (vehicleId,
  vehicles picker), kept in the URL. Columns: name, identity id, nationality,
  vehicle, last updated, actions. The API returns only ids; names come from
  useAllCountries (Story 07) and useAllVehicles (Story 08).
- /drivers/new and /drivers/:id/edit — form: name (trimmed, 2–256),
  identityId (trimmed, 1–50), nationality (required), vehicle (required).
  API errors: 409 "Identity id is already in use", 400 "Country <id> does
  not exist" / "Vehicle <id> does not exist", 404 on edit.
- Delete asks for confirmation (soft delete; trips keep their driverId, new
  trips cannot use the driver).

For the trips feature (Story 11), export from index.ts: Driver type,
useAllDrivers() (all pages, cached 5 minutes), DriverSelect (label
"name (identity id)"), formatDriverLabel.

Sidebar item "Drivers".
```

---

## Acceptance criteria

```text
- [ ] /drivers lists, searches, paginates; nationality and vehicle filters
      work and stay in the URL.
- [ ] Nationality and vehicle names show in the list.
- [ ] Create and edit with validation; duplicate identity id shows the API
      message.
- [ ] Unknown id on edit shows "Driver <id> not found".
- [ ] Delete asks first and removes the row.
- [ ] npm run build and npm run lint pass.
```

---

## Dependencies

- **Blocked by:** Story 03, Story 07 (countries: `Country`, `useAllCountries`, `CountrySelect`, `formatCountryName`), Story 08 (vehicles: `Vehicle`, `useAllVehicles`, `VehicleSelect`, `formatVehicleLabel`).
- Backend Story 07 (implemented).

## Out of scope

- Driver details page, licences / documents, availability, tests.
