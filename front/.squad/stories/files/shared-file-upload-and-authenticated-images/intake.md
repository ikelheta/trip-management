# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/files/shared-file-upload-and-authenticated-images/intake.md`

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit.

---

## Feature

- **Feature name (display):** Files
- **Feature slug (folder under `plans/`):** `files`

## Tracker (metadata only)

- **Tracker type:** `none`
- **Work item id:** ``
- **Work item type:** `Story`
- **Status:** `New`
- **Labels:** `frontend`, `files`, `images`, `backend-story-02`

---

## Title

```text
Shared file upload and authenticated image display
```

---

## Description

```text
Covers backend Story 02 (shared files, backend/contracts/files.md). No page of
its own: it gives the companies story (header / footer images) and the trips
story (QR code) the pieces they need.

API facts:
- POST /api/files multipart: file (non-empty, max 10 MB, allowed types
  image/jpeg, image/png, image/webp, application/pdf) + ownerType
  (^[a-z][a-z0-9-]{0,49}$) + optional ownerId. Upload-first flow: omit
  ownerId; the owning module links the file when the record is saved.
  -> 201 FileMetadata { id, ownerType, ownerId, originalName, storageKey,
  mimeType, sizeBytes, checksum, url, deletedAt, createdAt, updatedAt }.
  Errors: 400 'A non-empty "file" is required', 413 'File exceeds the 10 MB
  limit', 415 'File type "<type>" is not allowed'.
- GET /api/files/:id/download needs the Bearer token, so <img src> and
  <a href> cannot load files directly (401). Fetch the blob and show it
  through URL.createObjectURL; revoke the object URL when done.

Provide (src/features/files, public API in index.ts):
- uploadFile(file, ownerType) -> FileMetadata.
- useFileObjectUrl(url | null): blob loaded with the token, cached by url,
  object URL created and revoked correctly.
- AuthImage { url | null, alt, className? }: loading, error and "no image"
  states.
- ImageUploadField { id, label, ownerType, value: url | null, onChange,
  error? }: checks JPEG / PNG / WebP and 10 MB in the browser before
  uploading, uploads, shows a preview, Remove button (onChange(null)).
- downloadFile(url, fileName): saves a protected file to disk.
```

---

## Acceptance criteria

```text
- [ ] uploadFile sends multipart with the token and returns FileMetadata.
- [ ] AuthImage shows a protected image; no 401 in the Network tab.
- [ ] Object URLs are revoked on unmount / url change (no leak in dev tools).
- [ ] ImageUploadField rejects a .gif or an 11 MB file without a request;
      shows the API message for a server-side rejection.
- [ ] downloadFile saves the file with the given name.
- [ ] npm run build and npm run lint pass.
```

---

## Dependencies

- **Blocked by:** Story 02 (app foundation: `apiRequest`, `apiBlob`, `toApiPath`, `ApiError`, `Field`), Story 03 (token on requests).
- **Used by:** Story 06 (companies images), the trips QR code story.

## Extra notes (optional)

- Client checks use the backend defaults (10 MB, JPEG/PNG/WebP for images). The server stays the source of truth; its message is shown if it disagrees.
- Abandoned uploads (picked, then form cancelled) leave unlinked files on the server; the backend has no cleanup yet. Accepted.

## Out of scope

- A files page, listing an owner's files, deleting files directly (owning modules clear their urls), PDF preview, drag and drop, progress bars, tests.
