# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/trips/add-trip-contract-number/intake.md`
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
Add a contract number to every trip
```

---

## Description

```
The front end prints each trip's land transport contract (front-end Story
18, printed from the browser; the backend does not render PDFs). The
contract shows a barcode with a contract number such as "20261110-0001":
trip date (YYYYMMDD) + a 4-digit sequence per trip date.

- New trip field contractNumber, "YYYYMMDD-NNNN".
- Assigned by the server when the trip is created (sequence per trip date,
  in creation order). Not accepted in request bodies.
- Never changes (editing the trip date keeps it) and is never reused
  (soft-deleted trips keep theirs). Unique.
- Existing trips are backfilled (per date, in creation order).
- Every trip response (create, list, get, update, QR regenerate) includes it.
- contract/ updated and synced to the front end.
```

---

## Acceptance criteria

```
- [ ] Two trips created for 2026-11-10 get 20261110-0001 and 20261110-0002;
      a trip on another date starts again at 0001.
- [ ] PATCH of the trip date keeps the number; "contractNumber" in a POST or
      PATCH body → 400 (property should not exist).
- [ ] Deleting the latest trip of a date and creating another gives the next
      number, not the deleted one.
- [ ] Existing trips have a number after the migration; numbers are unique.
- [ ] Migration up/down works; migration:generate reports no drift.
- [ ] contract/ (trips.md, README changelog, openapi.json) updated and
      npm run sync:frontend run. npm run build and npm run lint pass.
```

---

## Attachments

- The contract template PDF (`statement_10-11-2026_12-14-44.pdf`) is attached to front-end Story 18; the barcode on its page 1 shows `20261110-0001`.

---

## Dependencies

- **Blocked by / related ids:** Story 08 (trips), 13 (origin / destination; latest migration) — implemented.
- **Front end:** front-end Story 18 (contract print page) shows the number under the barcode and in the trip table.

## Extra notes (optional)

- A first plan generated the PDF on the server with Puppeteer. It was replaced (2026-11-09) by printing in the browser, so this story is only the number.

## Out of scope

- Generating PDFs on the server, a contract endpoint.
- Resetting or editing numbers; other formats or prefixes.
