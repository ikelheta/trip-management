# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/trips/generate-trip-qr-code-after-creation/intake.md`
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
- **Labels:** `trips, files, qr-code, api-change`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```text
Generate a QR code with the trip's url and id after the trip is created
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```text
User story: as a leasing company operator, when I create a trip the system
generates a QR code for it, so the driver or a checkpoint can scan it and get
the trip's id and the url to open the trip.

Current behaviour (Stories 08 and 10):
- POST /trips creates the trip, its passengers and its inspection in one
  transaction. There is no QR code.

New behaviour:
- After the trip's transaction commits, the API generates a PNG QR code whose
  content is the trip's full url, which contains the trip id:
    <TRIP_QR_BASE_URL>/<trip id>
  e.g. http://localhost:3000/api/trips/3f0c…
  Plain url text, so a phone camera opens it directly.
- TRIP_QR_BASE_URL is a new environment variable (default
  http://localhost:3000/api/trips). A trailing slash is ignored.
- The PNG is stored through the shared Files module (FilesService.upload,
  ownerType "trips", ownerId = trip id), and its download path is saved on the
  trip in a new nullable column trips.qr_code_url.
- Every trip response (POST, GET list, GET :id, PATCH) includes
  `qrCodeUrl` (e.g. "/api/files/<file id>/download"), or null when the trip
  has none (trips created before this story, or generation failed).
- QR generation is best effort on create: the trip is already committed, so a
  failure (encoding, storage, image/png not allowed) is logged and POST /trips
  still returns 201 with qrCodeUrl null.
- POST /trips/:id/qr-code (re)generates the QR code for an existing trip:
  creates a new file, saves its url on the trip, soft-deletes the previous QR
  file, and returns the trip. Errors are returned to the client here.
- qrCodeUrl is read-only: clients cannot send it on POST or PATCH.
- PATCH /trips/:id does not touch the QR code (the id never changes).
- The QR code never contains secretCode or passenger data.
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```text
API
- [ ] POST /trips -> 201 with a non-null qrCodeUrl; GET on that url returns an
      image/png that decodes to exactly "<base>/<trip id>", and a phone
      camera offers to open it.
- [ ] GET /trips and GET /trips/:id include qrCodeUrl for every trip.
- [ ] POST /trips with qrCodeUrl in the body -> 400 (not whitelisted);
      PATCH /trips/:id with qrCodeUrl -> 400.
- [ ] If QR generation or upload fails on create, the trip is still created
      (201, qrCodeUrl null) and the error is logged.
- [ ] POST /trips/:id/qr-code -> 200 with a new qrCodeUrl; the previous QR
      file is soft-deleted; unknown or deleted trip -> 404; non-uuid -> 400.
- [ ] Changing TRIP_QR_BASE_URL and calling POST /trips/:id/qr-code encodes
      the new base url.

Structure
- [ ] TripsModule imports FilesModule and uses only FilesService (no
      FilesRepository, no storage provider).
- [ ] One new migration adds trips.qr_code_url varchar(512) NULL;
      migration:generate reports no drift afterwards.
- [ ] TRIP_QR_BASE_URL validated in env.validation.ts and listed in
      .env.example.
- [ ] New dependency: qrcode (+ @types/qrcode as dev dependency).

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

- **Blocked by / related ids:** trips (Stories 08 and 10) and files (Story 02), all implemented.
- **Depends on code areas or other stories:** src/modules/trips, src/modules/files (used through FilesService only), src/config/env.validation.ts.

## Extra notes (optional)

- **Decided — QR content is the plain url** `<TRIP_QR_BASE_URL>/<trip id>`
  (the id is its last path segment), not JSON, so a phone camera opens it
  directly. A scanner app that needs the id takes the last path segment.
- The default TRIP_QR_BASE_URL points at the API's GET /api/trips/:id. Set it
  to a front-end page when one exists.
- Trips created before this story get a QR code only through
  POST /trips/:id/qr-code; no backfill job.

## Technical hints (optional)

- Follow the companies module for file links: a varchar(512) url column
  (like companies.header_url), FilesService for writes, failures that happen
  after the main write are logged (CompaniesService.linkImages,
  removeImageQuietly).
- FilesService.upload accepts any { originalname, mimetype, buffer }
  (UploadableFile), so a generated Buffer can be uploaded without multer.
- Keep entity -> TripResponseDto mapping in the controller.

## Out of scope

- What this story explicitly does **not** cover:
  - A public / unauthenticated trip page behind the url.
  - Signing or encrypting the QR content; putting secretCode in it.
  - Backfilling QR codes for existing trips.
  - Removing the QR file when a trip is deleted (soft delete keeps it, like the inspection).
  - Other image formats (SVG, data URLs) or sizes chosen by the client.
  - Authorization rules, tests.
