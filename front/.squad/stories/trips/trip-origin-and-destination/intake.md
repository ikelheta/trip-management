# Story intake

- Folder: `.squad/stories/trips/trip-origin-and-destination/intake.md`

---

## Feature

- **Feature name (display):** Trips
- **Feature slug (folder under `plans/`):** `trips`

## Tracker (metadata only)

- **Tracker type:** `none`
- **Work item id:** ``
- **Work item type:** `Story`
- **Status:** `New`
- **Labels:** `frontend`, `trips`, `api-change`

---

## Title

```text
Trip origin and destination (from / to) on the trip form, list and details
```

---

## Description

```text
Backend Story 13 adds where a trip starts and ends: `origin` and
`destination` (free text, trimmed, 2–256 characters). They are REQUIRED
when creating a trip, optional on update, and null for trips created before
the change. The trip list search also matches them.
(backend/contracts/trips.md once the backend story is synced.)

Front end:
- Trip form ("New trip" and "Edit trip"): two required fields "From" and
  "To" in the Trip section, placed first because they describe the trip,
  with placeholders such as "Riyadh" / "Jeddah". Same length rules as the
  API, checked before submit; API field errors show under the field.
- Editing an old trip (no route yet) asks for From / To before saving.
- Trips list: a "Route" column showing "Riyadh → Jeddah" ("—" for old
  trips). The search label/placeholder says it searches name, from and to.
- Trip details: the route as the page description next to date and time,
  and "From" / "To" rows in the details list.
- All texts in English and Arabic; in Arabic the arrow points the reading
  direction and place names are isolated.
```

---

## Acceptance criteria

```text
- [ ] "New trip" has required "From" and "To" fields; submitting without
      them shows field errors and sends nothing.
- [ ] A created trip shows its route in the list and on the details page.
- [ ] "Edit trip" loads the saved values; changing only "To" sends only
      `destination`.
- [ ] Editing a trip created before this story requires From / To.
- [ ] Searching the list for part of a city name finds trips going from or
      to it.
- [ ] Old trips show "—" for the route.
- [ ] English and Arabic texts; right-to-left layout in Arabic.
- [ ] npm run build and npm run lint pass.
```

---

## Dependencies

- **Blocked by:** backend Story 13 (`trip-management/.squad/plans/trips/13-story-add-trip-origin-and-destination.md`) implemented and synced to `backend/`. Without it the API rejects the new fields (`property origin should not exist`); after it, the current form is rejected (`origin must be …`). Ship both together.
- Front-end Stories 11 (trip pages) and 14 (translations) — implemented.

## Out of scope

- Location pickers, maps, autocomplete or a list of known cities.
- Separate From / To filters on the trip list (search covers it).
- Showing the route in the QR code.
