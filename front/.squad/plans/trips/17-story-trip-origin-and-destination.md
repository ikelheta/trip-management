# Story 17 — Trip origin and destination (from / to) on the trip form, list and details

## Prerequisites

- **Backend Story 13 implemented and synced:** `trip-management/.squad/plans/trips/13-story-add-trip-origin-and-destination.md`. Check that `backend/contracts/trips.md` lists `origin` / `destination` in `Trip`, `CreateTripBody` and `UpdateTripBody` before starting; if not, run `npm run sync:frontend` in `trip-management/` (never edit `backend/` by hand). **Ship together:** after the backend change the current form's POST is rejected (`origin must be longer than or equal to 2 characters`).
- Story 11 completed: [11-story-trip-list-details-and-form-with-passengers-and-inspection.md](11-story-trip-list-details-and-form-with-passengers-and-inspection.md) (trip pages and form).
- Story 14 completed: texts in `tripsMessages` (English / Arabic).
- Story 16 ([16-story-passenger-excel-import.md](16-story-passenger-excel-import.md)) is independent: it only touches the passengers section. Either order works.
- Intake: `.squad/stories/trips/trip-origin-and-destination/intake.md`.

---

## Story Goal

1. **Trip form** (create and edit): required **From** (`origin`) and **To** (`destination`) fields, first in the Trip section, trimmed, 2–256 characters, validated before submit; API field errors land under the fields.
2. **Edit** sends `origin` / `destination` only when changed. Editing a trip created before backend Story 13 (both `null`) requires filling them in.
3. **Trips list:** a **Route** column ("Riyadh → Jeddah", "—" when unknown); search label and placeholder mention name, from and to (the API search matches all three). The date filters are relabelled "From date" / "To date" so they are not confused with the route.
4. **Trip details:** route in the page description ("Riyadh → Jeddah · 15 Nov 2026 at 08:30") and "From" / "To" rows in the details list.
5. English and Arabic; in Arabic the arrow points right-to-left and place names are isolated with `isolate()`.

**Not in scope:** location pickers, maps, autocomplete, separate From / To list filters, the QR code content.

---

## Context — Read These Files First

1. `backend/contracts/trips.md` — the `Trip`, `CreateTripBody`, `UpdateTripBody` types (after the sync they include `origin` / `destination`), and the `GET /api/trips` `search` rule.
2. `src/features/trips/types/trip.ts` — lines 41–59 `Trip`, 75–89 `CreateTripRequest`, 91–105 `UpdateTripRequest`.
3. `src/features/trips/types/tripSchemas.ts` — lines 8–9 `NAME_MIN_LENGTH` / `NAME_MAX_LENGTH`, line 21 `nameMessage`, lines 48–60 the top-level fields (`tripName` … `time`).
4. `src/features/trips/utils/tripForm.ts` — lines 44–58 `newTripFormValues`, 60–82 `tripToFormValues`, 84–99 `toCreateTripRequest`, 102–114 the changed-fields loop in `toUpdateTripRequest` (line 110 `['vehicleId', 'driverId', 'date', 'time'] as const`).
5. `src/features/trips/components/TripForm.tsx` — line 30 `SERVER_FIELDS`, lines 66–109 the Trip section `form-grid` (vehicle, driver, date, time, trip name, secret code).
6. `src/features/trips/components/TripsTable.tsx` — lines 24–36 header row, lines 39–62 body row (line 44 the trip-name link).
7. `src/features/trips/pages/TripDetailsPage.tsx` — lines 62–64 `PageHeader` title / description, lines 79–90 the `details` list.
8. `src/features/trips/pages/TripsListPage.tsx` — lines 56–62 `SearchInput` with `m.list.searchLabel` / `m.list.searchPlaceholder`; lines 79–98 the date filters using `m.list.dateFrom` / `m.list.dateTo`.
9. `src/features/trips/i18n.ts` — English: `untitled` line 7, `list` lines 9–34 (search 12–13, dates 18–19, columns 24–33), `details` from line 35 (`dateAt` 36), `form` lines 63–76, `validation` from line 127. Arabic: `untitled` line 139, `list` from line 150 (search 152–153, dates 158–159, columns 164–173), `details` 175–184, `form` 202–215, `validation` from line 274. `isolate` is already imported (line 1).
10. `src/shared/i18n/commonMessages.ts` — `states.notSet` ("—") for unknown values.

---

## Frontend Tasks

No backend changes in this story (they are backend Story 13).

### 1 — API types

File: `src/features/trips/types/trip.ts`

- `Trip`, after `time` (line 50):

```ts
  /** Free text. Null only for trips created before origin / destination existed. */
  origin: string | null
  destination: string | null
```

- `CreateTripRequest`, after `time` (line 81): `origin: string` and `destination: string`.
- `UpdateTripRequest`, after `time` (line 97): `origin?: string` and `destination?: string` (`null` is rejected by the API, so the type does not allow it).

### 2 — Form schema

File: `src/features/trips/types/tripSchemas.ts` — in the returned `z.object` (line 48), add **before** `tripName`:

```ts
    origin: z
      .string()
      .trim()
      .min(1, m.validation.originRequired)
      .min(NAME_MIN_LENGTH, nameMessage)
      .max(NAME_MAX_LENGTH, nameMessage),
    destination: z
      .string()
      .trim()
      .min(1, m.validation.destinationRequired)
      .min(NAME_MIN_LENGTH, nameMessage)
      .max(NAME_MAX_LENGTH, nameMessage),
```

Same bounds as the API (2–256, `NAME_MIN_LENGTH` / `NAME_MAX_LENGTH` already match it). Empty shows "Enter where the trip starts"; one character shows the length message.

### 3 — Form values and request bodies

File: `src/features/trips/utils/tripForm.ts`

- `newTripFormValues` (line 45): add `origin: ''` and `destination: ''`.
- `tripToFormValues` (line 62): add `origin: trip.origin ?? ''` and `destination: trip.destination ?? ''`.
- `toCreateTripRequest` (line 85): add `origin: values.origin` and `destination: values.destination` (required, always sent; the resolver has already trimmed them).
- `toUpdateTripRequest` line 110: extend the loop to `['origin', 'destination', 'vehicleId', 'driverId', 'date', 'time'] as const`. TypeScript accepts it because both are `string` in `TripFormValues` and `string | undefined` in `UpdateTripRequest`.

### 4 — Form fields

File: `src/features/trips/components/TripForm.tsx`

- Line 30: add `'origin', 'destination'` to `SERVER_FIELDS` so `origin must be …` / `destination must be …` from the API show under the fields.
- In the Trip section `form-grid` (line 68), insert **before** the vehicle field:

```tsx
            <Field label={m.form.origin} htmlFor="origin" error={errors.origin?.message}>
              <input
                id="origin"
                className="input"
                placeholder={m.form.originPlaceholder}
                autoComplete="off"
                aria-invalid={Boolean(errors.origin)}
                {...register('origin')}
              />
            </Field>
            <Field label={m.form.destination} htmlFor="destination" error={errors.destination?.message}>
              <input
                id="destination"
                className="input"
                placeholder={m.form.destinationPlaceholder}
                autoComplete="off"
                aria-invalid={Boolean(errors.destination)}
                {...register('destination')}
              />
            </Field>
```

### 5 — Trips list

File: `src/features/trips/components/TripsTable.tsx`

- `common` already exists (line 20). Header: after `<th>{m.list.columns.trip}</th>` (line 28) add `<th>{m.list.columns.route}</th>`.
- Body: after the trip-name cell (lines 43–45) add:

```tsx
              <td>
                {trip.origin && trip.destination ? m.route(trip.origin, trip.destination) : common.states.notSet}
              </td>
```

No change in `TripsListPage.tsx` code: it already passes `m.list.searchLabel` / `searchPlaceholder` and `m.list.dateFrom` / `dateTo`; only their texts change (Task 7).

### 6 — Trip details

File: `src/features/trips/pages/TripDetailsPage.tsx`

- Before `return` (line 60), add:

```tsx
  const when = m.details.dateAt(formatDate(data.date, locale), formatTime(data.time))
  const route = data.origin && data.destination ? m.route(data.origin, data.destination) : null
```

- Line 64: `description={route ? m.details.summary(route, when) : when}`.
- In the `details` list, before the vehicle row (line 80):

```tsx
              <dt>{m.details.origin}</dt>
              <dd>{data.origin ?? common.states.notSet}</dd>
              <dt>{m.details.destination}</dt>
              <dd>{data.destination ?? common.states.notSet}</dd>
```

`common` is already used on this page (line 68 `common.actions.edit`). Check `data` is in scope at line 60 (it is used on line 63).

### 7 — Texts

File: `src/features/trips/i18n.ts`

English:

```ts
    // after `untitled` (line 7)
    route: (origin: string, destination: string) => `${origin} → ${destination}`,
```

- `list.searchLabel` → `'Search trips by name, from or to'`; `list.searchPlaceholder` → `'Search by name, from or to…'`.
- `list.dateFrom` → `'From date'`; `list.dateTo` → `'To date'`.
- `list.columns`: add `route: 'Route'` after `trip`.
- `details`: add `summary: (route: string, when: string) => \`${route} · ${when}\``, `origin: 'From'`, `destination: 'To'`.
- `form`: add `origin: 'From'`, `originPlaceholder: 'e.g. Riyadh'`, `destination: 'To'`, `destinationPlaceholder: 'e.g. Jeddah'`.
- `validation`: add `originRequired: 'Enter where the trip starts'`, `destinationRequired: 'Enter where the trip ends'`.

Arabic:

```ts
    // after `untitled` (line 139). In right-to-left the arrow points left, the reading direction.
    route: (origin: string, destination: string) => `${isolate(origin)} ← ${isolate(destination)}`,
```

- `list.searchLabel` → `'البحث في الرحلات بالاسم أو نقطة الانطلاق أو الوجهة'`; `list.searchPlaceholder` → `'ابحث بالاسم أو من أو إلى…'`.
- `list.dateFrom` → `'من تاريخ'`; `list.dateTo` → `'إلى تاريخ'`.
- `list.columns`: `route: 'المسار'`.
- `details`: `summary: (route: string, when: string) => \`${route} · ${when}\``, `origin: 'من'`, `destination: 'إلى'`.
- `form`: `origin: 'من'`, `originPlaceholder: 'مثال: الرياض'`, `destination: 'إلى'`, `destinationPlaceholder: 'مثال: جدة'`.
- `validation`: `originRequired: 'أدخل نقطة انطلاق الرحلة'`, `destinationRequired: 'أدخل وجهة الرحلة'`.

`defineMessages` fails the build if a key exists in only one language.

### 8 — Plans

After implementing: tick the Done Criteria, correct any code block that differs from the code, set the status in `.squad/plans/trips/00-overview.md`.

---

## Edge Cases & Failure Modes

- **Old trips (`origin` / `destination` null):** list shows "—" (`common.states.notSet`), details shows "—" rows and the description without a route. Their edit form starts with empty From / To, so **saving any change requires filling them** (the schema requires both). This is intended: the API rejects `null`, and a trip should have a route. `toUpdateTripRequest` then sends both because they differ from `''`.
- **Only one of the two set** (cannot happen through the API today, both required together): the list / description treat the route as unknown (`&&` check); the details rows still show the one that exists.
- **Whitespace only:** zod `.trim()` makes it `''` → "Enter where the trip starts".
- **API 400 on these fields** (`origin must be longer than or equal to 2 characters`): `applyServerErrors` puts it under the field because the names are in `SERVER_FIELDS` (Task 4). The Arabic translation falls back to the original text if `shared/i18n/apiMessages.ts` has no pattern for it — acceptable, the client schema prevents it in practice.
- **Backend not yet deployed:** POST with the new fields → 400 `property origin should not exist`. See Prerequisites: ship together.
- **Long place names** (up to 256): the list cell wraps; the table already scrolls horizontally inside `.table-wrap`.
- **Arabic:** `isolate()` keeps Latin names ("King Khalid Airport") in order inside the right-to-left sentence; the arrow `←` points to the destination in reading order.
- **Search:** the API matches name, origin and destination (backend Story 13); the client only changes the label.

---

## Test Plan

1. No automated tests (no test runner).
2. **Manual / smoke** (dev server + backend with Story 13, signed in as `admin@example.com`):
   1. "New trip" → submit empty → "Enter where the trip starts" / "… ends" under From / To; nothing sent (Network tab).
   2. From "Riyadh", To "Jeddah", rest valid → created; details description "Riyadh → Jeddah · …", From / To rows.
   3. List shows the Route column; search "jed" finds the trip.
   4. Edit → change To to "Makkah" → the PATCH body is `{ "destination": "Makkah" }` only.
   5. Open a trip created before the backend migration → list "—", details "—"; edit → From / To required before "Save changes".
   6. Arabic: labels, placeholders, "الرياض ← جدة", right-to-left layout, Latin names isolated.

---

## Verification Steps

1. **Frontend builds:** `npm run build` in the project root (no TypeScript errors: every `Trip` / form-values consumer compiles with the new fields).
2. **Lint:** `npm run lint`.
3. **Frontend runs:** backend `npm run start:dev` (with Story 13 migrated), `npm run dev`; run the Test Plan.
4. **Regression:** trip create / edit / delete, passengers, inspection, QR code and list filters still work.

---

## Done Criteria

- [x] `Trip`, `CreateTripRequest`, `UpdateTripRequest` include `origin` / `destination` as in `backend/contracts/trips.md`.
- [x] The trip form has required From / To (2–256, trimmed) on create and edit; API field errors show under them.
- [x] Edit sends `origin` / `destination` only when changed; old trips require them before saving.
- [x] The list has a Route column ("—" when unknown); search texts mention name, from and to; date filters read "From date" / "To date".
- [x] The details page shows the route in the description and From / To rows.
- [x] All new and changed texts exist in English and Arabic; Arabic is right-to-left with isolated place names.
- [x] No `any`; `npm run build` and `npm run lint` pass.

## Implementation notes (2026-11-09)

- Implemented as planned; the code blocks above match the code.
- Backend Story 13 was implemented first (curl-verified) and synced to `backend/`.
- Browser smoke test (headless Chrome, with Story 16): empty submit shows both errors and sends nothing; POST sends trimmed `origin` / `destination`; details show "Riyadh → Jeddah · …" and From / To rows; list has a Route column, "—" for older trips and finds a trip by searching its destination; editing only the destination sends `{"destination":"Makkah"}`; editing an older trip requires From / To; Arabic labels and the left-pointing arrow. No console errors.

**STOP HERE. Report to the user and wait for confirmation before starting another story.**
