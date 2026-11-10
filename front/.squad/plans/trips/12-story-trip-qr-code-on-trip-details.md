# Story 12 — Show, download, print and regenerate the trip QR code on the trip details page

Covers backend **Story 11** (QR code per trip).

## Prerequisites

- **Story 11 completed:** [11-story-trip-list-details-and-form-with-passengers-and-inspection.md](11-story-trip-list-details-and-form-with-passengers-and-inspection.md) — `src/features/trips/` with `Trip` (`qrCodeUrl: string | null`), `tripService.ts`, `useTrips.ts` (`tripKeys`, `cacheTrip`), `TripDetailsPage.tsx`.
- **Story 05 completed (files):** `src/features/files/index.ts` exports `AuthImage` (`{ url: string | null; alt: string; className?: string }` — fetches the file with the token and shows it through an object URL, with its own loading / error state) and `downloadFile(url: string, fileName: string): Promise<void>`.
- Story 02 building blocks: `apiRequest`, `ErrorAlert`, `EmptyState`, `formatDate`, `formatTime`, global CSS.
- Intake: [../../stories/trips/trip-qr-code-on-trip-details/intake.md](../../stories/trips/trip-qr-code-on-trip-details/intake.md).
- API contract: `backend/contracts/trips.md` — "POST /api/trips/:id/qr-code" and "QR code"; `backend/contracts/files.md` — "GET /api/files/:id/download" (needs the token).
- **Do not start until `npm run build` passes on the current `src/`.**

---

## Story Goal

On `/trips/:id`, a **QR code** card beside the trip details:

1. `qrCodeUrl` set → the PNG (via `AuthImage`), **Download PNG**, **Print** (only the code and a caption), **Regenerate**.
2. `qrCodeUrl` null → "This trip has no QR code yet." + **Generate QR code**.
3. Generate / Regenerate call `POST /api/trips/:id/qr-code` and update the cached trip, so the new image shows without a reload.
4. An info note: the code opens an API address that needs sign-in, so phones show an error until a public trip page exists.

**Not in scope:** a public trip page (backend), bulk printing, custom sizes, tests.

**Hard constraints for the executor:**

- Conventions from `src/README.md`, Stories 02, 03 and 11 (no semicolons, `.ts`/`.tsx` extensions, `import type`, no `any`, named exports, `.tsx` exports only components).
- The trips feature uses the files feature **only** through `src/features/files/index.ts`. Never fetch `qrCodeUrl` with `<img src>` (it needs the token).
- No new dependencies.

---

## Context — Read These Files First

1. `backend/contracts/trips.md` — `POST /api/trips/:id/qr-code` (no body; 200 `Trip`; 400 / 404 / 415) and "QR code" (content `<TRIP_QR_BASE_URL>/<trip id>`, 512×512 PNG, best effort, 401 when scanned since auth, never contains `secretCode`).
2. `src/features/trips/services/tripService.ts` — add the new call next to the others.
3. `src/features/trips/hooks/useTrips.ts` — `tripKeys`, `cacheTrip(queryClient, trip)`.
4. `src/features/trips/pages/TripDetailsPage.tsx` — the `<div className="stack">` holding the details card, passengers and inspection; the QR card goes beside it.
5. `src/features/files/index.ts` — `AuthImage`, `downloadFile`.
6. `src/shared/components/ui/ErrorAlert.tsx`, `EmptyState.tsx`; `src/shared/utils/formatDate.ts`.

---

## Implementation tasks

### 1 — Service and hook

**File: `src/features/trips/services/tripService.ts`** — add:

```ts
/** New QR code for the trip; the previous QR file is deleted. The encoded url (trip url) does not change. */
export function regenerateTripQrCode(id: string): Promise<Trip> {
  return apiRequest<Trip>(`/trips/${id}/qr-code`, { method: 'POST' })
}
```

**File: `src/features/trips/hooks/useTrips.ts`** — import `regenerateTripQrCode` and add:

```ts
export function useRegenerateTripQrCode(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => regenerateTripQrCode(id),
    onSuccess: (trip) => cacheTrip(queryClient, trip),
  })
}
```

### 2 — QR code card

**New file: `src/features/trips/components/TripQrCodeCard.module.css`**

```css
.card {
  align-self: start;
}

.printArea {
  display: grid;
  gap: var(--space-2);
  justify-items: center;
}

.image {
  display: block;
  width: 100%;
  max-width: 240px;
  aspect-ratio: 1;
  image-rendering: pixelated;
}

.caption {
  margin: 0;
  text-align: center;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  justify-content: center;
}

/* Print only the code and its caption. Element selectors are not scoped by CSS Modules. */
@media print {
  body * {
    visibility: hidden;
  }

  .printArea,
  .printArea * {
    visibility: visible;
  }

  .printArea {
    position: fixed;
    inset: 0;
    align-content: center;
  }

  .image {
    width: 80mm;
    max-width: none;
  }
}
```

**New file: `src/features/trips/components/TripQrCodeCard.tsx`**

```tsx
import { useState } from 'react'
import { AuthImage, downloadFile } from '../../files/index.ts'
import { EmptyState } from '../../../shared/components/ui/EmptyState.tsx'
import { ErrorAlert } from '../../../shared/components/ui/ErrorAlert.tsx'
import { formatDate, formatTime } from '../../../shared/utils/formatDate.ts'
import { useRegenerateTripQrCode } from '../hooks/useTrips.ts'
import type { Trip } from '../types/trip.ts'
import styles from './TripQrCodeCard.module.css'

interface TripQrCodeCardProps {
  trip: Trip
}

export function TripQrCodeCard({ trip }: TripQrCodeCardProps) {
  const regenerate = useRegenerateTripQrCode(trip.id)
  const [downloadError, setDownloadError] = useState<unknown>(null)
  const qrCodeUrl = trip.qrCodeUrl
  const title = trip.tripName ?? 'Trip'

  async function handleDownload(url: string): Promise<void> {
    setDownloadError(null)
    try {
      await downloadFile(url, `trip-${trip.id}-qr.png`)
    } catch (error) {
      setDownloadError(error)
    }
  }

  return (
    <section className={`card stack ${styles.card}`}>
      <h2>QR code</h2>
      {qrCodeUrl ? (
        <>
          <div className={styles.printArea}>
            <AuthImage url={qrCodeUrl} alt={`QR code for ${title}`} className={styles.image} />
            <p className={styles.caption}>
              {title} — {formatDate(trip.date)} {formatTime(trip.time)}
            </p>
          </div>
          <div className={styles.actions}>
            <button type="button" className="btn btn-secondary btn-small" onClick={() => void handleDownload(qrCodeUrl)}>
              Download PNG
            </button>
            <button type="button" className="btn btn-secondary btn-small" onClick={() => window.print()}>
              Print
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-small"
              disabled={regenerate.isPending}
              onClick={() => regenerate.mutate()}
            >
              {regenerate.isPending ? 'Generating…' : 'Regenerate'}
            </button>
          </div>
        </>
      ) : (
        <EmptyState message="This trip has no QR code yet.">
          <button
            type="button"
            className="btn btn-primary"
            disabled={regenerate.isPending}
            onClick={() => regenerate.mutate()}
          >
            {regenerate.isPending ? 'Generating…' : 'Generate QR code'}
          </button>
        </EmptyState>
      )}
      <ErrorAlert error={regenerate.error ?? downloadError} />
      <p className="alert alert-info">
        Scanning the code opens this trip's address in the API, which needs sign-in, so phones show an error until a
        public trip page exists.
      </p>
    </section>
  )
}
```

### 3 — Details page layout

**New file: `src/features/trips/pages/TripDetailsPage.module.css`**

```css
.layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: var(--space-5);
  align-items: start;
}

@media (max-width: 960px) {
  .layout {
    grid-template-columns: 1fr;
  }
}
```

**File: `src/features/trips/pages/TripDetailsPage.tsx`**

- Import `TripQrCodeCard` from `../components/TripQrCodeCard.tsx` and `styles` from `./TripDetailsPage.module.css`.
- Wrap the existing `<div className="stack">…</div>` (details card, passengers, inspection) and the new card in a layout grid:

```tsx
      <div className={styles.layout}>
        <div className="stack">
          {/* details card, passengers section and <TripInspectionView /> — unchanged */}
        </div>
        <TripQrCodeCard trip={data} />
      </div>
```

Nothing else on the page changes.

### 4 — Docs and plans

- Trips [00-overview.md](00-overview.md): mark Story 12's status when done.

---

## Edge Cases & Failure Modes

- **`qrCodeUrl` null** (generation failed on create, or a trip from before QR codes) → empty state with **Generate QR code**; success swaps to the image (the mutation stores the returned `Trip` under `tripKeys.detail(id)`).
- **Regenerate** → a new file url; `AuthImage` loads the new url (its cache key is the url). The old file is deleted by the API. The encoded content is still the trip url, so codes printed earlier keep working.
- **Server does not allow `image/png`** → **415** message in the `ErrorAlert`; the trip is unchanged.
- **Trip deleted meanwhile** → **404** `Trip <id> not found` in the card.
- **Image load failure** (file removed, network) → `AuthImage`'s own error state; Download shows its error in the card's `ErrorAlert`.
- **Session expired** while downloading → the files request gets a session 401 → sign-out and `/login` (Story 03).
- **Print** → `@media print` hides everything except the image and caption; browser print preview shows only the code. The image must be loaded before printing (it is, once visible).
- **Double click on Regenerate** → buttons disabled while pending.
- **No secret data:** the QR never contains `secretCode` or passengers (backend rule); the caption shows only name, date and time.
- **Scanning:** with the backend's default `TRIP_QR_BASE_URL` a phone opens `…/api/trips/<id>` and gets 401 — stated in the info note.

---

## Test Plan

No test runner. Manual, backend running, signed in:

1. Create a trip (Story 11) → its details page shows the QR image in the right column (below the details on a narrow window). Network: `GET /api/files/<id>/download` with `Authorization: Bearer …`.
2. **Download PNG** → `trip-<id>-qr.png` saved; it opens as a 512×512 QR image.
3. **Print** → print preview shows only the code and caption.
4. **Regenerate** → `POST /api/trips/<id>/qr-code` 200; the image reloads from a new `/api/files/<new id>/download` url; the old url now returns 404 (open it in a new tab with the token via DevTools or curl).
5. Trip without a code: in the backend, `UPDATE trips SET qr_code_url = NULL WHERE id = '<id>'` (or use a trip created before Story 11), reload → "This trip has no QR code yet." → **Generate QR code** → image appears.
6. Scan the code with a phone camera → it offers the trip url (expected 401 page until a public page exists).

---

## Migration / Rollback

- No data. Rollback: delete `TripQrCodeCard.*` and `TripDetailsPage.module.css`, restore the details page layout, remove `regenerateTripQrCode` and `useRegenerateTripQrCode`.

---

## Verification Steps

1. `npm run build` → no errors.
2. `npm run lint` → no errors.
3. `grep -rn "\.\./files/" src/features/trips | grep -v "files/index.ts'"` → no output (a deep import from trips looks like `../../files/components/…`, so the pattern matches `../files/`, not `features/files/`).
4. `grep -rn "qrCodeUrl" src/features/trips --include=*.tsx | grep "src="` → no output (the image is never loaded with a plain `src`).
5. Test Plan steps 1–5.

---

## Done Criteria

Implemented 2026-11-07. All code blocks were used as written. Differences: Verification step 3's grep changed from `features/files/` to `\.\./files/` (the old pattern could never match a relative deep import). Verified headless: build, lint, greps; dev server served `/trips`, `/trips/new` and the changed modules with 200; through the proxy a new trip's `qrCodeUrl` downloaded as a 512×512 `image/png` with the token and 401 without; `POST /trips/:id/qr-code` → 200 with a new `qrCodeUrl` (200), old url 404; bad uuid 400, unknown trip 404 `Trip <id> not found`. Test data deleted. Test Plan steps 1–6 in the browser not run yet.

- [x] `regenerateTripQrCode` and `useRegenerateTripQrCode` added; success updates the cached trip and refreshes the lists.
- [ ] `TripQrCodeCard` shows the image via `AuthImage`, Download PNG, Print (code only), Regenerate, and the Generate state for `qrCodeUrl: null`, plus the info note. — code in place and the API calls verified; browser check not run yet.
- [ ] The details page shows the card beside the trip details (stacked on narrow screens). — browser check not run yet.
- [x] Trips overview updated.
- [x] `npm run build` and `npm run lint` pass; no `any`.

**STOP HERE. Report to the user and wait for confirmation before proceeding to the next story.**
