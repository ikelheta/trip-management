# Story 05 — Shared file upload and authenticated image display

## Prerequisites

- **Story 02 completed:** [../app-foundation/02-story-app-shell-routing-api-client-and-shared-ui.md](../app-foundation/02-story-app-shell-routing-api-client-and-shared-ui.md) — `apiRequest` (with `formData`), `apiBlob`, `toApiPath`, `ApiError`, `Field`, global CSS.
- **Story 03 completed:** [../authentication/03-story-login-session-and-protected-routes.md](../authentication/03-story-login-session-and-protected-routes.md) — every request carries the token (downloads included).
- Intake: [../../stories/files/shared-file-upload-and-authenticated-images/intake.md](../../stories/files/shared-file-upload-and-authenticated-images/intake.md).
- API contract: `backend/contracts/files.md` (covers backend Story 02).
- **Do not start until `npm run build` passes on the current `src/`.**

---

## Story Goal

A `files` feature with no page, used by companies (Story 06) and the trip QR code story:

1. `uploadFile(file, ownerType)` — multipart upload (upload-first: no `ownerId`).
2. `useFileObjectUrl(url)` — protected file → object URL, cached per url, revoked when no longer used.
3. `AuthImage` — `<img>` for a protected url, with loading / error / empty states.
4. `ImageUploadField` — pick an image, check type and size in the browser, upload, preview, remove.
5. `downloadFile(url, fileName)` — save a protected file to disk.

**Not in scope:** a files page, listing or deleting files directly, PDF preview, drag and drop, upload progress, tests.

**Hard constraints for the executor:**

- Conventions of `src/README.md` / Stories 02–03 (no semicolons, import extensions, `import type`, no `any`, named exports, `.tsx` files export only components).
- All code in `src/features/files/`; other features import it only through `src/features/files/index.ts`.
- Never put a file url in `<img src>` or `<a href>` directly: the download route needs the `Authorization` header (`backend/contracts/files.md`).
- Do not set `Content-Type` for uploads; `apiRequest` with `formData` lets the browser add the multipart boundary.
- No new dependencies.

---

## Context — Read These Files First

1. `backend/contracts/files.md` — whole file: `FileMetadata`, upload rules, error messages, the download note.
2. `src/shared/services/httpClient.ts` — `apiRequest` (`formData` option), `apiBlob(path, signal)`, `toApiPath(url)`, `ApiError`.
3. `src/shared/components/ui/Field.tsx` — label / hint / error wrapper.
4. `src/app/providers/queryClient.ts` — default `staleTime`, retry rules.
5. `src/shared/styles/index.css` — `input`, `btn*`, `muted`.

---

## Implementation tasks

### 1 — Types and rules

**New file: `src/features/files/types/files.ts`**

```ts
/** backend/contracts/files.md `FileMetadata`. */
export interface FileMetadata {
  id: string
  ownerType: string
  ownerId: string | null
  originalName: string
  /** Internal to the backend; do not use. */
  storageKey: string
  mimeType: string
  sizeBytes: number
  checksum: string
  /** "/api/files/<id>/download" — send it in other modules' bodies; load it with useFileObjectUrl. */
  url: string
  deletedAt: string | null
  createdAt: string
  updatedAt: string
}
```

**New file: `src/features/files/utils/fileRules.ts`** — the backend defaults (`FILE_MAX_SIZE_MB`, image types accepted by companies). The server stays the source of truth.

```ts
export const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const MAX_FILE_SIZE_MB = 10

const BYTES_PER_MB = 1024 * 1024

/** A message when the file cannot be an uploaded image, otherwise null. */
export function validateImageFile(file: File): string | null {
  if (!IMAGE_MIME_TYPES.includes(file.type)) {
    return 'Choose a JPEG, PNG or WebP image.'
  }
  if (file.size === 0) {
    return 'The file is empty.'
  }
  if (file.size > MAX_FILE_SIZE_MB * BYTES_PER_MB) {
    return `The file is larger than ${MAX_FILE_SIZE_MB} MB.`
  }
  return null
}
```

### 2 — Service

**New file: `src/features/files/services/fileService.ts`**

```ts
import { apiBlob, apiRequest, toApiPath } from '../../../shared/services/httpClient.ts'
import type { FileMetadata } from '../types/files.ts'

/** Upload-first: no ownerId; the owning module links the file when its record is saved. */
export function uploadFile(file: File, ownerType: string): Promise<FileMetadata> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('ownerType', ownerType)
  return apiRequest<FileMetadata>('/files', { method: 'POST', formData })
}

/** The bytes behind a url returned by the API ("/api/files/<id>/download"). */
export function fetchFileBlob(url: string, signal?: AbortSignal): Promise<Blob> {
  return apiBlob(toApiPath(url), signal)
}
```

### 3 — Object URL hook

**New file: `src/features/files/hooks/useFileObjectUrl.ts`**

```ts
import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { fetchFileBlob } from '../services/fileService.ts'

const FILE_CACHE_TIME_MS = 5 * 60 * 1000

export const filesKeys = {
  all: ['files'] as const,
  blob: (url: string) => [...filesKeys.all, 'blob', url] as const,
}

export interface FileObjectUrl {
  objectUrl: string | null
  isLoading: boolean
  error: unknown
}

/**
 * Loads a protected file with the token and exposes it as an object URL for <img src>.
 * The blob is cached per url (files never change: a new upload gets a new url).
 */
export function useFileObjectUrl(url: string | null): FileObjectUrl {
  const query = useQuery({
    queryKey: filesKeys.blob(url ?? ''),
    queryFn: ({ signal }) => fetchFileBlob(url ?? '', signal),
    enabled: url !== null,
    staleTime: Infinity,
    gcTime: FILE_CACHE_TIME_MS,
  })
  const [current, setCurrent] = useState<{ blob: Blob; objectUrl: string } | null>(null)

  // Object URLs are a browser resource: create one per blob and revoke it when the blob
  // changes or the component unmounts (an effect is the right tool for this sync).
  useEffect(() => {
    if (!query.data) {
      return
    }
    const blob = query.data
    const created = URL.createObjectURL(blob)
    // The url comes from the browser resource created above; it cannot be derived during render.
    // oxlint-disable-next-line react/set-state-in-effect
    setCurrent({ blob, objectUrl: created })
    return () => URL.revokeObjectURL(created)
  }, [query.data])

  // Only the url made from the current blob; an older one is already revoked.
  const objectUrl = current && current.blob === query.data ? current.objectUrl : null

  return { objectUrl, isLoading: query.isLoading, error: query.error }
}
```

> Implementation note: oxlint's `react(set-state-in-effect)` warned on both `setState` calls of the first draft. The `null` reset is gone (the url is derived during render and only returned for the blob it was made from, so a revoked url is never exposed); the remaining call is a real sync with a browser resource and carries a one-line suppression.

### 4 — Download helper

**New file: `src/features/files/utils/downloadFile.ts`**

```ts
import { fetchFileBlob } from '../services/fileService.ts'

/** Saves a protected file (a plain <a href download> would get 401). */
export async function downloadFile(url: string, fileName: string): Promise<void> {
  const blob = await fetchFileBlob(url)
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = fileName
  document.body.append(link)
  link.click()
  link.remove()
  // Revoke after the click has handed the blob to the browser's download.
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0)
}
```

### 5 — Components

**New file: `src/features/files/components/AuthImage.module.css`**

```css
.placeholder {
  display: grid;
  place-items: center;
  min-height: 96px;
  padding: var(--space-3);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius);
  color: var(--color-muted);
  font-size: 0.875rem;
}

.image {
  display: block;
  max-width: 100%;
  border-radius: var(--radius);
}
```

**New file: `src/features/files/components/AuthImage.tsx`**

```tsx
import { useFileObjectUrl } from '../hooks/useFileObjectUrl.ts'
import styles from './AuthImage.module.css'

interface AuthImageProps {
  /** A file url from the API, or null for "no image". */
  url: string | null
  alt: string
  className?: string
}

export function AuthImage({ url, alt, className = '' }: AuthImageProps) {
  const { objectUrl, isLoading, error } = useFileObjectUrl(url)

  if (!url) {
    return <div className={`${styles.placeholder} ${className}`}>No image</div>
  }
  if (error) {
    return (
      <div className={`${styles.placeholder} ${className}`} role="alert">
        Image unavailable
      </div>
    )
  }
  if (isLoading || !objectUrl) {
    return (
      <div className={`${styles.placeholder} ${className}`} role="status">
        Loading image…
      </div>
    )
  }
  return <img src={objectUrl} alt={alt} className={`${styles.image} ${className}`} />
}
```

**New file: `src/features/files/components/ImageUploadField.module.css`**

```css
.upload {
  display: grid;
  gap: var(--space-2);
  justify-items: start;
}

.preview {
  max-height: 160px;
}
```

**New file: `src/features/files/components/ImageUploadField.tsx`** — use it in forms through react-hook-form's `Controller` (`value` / `onChange`).

```tsx
import { useMutation } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { Field } from '../../../shared/components/ui/Field.tsx'
import { ApiError } from '../../../shared/services/httpClient.ts'
import { uploadFile } from '../services/fileService.ts'
import { IMAGE_MIME_TYPES, MAX_FILE_SIZE_MB, validateImageFile } from '../utils/fileRules.ts'
import { AuthImage } from './AuthImage.tsx'
import styles from './ImageUploadField.module.css'

interface ImageUploadFieldProps {
  id: string
  label: string
  /** The owning module, e.g. "companies" (backend pattern ^[a-z][a-z0-9-]{0,49}$). */
  ownerType: string
  /** The current file url, or null. */
  value: string | null
  onChange: (url: string | null) => void
  /** Validation error from the form (e.g. a server message for this field). */
  error?: string
}

const UPLOAD_FAILED_MESSAGE = 'Upload failed. Please try again.'

export function ImageUploadField({ id, label, ownerType, value, onChange, error }: ImageUploadFieldProps) {
  const [uploadError, setUploadError] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const upload = useMutation({ mutationFn: (file: File) => uploadFile(file, ownerType) })

  async function handleFile(file: File | undefined): Promise<void> {
    setUploadError(null)
    if (!file) {
      return
    }
    const problem = validateImageFile(file)
    if (problem) {
      setUploadError(problem)
    } else {
      try {
        const uploaded = await upload.mutateAsync(file)
        onChange(uploaded.url)
      } catch (uploadFailure) {
        setUploadError(
          uploadFailure instanceof ApiError ? uploadFailure.messages.join(' ') : UPLOAD_FAILED_MESSAGE,
        )
      }
    }
    // Allow picking the same file again after an error or a removal.
    if (input.current) {
      input.current.value = ''
    }
  }

  return (
    <Field
      label={label}
      htmlFor={id}
      error={uploadError ?? error}
      hint={`JPEG, PNG or WebP, up to ${MAX_FILE_SIZE_MB} MB`}
    >
      <div className={styles.upload}>
        {value && <AuthImage url={value} alt={label} className={styles.preview} />}
        <input
          ref={input}
          id={id}
          type="file"
          accept={IMAGE_MIME_TYPES.join(',')}
          className="input"
          disabled={upload.isPending}
          aria-invalid={Boolean(uploadError ?? error)}
          onChange={(event) => void handleFile(event.target.files?.[0])}
        />
        {upload.isPending && (
          <span className="muted" role="status">
            Uploading…
          </span>
        )}
        {value && !upload.isPending && (
          <button type="button" className="btn btn-secondary btn-small" onClick={() => onChange(null)}>
            Remove image
          </button>
        )}
      </div>
    </Field>
  )
}
```

### 6 — Public API

**New file: `src/features/files/index.ts`**

```ts
export { AuthImage } from './components/AuthImage.tsx'
export { ImageUploadField } from './components/ImageUploadField.tsx'
export { useFileObjectUrl } from './hooks/useFileObjectUrl.ts'
export { uploadFile } from './services/fileService.ts'
export type { FileMetadata } from './types/files.ts'
export { downloadFile } from './utils/downloadFile.ts'
```

### 7 — Docs and plans

- `src/README.md` "Shared building blocks": add a line — protected files (images, QR codes) are shown with `AuthImage` / saved with `downloadFile` from `features/files/index.ts`; never `<img src={fileUrl}>`.
- New [00-overview.md](00-overview.md) for `files` (the parent session adds the row to `../00-index.md`).

---

## Edge Cases & Failure Modes

- **Wrong type / too big / empty** → message under the field, no request. `accept` only filters the picker; the check in `validateImageFile` is what counts (users can choose "All files").
- **Server rejects anyway** (e.g. env allows fewer types) → `ApiError` messages shown under the field (`File type "image/gif" is not allowed`, `File exceeds the 10 MB limit`).
- **Session expired during upload** → 401 session message → global sign-out (Story 03).
- **Abandoned uploads** (picked an image, then cancelled the form, or replaced it before saving) → an unlinked `ownerId: null` file stays on the server. Accepted; documented in the intake.
- **Removing an image** only calls `onChange(null)`; the owning module deletes the file when the record is saved with `null` (companies PATCH rule).
- **Same url shown twice** (preview + details) → one cached blob, one object URL per mounted component; each is revoked on unmount.
- **StrictMode** runs the effect twice in development: the first object URL is revoked and a second one created, so the image still shows.
- **Deleted file** (404) or **network error** → `AuthImage` shows "Image unavailable"; 4xx are not retried.
- **Large images** are cached for 5 minutes after the last user unmounts (`gcTime`), then garbage-collected.
- **`downloadFile` failure** rejects with `ApiError`; callers show it (e.g. with `ErrorAlert`).

---

## Test Plan

No test runner and no page yet; the visual checks run again in Story 06. With the backend running, signed in, `npm run dev`, in the browser console:

1. Upload a small generated PNG:
   ```js
   const files = await import('/src/features/files/index.ts')
   const blob = await new Promise((resolve) => {
     const canvas = document.createElement('canvas')
     canvas.width = canvas.height = 8
     canvas.toBlob(resolve, 'image/png')
   })
   const meta = await files.uploadFile(new File([blob], 'test.png', { type: 'image/png' }), 'files-check')
   ```
   → object with `url` and `ownerId: null`; Network shows `Authorization: Bearer …` and `multipart/form-data; boundary=…`.
2. `await files.uploadFile(new File(['x'], 'a.txt', { type: 'text/plain' }), 'files-check').catch(e => e.messages)` → `['File type "text/plain" is not allowed']`.
3. `await files.downloadFile(meta.url, 'test.png')` → the browser saves `test.png`.
4. `AuthImage` and `ImageUploadField` are exercised in Story 06 Test Plan (preview, remove, wrong type, 11 MB file, no 401 in Network).
5. Clean up: `DELETE /api/files/<meta.id>` via `await (await import('/src/shared/services/httpClient.ts')).apiRequest('/files/' + meta.id, { method: 'DELETE' })`.

---

## Migration / Rollback

- No data. Rollback: delete `src/features/files/`. Test uploads from step 1 can be deleted as in step 5.

---

## Verification Steps

1. `npm run build` → no errors. 2. `npm run lint` → no errors or warnings. 3. `grep -rnw any src --include=*.ts --include=*.tsx` → none (unfiltered, it matches prose in `src/README.md`).
4. `grep -rn "src=.*Url\b\|href=.*Url\b" src --include=*.tsx | grep -v objectUrl` → no file url passed straight to `src` / `href`.
5. `grep -rn "features/files/" src --include=*.ts --include=*.tsx | grep -v "^src/features/files/" | grep -v "files/index.ts'"` → no output.
6. Test Plan steps 1–3, 5.

---

## Done Criteria

Implemented 2026-11-07. `npm run build` and `npm run lint` clean (0 warnings); greps 3–5 empty; dev server serves `src/features/files/index.ts` (200); through the `/api` proxy with a Bearer token: PNG upload (`ownerType: frontend-check`) → 201 with `ownerId: null`, `text/plain` → 415 `File type "text/plain" is not allowed`, download with token → 200 `image/png`, same bytes, without token → 401 `Missing access token`, `DELETE` → 204, then download → 404. Browser console steps (Test Plan 1–3, 5 via the module) not run yet. Differences: `useFileObjectUrl` keeps `{ blob, objectUrl }` in state, derives `objectUrl` during render and has one `oxlint-disable-next-line react/set-state-in-effect` (see the note under task 3); Verification step 3 grep limited to `.ts` / `.tsx`.

- [x] `src/features/files/` with `FileMetadata`, `uploadFile`, `useFileObjectUrl`, `AuthImage`, `ImageUploadField`, `downloadFile`, all exported from `index.ts`.
- [ ] Object URLs are revoked on unmount and blob change. *(code review only; browser check not run yet)*
- [ ] `ImageUploadField` checks type / size before uploading and shows server messages. *(server messages verified via API; browser check not run yet — Story 06 Test Plan)*
- [x] `src/README.md` note on protected files; `files` overview updated.
- [x] `npm run build` and `npm run lint` pass; no `any`.

**STOP HERE. Report to the user and wait for confirmation before proceeding to Story 06.**
