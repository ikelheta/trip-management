# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/trips/add-trip-origin-and-destination/intake.md`
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
- **Labels:** `trips, api-change, migration`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

```
Add the trip's origin and destination (from / to)
```

---

## Description

```
A trip today has a vehicle, a driver, a date and a time, but not where it
goes. Add where the trip starts and where it ends.

- Two new trip fields: `origin` (from) and `destination` (to).
- Free text, e.g. "Riyadh" → "Jeddah" or "King Khalid Airport" → "Makkah".
  There is no cities table; these are not foreign keys to countries.
- Trimmed, 2–256 characters each.
- REQUIRED on POST /api/trips. Optional on PATCH /api/trips/:id (omit =
  unchanged); null is rejected on both (a trip cannot lose its route).
- Every trip response (create, list, get, update, QR regenerate) includes
  `origin` and `destination`. Trips created before this story have `null`
  for both.
- GET /api/trips `search` also matches origin and destination (as well as
  trip name), case-insensitive partial match.
- One migration adding two nullable columns; existing rows stay valid.
- contract/ updated (trips.md types, bodies, examples, search rule,
  changelog) and synced to the front end.
```

---

## Acceptance criteria

```
- [ ] POST /api/trips without origin or destination → 400
      ("origin must be longer than or equal to 2 characters", …).
- [ ] POST with "origin": "Riyadh", "destination": "Jeddah" → 201 and both
      fields in the response, trimmed.
- [ ] PATCH with only "destination" changes it and keeps origin; "origin":
      null → 400; omitting both leaves them unchanged.
- [ ] GET /api/trips?search=jed finds a trip whose destination is "Jeddah".
- [ ] Existing trips return "origin": null, "destination": null.
- [ ] Migration up/down works; migration:generate reports no drift.
- [ ] contract/trips.md, contract/README.md (changelog, last updated) and
      contract/openapi.json updated; npm run sync:frontend run.
- [ ] npm run build and npm run lint pass.
```

---

## Attachments

None.

---

## Dependencies

- **Blocked by / related ids:** Story 08 (trips), 10 (inspection), 11 (QR code), 12 (auth) — all implemented.
- **Depends on code areas or other stories:** `src/modules/trips/` only. The React project needs a matching story (front-end Story 17) because POST without the new fields is rejected once this ships.

## Extra notes (optional)

- Names `origin` / `destination` instead of `from` / `to`: `from` and `to` are SQL keywords and awkward as column and TypeScript property names.

## Technical hints (optional)

- `TripsService.create` and `update` already copy the remaining DTO fields onto the entity (`...fields`), so the service needs no change.
- Multi-column search precedent: `src/modules/drivers/drivers.repository.ts` (array of `where` objects with a shared scope).

## Out of scope

- A cities / locations reference table, map coordinates, distance or duration.
- Requiring origin ≠ destination (round trips are allowed).
- Filtering the list by origin or destination as separate query parameters.
- Backfilling old trips.
