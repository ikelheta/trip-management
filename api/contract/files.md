# Files

Shared file storage used by other modules (company images, trip QR codes). Source: `src/modules/files/`.

| Method | Path | Purpose | Success |
|--------|------|---------|---------|
| POST | `/api/files` | Upload a file (multipart) | 201 |
| GET | `/api/files?ownerType=&ownerId=` | List an owner's files, newest first (**not paginated**) | 200 |
| GET | `/api/files/:id` | File metadata | 200 |
| GET | `/api/files/:id/download` | File content | 200 (binary) |
| DELETE | `/api/files/:id` | Soft-delete a file | 204 |

## Types

```ts
interface FileMetadata {
  id: string;
  ownerType: string;          // e.g. "companies", "trips"
  ownerId: string | null;     // null until the owning record links it
  originalName: string;
  storageKey: string;         // internal, do not use
  mimeType: string;           // e.g. "image/png"
  sizeBytes: number;
  checksum: string;           // sha256 hex
  url: string;                // "/api/files/<id>/download" — send in other modules' bodies; fetch it with the token to show it
  deletedAt: string | null;   // always null in responses (deleted files are 404)
  createdAt: string;
  updatedAt: string;
}
```

## POST /api/files

`Content-Type: multipart/form-data`

| Field | Required | Rules |
|-------|----------|-------|
| `file` | yes | one file, non-empty; max `FILE_MAX_SIZE_MB` (default **10 MB**); type in `FILE_ALLOWED_MIME_TYPES` (default `image/jpeg`, `image/png`, `image/webp`, `application/pdf`) |
| `ownerType` | yes | `^[a-z][a-z0-9-]{0,49}$` — the owning module, e.g. `companies` |
| `ownerId` | no | UUID. **Omit** when the owner does not exist yet (upload-first flow); the owning module links the file when you save the record |

```ts
const form = new FormData();
form.append('file', file);
form.append('ownerType', 'companies');
const res = await fetch('/api/files', { method: 'POST', body: form }); // do not set Content-Type yourself
```

**201** — `FileMetadata`:

```json
{
  "id": "3f2b8c1e-4a5d-4e6f-9a7b-1c2d3e4f5a6b",
  "ownerType": "companies",
  "ownerId": null,
  "originalName": "header.png",
  "storageKey": "b1c2d3e4-f5a6-4b7c-8d9e-0f1a2b3c4d5e.png",
  "mimeType": "image/png",
  "sizeBytes": 48213,
  "checksum": "cabc7c12970489394696eaf01a5607023d91312f4d72f3ab21bb41781413c156",
  "deletedAt": null,
  "url": "/api/files/3f2b8c1e-4a5d-4e6f-9a7b-1c2d3e4f5a6b/download",
  "createdAt": "2026-10-31T18:00:00.000Z",
  "updatedAt": "2026-10-31T18:00:00.000Z"
}
```

Errors: **400** `A non-empty "file" is required` / bad `ownerType` (`ownerType must be 1-50 lowercase letters, digits or dashes, starting with a letter`) / bad `ownerId`; **413** `File exceeds the 10 MB limit`; **415** `File type "<type>" is not allowed`.

## GET /api/files?ownerType=&ownerId=

| Query | Required | Rules |
|-------|----------|-------|
| `ownerType` | yes | same pattern as upload |
| `ownerId` | yes | UUID |

**200** — `FileMetadata[]`, newest first. Example: `GET /api/files?ownerType=trips&ownerId=a96bf08b-688d-4c09-b166-0ffe19480b05` returns that trip's QR code file(s).

## GET /api/files/:id

**200** — `FileMetadata`:

```json
{
  "id": "aa569ad1-ff2a-4e18-aeae-2b0fa5e50f6e",
  "createdAt": "2026-10-31T21:42:46.347Z",
  "updatedAt": "2026-10-31T21:42:46.347Z",
  "ownerType": "trips",
  "ownerId": "a96bf08b-688d-4c09-b166-0ffe19480b05",
  "originalName": "trip-a96bf08b-688d-4c09-b166-0ffe19480b05-qr.png",
  "storageKey": "ebc391a4-351f-4191-ada1-8b5c649bf07f.png",
  "mimeType": "image/png",
  "sizeBytes": 3965,
  "checksum": "cabc7c12970489394696eaf01a5607023d91312f4d72f3ab21bb41781413c156",
  "deletedAt": null,
  "url": "/api/files/aa569ad1-ff2a-4e18-aeae-2b0fa5e50f6e/download"
}
```

Errors: **400** bad uuid; **404** `File <id> not found`.

## GET /api/files/:id/download

**200** — the raw bytes with the stored `Content-Type` (e.g. `image/png`), `Content-Length`, `X-Content-Type-Options: nosniff` and `Content-Disposition: attachment; filename="…"; filename*=UTF-8''…`.

**Needs the token like every route**, so a plain `<img src="/api/files/<id>/download">` or `<a href>` gets **401** (the browser does not send the `Authorization` header). Fetch the bytes and use an object URL:

```ts
async function fileObjectUrl(url: string, token: string): Promise<string> {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  return URL.createObjectURL(await res.blob()); // URL.revokeObjectURL(...) when the image unmounts
}
```

- Image: `<img src={objectUrl}>`.
- "Download" button: create an `<a href={objectUrl} download={originalName}>` and click it.

Errors: **400** bad uuid; **401** no / bad token; **404** (unknown or soft-deleted file).

## DELETE /api/files/:id

**204**. The file becomes 404. Records that still hold its url show a broken image, so normally clear the url on the owning record instead (e.g. `PATCH /api/companies/:id { "headerUrl": null }` removes the old file for you).

Errors: **400** bad uuid; **404**.
