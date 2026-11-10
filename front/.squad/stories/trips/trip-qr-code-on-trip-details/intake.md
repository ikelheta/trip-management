# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/trips/trip-qr-code-on-trip-details/intake.md`

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
- **Labels:** `frontend`, `trips`, `qr-code`, `backend-story-11`

---

## Title

```text
Show, download, print and regenerate the trip QR code on the trip details page
```

---

## Description

```text
Covers backend Story 11 (backend/contracts/trips.md "QR code",
POST /api/trips/:id/qr-code; backend/contracts/files.md download).

On /trips/:id add a "QR code" card next to the trip details:
- qrCodeUrl set: the 512×512 PNG, loaded with the token (files feature
  AuthImage; <img src> cannot send the header). Buttons:
  - Download PNG (files feature downloadFile, name trip-<id>-qr.png),
  - Print (prints only the code with the trip name, date and time),
  - Regenerate (POST /api/trips/:id/qr-code -> 200 Trip with a new
    qrCodeUrl; the old file is deleted; the encoded url stays the same, so
    printed codes keep working).
- qrCodeUrl null (generation failed on create, or an old trip): "This trip
  has no QR code yet" + "Generate QR code" (same endpoint).
- Errors: 404 "Trip <id> not found", 415 when the server does not allow
  image/png, download failures.
- Info note: the code opens <TRIP_QR_BASE_URL>/<trip id>, an API address that
  needs sign-in since auth, so a phone shows an error until a public trip
  page exists.
```

---

## Acceptance criteria

```text
- [ ] A new trip's details page shows its QR code image.
- [ ] Download saves trip-<id>-qr.png; Print shows only the code and caption.
- [ ] Regenerate shows a new image (new qrCodeUrl) without a page reload.
- [ ] A trip with qrCodeUrl null shows "Generate QR code"; clicking it shows
      the image.
- [ ] npm run build and npm run lint pass.
```

---

## Dependencies

- **Blocked by:** Story 11 (trip details page, `tripKeys`), Story 05 (files: `AuthImage`, `downloadFile`).

## Out of scope

- A public trip page behind the QR url (backend work), bulk printing, custom QR sizes, tests.
