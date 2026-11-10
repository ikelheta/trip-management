# Story 18 — Trip contract print page: print or save the driver's contract as PDF from the browser

## Prerequisites

- **Backend Story 14 implemented and synced:** `trip-management/.squad/plans/trips/14-story-add-trip-contract-number.md`. Check that `backend/contracts/trips.md` lists `contractNumber` in `Trip`; if not, run `npm run sync:frontend` in `trip-management/` (never edit `backend/` by hand).
- Stories 05 (files: `useFileObjectUrl`), 06 (companies: `useAllCompanies`), 08 (vehicles: `useAllVehicles`), 09 (drivers: `useAllDrivers`), 11 and 12 (trip details, QR code card), 14 (texts in `i18n.ts`), 15 (styles, `Icon`) completed.
- Intake: `.squad/stories/trips/trip-contract-print-page/intake.md` (template PDF in its `attachments/`).
- **Decision (2026-11-09):** the contract is printed by the browser (`window.print()`; the user chooses a printer or "Save as PDF"). No PDF library, no server rendering. The browser draws the Arabic, so shaping and right-to-left order are correct.

---

## Story Goal

1. **Trip details:** a **Contract** button and a **Contract number** row.
2. **`/trips/:id/contract`:** a full page **outside `AppLayout`** (no sidebar / top bar), still behind `RequireAuth`. A toolbar (Back to trip, Print / Save as PDF; in the UI language; hidden when printing) above the contract document.
3. **Contract document:** A4, `dir="rtl" lang="ar"` always. On **every printed page** the header image (top) and footer image (bottom) of the company that owns the trip's vehicle, or a text fallback. Sections: **contract** → **passenger manifest with all passengers** (table continues over pages with repeated headings) → **inspection**. **No luggage contract page.**
4. **Print** is enabled once the images, barcode and font are ready. `document.title` is `trip-contract-<contractNumber>` while the page is open, so "Save as PDF" suggests that name.
5. The QR card's print rule no longer hides other pages' content (it currently applies to every page).

**Not in scope:** a one-click `.pdf` download, server rendering, sending the contract, an English contract, a list-row action.

---

## Context — Read These Files First

1. `backend/contracts/trips.md` — `Trip.contractNumber`.
2. The template PDF in the intake's `attachments/` — pages 1, 2 and 4 (page 3 is dropped).
3. `src/app/routes/router.tsx` — lines 20–58: `RequireAuth` → `AppLayout` → children. The contract route goes **inside `RequireAuth`, beside `AppLayout`**, not under it.
4. `src/features/trips/types/trip.ts` — lines 1–64: `Passenger`, `InspectionCheckResult`, `InspectionIndicatorResult` (already grouped, Arabic / English names), `TripInspection.inspectedAt` (UTC ISO), `Trip` (`qrCodeUrl` line 55; `passengers` "Sorted by name").
5. `src/features/trips/pages/TripDetailsPage.tsx` — lines 68–76 header actions, 82–98 details list; lines 46–47 the vehicle / driver lookup pattern (`useAllVehicles` / `useAllDrivers` + `find`).
6. `src/features/files/hooks/useFileObjectUrl.ts` — protected image → object URL (`objectUrl`, `isLoading`, `error`), exported from `src/features/files/index.ts`.
7. `src/features/companies/index.ts` (`useAllCompanies`, `Company` with `headerUrl` / `footerUrl`, `registrationNumber`, `phoneNumber`, `address`, `city`), `src/features/vehicles/types/vehicle.ts` (`plateNumber`, `model`, `companyId`), `src/features/drivers/types/driver.ts` (`name`, `identityId`).
8. `src/features/trips/components/TripQrCodeCard.module.css` — lines 31–45: `@media print { body * { visibility: hidden } … }`. **`body *` is not scoped by CSS Modules**, and the stylesheet is always loaded, so today it hides everything except the QR card on **any** page that is printed. Task 7 fixes it.
9. `src/shared/components/ui/Icon.tsx` — `ICON_SHAPES` (no `print` icon yet), `src/shared/components/ui/LoadingState.tsx` (`label` prop).
10. `src/shared/i18n/bidi.ts` (`isolate`, `ltr`), `src/shared/utils/formatDate.ts` (UI formats; the contract uses its own fixed formats, task 3).
11. `src/config/routes.ts` line 24 (`editTrip`).

---

## Frontend Tasks

### 1 — Packages and type

```bash
npm install jsbarcode @fontsource/cairo
```

- `jsbarcode` draws the Code 128 barcode into an `<svg>` (ships its own types). Imported with `import()` so it is a separate chunk (same as the Excel libraries in Story 16).
- `@fontsource/cairo` (SIL OFL): the contract font, self-hosted, so the print looks the same on every computer. Import `@fontsource/cairo/400.css` and `@fontsource/cairo/700.css` in `ContractDocument.tsx` only; the browser downloads the font files only when the contract is shown.

`src/features/trips/types/trip.ts`, in `Trip` after `destination`:

```ts
  /** "YYYYMMDD-NNNN", printed under the contract barcode. Never changes. */
  contractNumber: string
```

### 2 — Route

- `src/config/routes.ts`: `tripContract: (id: string): string => \`/trips/${id}/contract\`,` after `editTrip`.
- `src/app/routes/router.tsx`: in the `RequireAuth` children, **before** the `AppLayout` entry:

```tsx
      // Full-page print view: no sidebar or top bar.
      { path: '/trips/:id/contract', element: <TripContractPage /> },
```

- Export `TripContractPage` from `src/features/trips/index.ts`.

### 3 — Fixed Arabic text and formatting (`src/features/trips/utils/`)

`contractText.ts` — the legal sentences copied **verbatim** from the template (title, article 39 / 40 paragraph, agreement sentence, important note, labels). They are not in `i18n.ts`: the contract is always Arabic.

```ts
export const CONTRACT_TEXT = {
  title: 'عقد نقل على الطريق البريه',
  dateLabel: 'تاريخ',
  legal: 'تم ابرام هذا العقد بين المتعاقدين بناء على الماده( 39 ) التاسعه والثلاثون من اللائحه المنظمة للنشاط النقل المتخصص وتأجير وتوجيه الحافلات وبناء على الفقره ( 1) من المادة ( 39 ) والتي تنص على ان يجب على الناقل ابرام عقد نقل مع الاطراف المحددين في الماده( 40 ) قبل تنفيذ عمليات النقل على الطرق البرية بما لا يخالف احكام هذه اللائحه ووفقا للتليه التي تحددها هئة النقل. وبناء على ماسبق تم ابرام عقد بين الاطراف الاتيه:',
  firstParty: 'الطرف الاول:',
  registration: 'سجل رقم:',
  secondParty: 'الطرف الثاني:',
  agreement: 'اتفق الطرفان على ان ينفذ الطرف الاول عمليه نقل للطرف الثاني مع مرافقيه وذويهم من الموقع المحدد مسبقا من الطرف الثاني وتوصيلهم الى الجهه المحدده بالعقد.',
  tripColumns: ['النقل من', 'وصولا إلى', 'رقم الرحلة', 'وقت الرحلة', 'تاريخ الرحلة'],
  manifestHeading: 'بيان الركاب',
  // … manifest labels, driver / passenger columns, note, inspection labels — all from the template
} as const
```

`contractFormat.ts`:

```ts
/** Inspection times are printed in Saudi time. */
export const CONTRACT_TIME_ZONE = 'Asia/Riyadh'

/** "2026-11-10" → "10-11-2026" */
export function formatContractDate(date: string): string

/** "00:10:00" → "12:10 AM" */
export function formatContractTime(time: string): string

/** "2026-11-10" → "Tuesday" (English, as in the template; computed in UTC so the zone cannot shift the day). */
export function formatContractWeekday(date: string): string

/** UTC ISO → { date: "2026-11-10", time: "00:09:00" } in CONTRACT_TIME_ZONE (Intl.DateTimeFormat parts). */
export function formatInspectionMoment(iso: string): { date: string; time: string }

/** 1 → "أولاً" / "First", 2 → "ثانياً" / "Second" … 10; then the number. */
export function sectionOrdinal(index: number): { ar: string; en: string }
```

### 4 — Barcode component

`src/features/trips/components/contract/ContractBarcode.tsx`:

```tsx
interface ContractBarcodeProps {
  value: string
  onReady: () => void
}

/** Code 128 of the contract number, drawn by jsbarcode (loaded on demand). */
export function ContractBarcode({ value, onReady }: ContractBarcodeProps) {
  const ref = useRef<SVGSVGElement>(null)

  useEffect(() => {
    let cancelled = false
    void import('jsbarcode').then(({ default: JsBarcode }) => {
      if (cancelled || !ref.current) return
      JsBarcode(ref.current, value, { format: 'CODE128', height: 48, width: 1.6, fontSize: 14, margin: 0 })
      onReady()
    })
    return () => {
      cancelled = true
    }
  }, [value, onReady])

  return <svg ref={ref} role="img" aria-label={value} />
}
```

(`onReady` must be stable: pass a `useCallback` from the page. If the import fails, report ready anyway and show the number as text, so printing is not blocked.)

### 5 — Contract document

`src/features/trips/components/contract/` — presentational components; they receive data, fetch nothing:

```
ContractDocument.tsx (+ .module.css)  frame: fixed header / footer + spacer table; dir="rtl" lang="ar"
ContractPageHeader.tsx                header image or text fallback
ContractPageFooter.tsx                footer image or text fallback
ContractSection.tsx                   page 1
ManifestSection.tsx                   passengers (page 2 …)
InspectionSection.tsx                 last page
```

`ContractDocument` props:

```ts
export interface ContractDocumentProps {
  trip: Trip
  company: Company | undefined   // undefined → text fallbacks with "—"
  vehicle: Vehicle | undefined
  driver: Driver | undefined
  headerImage: string | null     // object URL or null
  footerImage: string | null
  qrImage: string | null
  onBarcodeReady: () => void
  onImageSettled: () => void     // called from each <img> onLoad / onError
}
```

**Header and footer on every printed page** (Chrome / Edge repeat `position: fixed` elements on each printed page; a `<thead>` / `<tfoot>` spacer reserves their space on each page):

```tsx
<div className={styles.document} dir="rtl" lang="ar">
  <ContractPageHeader className={styles.pageHeader} … />
  <ContractPageFooter className={styles.pageFooter} … />
  <table className={styles.frame}>
    <thead><tr><td><div className={styles.headerSpace} /></td></tr></thead>
    <tfoot><tr><td><div className={styles.footerSpace} /></td></tr></tfoot>
    <tbody><tr><td className={styles.content}>
      <ContractSection … />
      <ManifestSection … />
      <InspectionSection … />
    </td></tr></tbody>
  </table>
</div>
```

`ContractDocument.module.css` (use token names that exist in `src/shared/styles/index.css`):

```css
.document {
  font-family: 'Cairo', sans-serif;
  font-weight: 700;
  font-size: 11pt;
  color: #000;
  background: #fff;
  width: 210mm;
  margin-inline: auto;
  box-shadow: var(--shadow-md);   /* screen only */
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

.frame { width: 100%; border-collapse: collapse; }
.content { padding: 0 14mm; }
.headerSpace, .footerSpace { height: 0; }   /* screen: header / footer are in the flow */

.pageHeader img, .pageFooter img { display: block; width: 100%; object-fit: cover; }
.pageHeader img { height: 42mm; }
.pageFooter img { height: 22mm; }

.table { width: 100%; border-collapse: collapse; margin-block: 4mm; }
.table th { background: #cdb38b; }
.table th, .table td { border: 1px solid #000; padding: 2mm; text-align: center; word-break: break-word; }
.table tr { break-inside: avoid; }

.manifest, .inspection { break-before: page; }
.note, .inspectionGroup { break-inside: avoid; }

@media print {
  .document { width: auto; box-shadow: none; }
  .pageHeader { position: fixed; top: 0; inset-inline: 0; }
  .pageFooter { position: fixed; bottom: 0; inset-inline: 0; }
  .headerSpace { height: 46mm; }
  .footerSpace { height: 26mm; }
}
```

Print page settings go in `TripContractPage.module.css`. `@page` cannot be scoped, but it only sets A4 and zero margins, which suits the other print views (QR card) too:

```css
@media print {
  @page { size: A4; margin: 0; }   /* margin 0 also removes the browser's date / URL lines */
  .toolbar { display: none; }
  :global(body) { background: #fff; }
}
```

Section content (labels from `CONTRACT_TEXT`; every value is rendered as React text, so it is escaped):

- **ContractSection:** title; a row with the barcode (inline-start side as in the template: QR on the right, barcode on the left in RTL) and the QR image (30 mm; nothing if `qrCodeUrl` is null); `تاريخ <formatContractDate(date)>`; legal paragraph; `الطرف الاول: <company.name>`; `سجل رقم: <registrationNumber>`; `الطرف الثاني:` (empty); agreement; trip table with `origin ?? ''`, `destination ?? ''`, `contractNumber` (`ltr()`), `formatContractTime(time)`, `formatContractDate(date)`; agreement again; heading `بيان الركاب`.
- **ManifestSection** (`className={styles.manifest}`): `الوقت: <time>`; row `اليوم: <weekday>` · `اسم الجهة: <tripName ?? ''>` · `التاريخ: <date>`; driver table **رقم الهوية | اسم السائق | رقم اللوحة | السيارة نوع** (`driver.identityId`, `driver.name`, `vehicle.plateNumber`, `vehicle.model`); heading `معلومات الضيوف`; passenger table with `<thead>` (repeats on every printed page) **الرقم | اسم المعتمرين | نوع التاشيرة | رقم جواز السفر رقم التاشيرة | الجنسية**, one row per passenger (`index + 1`, `name`, `docType`, `identityNumber` in `ltr()`, `nationality`), or one row `لا يوجد ركاب`; then the note block `(ملاحظه هامة)` + sentence, `للأستفسارات: <company.phoneNumber>`, `رقم الحجز:` (empty).
- **InspectionSection** (`className={styles.inspection}`): table `وقت الفحص | <time> | التاريخ | <date> | لوحة المركبة | <plate>`, row `إسم السائق | <driver>`; per `inspection.indicators[i]` a group: heading `<sectionOrdinal(i+1).ar> : <nameAr>` (right) and `<en>: <nameEn>` (left), table **البند - ITEM | SOUND | UNSOUND | NOTES** with `"<check.nameAr> - <check.nameEn>"`, `✓` / `☐` by `status`, `note ?? ''`. `inspection === null` → header table + `لم يتم تسجيل فحص لهذه الرحلة`.
- **Header fallback:** company name centred, 20 pt, orange (`#f47b20`) bottom border, 42 mm high box. **Footer fallback:** `address – city | phoneNumber | registrationNumber`, 9 pt, top border, 22 mm box.

### 6 — Page

`src/features/trips/pages/TripContractPage.tsx`:

```tsx
export function TripContractPage() {
  const m = useMessages(tripsMessages)
  const { id = '' } = useParams()
  const trip = useTrip(id)
  const vehicles = useAllVehicles()
  const drivers = useAllDrivers()
  const companies = useAllCompanies()

  const vehicle = vehicles.data?.find((item) => item.id === trip.data?.vehicleId)
  const driver = drivers.data?.find((item) => item.id === trip.data?.driverId)
  const company = companies.data?.find((item) => item.id === vehicle?.companyId)

  const header = useFileObjectUrl(company?.headerUrl ?? null)
  const footer = useFileObjectUrl(company?.footerUrl ?? null)
  const qr = useFileObjectUrl(trip.data?.qrCodeUrl ?? null)

  const [barcodeReady, setBarcodeReady] = useState(false)
  const handleBarcodeReady = useCallback(() => setBarcodeReady(true), [])
  const [settledImages, setSettledImages] = useState(0)
  const handleImageSettled = useCallback(() => setSettledImages((count) => count + 1), [])

  useDocumentTitle(trip.data ? m.contract.fileName(trip.data.contractNumber) : null)

  // … pending / error states as on TripDetailsPage (LoadingState, ErrorAlert + back link)
}
```

- **Ready to print** when: trip, vehicles, drivers and companies loaded; each of header / footer / QR is either without url, failed (`error`), or its `<img>` fired `onLoad` / `onError` (count the images that have an object URL and compare with `settledImages`); `barcodeReady`; and `await document.fonts.ready` resolved (one `useEffect` setting a flag). Until then the Print button shows `m.contract.preparing` and is disabled.
- **Print:** `onClick={() => window.print()}`.
- **Warnings** (screen only, in the toolbar area): vehicle / driver / company not found (deleted) → `m.contract.missingData`; a header / footer / QR image failed → `m.contract.imageFailed` (the fallback text is printed). Printing is still allowed.
- `useDocumentTitle(title)`: small effect in the same file (or `src/shared/hooks/useDocumentTitle.ts` if another page needs it): sets `document.title`, restores the previous title on unmount.
- `TripContractPage.module.css`: `.page { min-height: 100vh; background: var(--surface-muted); padding-block: var(--space-6); }`, sticky `.toolbar` (flex, wraps on narrow screens) with Back link and Print button; at `max-width: 720px` the document scales down with `zoom: 0.5` **on screen only** (`@media screen and (max-width: 720px)`) so there is no horizontal scroll.
- `Icon`: add a `print` shape to `ICON_SHAPES` (same stroke style).

### 7 — Scope the QR card's print rule

`src/features/trips/components/TripQrCodeCard.module.css` lines 31–45: hide the rest of the page only when the QR print area is on the page:

```css
@media print {
  body:has(.printArea) * {
    visibility: hidden;
  }
  …
}
```

(`.printArea` is hashed by CSS Modules in both places, so it still matches only the QR card.)

### 8 — Trip details

`TripDetailsPage.tsx`:

- Header actions, first: `<Link to={ROUTES.tripContract(data.id)} className="btn btn-primary"><Icon name="print" /> {m.details.contract}</Link>`.
- Details list, first row: `<dt>{m.details.contractNumber}</dt><dd>{ltr(data.contractNumber)}</dd>`.

### 9 — Texts (`src/features/trips/i18n.ts`, en / ar)

| key | en | ar |
|-----|----|----|
| `details.contract` | Contract | العقد |
| `details.contractNumber` | Contract number | رقم العقد |
| `contract.back` | Back to trip | العودة إلى الرحلة |
| `contract.print` | Print / Save as PDF | طباعة / حفظ PDF |
| `contract.preparing` | Preparing… | جارٍ التجهيز… |
| `contract.hint` | In the print dialog choose a printer or "Save as PDF". | في نافذة الطباعة اختر طابعة أو "حفظ بتنسيق PDF". |
| `contract.missingData` | The trip's vehicle, driver or company was not found; some fields are empty. | لم يتم العثور على مركبة الرحلة أو سائقها أو شركتها؛ بعض الحقول فارغة. |
| `contract.imageFailed` | A header, footer or QR image could not be loaded. | تعذر تحميل صورة الترويسة أو التذييل أو رمز QR. |
| `contract.fileName(number)` | `trip-contract-${number}` | same (file names stay Latin) |

### 10 — Plans

- Tick the Done Criteria; set Story 18's status in `00-overview.md`; `src/README.md` if it lists routes outside the layout.

---

## Edge Cases & Failure Modes

- **100 passengers:** about 25 rows per page → the manifest spans ~4 pages; `<thead>` repeats; header / footer on every page; inspection starts on a new page.
- **No passengers / no inspection / no origin–destination (older trips):** empty-row text / "no inspection" line / empty cells.
- **Company without header / footer, or a PDF file as header:** a PDF file fails as `<img>` → `onError` → text fallback (and the warning).
- **Deleted vehicle / driver / company** (not in the `useAll…` lists): "—" values, warning, printing allowed.
- **QR missing (`qrCodeUrl: null`):** no QR printed; the user can regenerate it on the trip details page.
- **Printing too early:** the button is disabled until images, barcode and font are ready; `Ctrl+P` before that may print without images — acceptable.
- **Browser differences:** Chrome / Edge repeat fixed header / footer per page (target browsers). Firefox repeats them too; Safari may not — note it in the hint if users report it.
- **User changes print margins / scale in the dialog:** layout assumes "Default" margins (0 from `@page`) and 100 % scale.
- **UI language Arabic or English:** the document is always `dir="rtl" lang="ar"`; only the toolbar follows the UI language.
- **Long names:** cells wrap; rows never split across pages.
- **QR card fix:** with `body:has(.printArea)`, printing any other page is no longer blank.

---

## Test Plan

No test files (project rule). Browser checks (Chrome, seeded admin, backend running):

1. Trip details: **Contract number** row, **Contract** button.
2. Contract page: no sidebar; Print button disabled then enabled; tab title `trip-contract-<number>`.
3. Print preview: A4, header and footer images on each page, no browser date / URL, toolbar hidden; page 1 matches the template; manifest lists every passenger; inspection page ticks match the trip; no luggage page.
4. Save as PDF: suggested name `trip-contract-<number>.pdf`; text is selectable Arabic; barcode scans to the contract number, QR scans to the trip url.
5. Trip with 100 passengers (Excel import, Story 16) → manifest over several pages with repeated headings.
6. Company without header / footer → text fallbacks; UI in Arabic → same document.
7. Trip details QR card **Print** still prints only the QR code; printing the trips list is no longer blank.
8. Narrow screen (390 px): toolbar wraps, no horizontal scroll.

---

## Verification Steps

1. `npm run build` and `npm run lint`; `jsbarcode` is a separate chunk.
2. `npm run dev` with the backend; run the Test Plan in Chrome and Edge, English and Arabic; no console errors.
3. Scripted smoke test (Playwright, scratchpad only): open details → Contract → wait for the Print button to be enabled → `page.pdf({ format: 'A4', preferCSSPageSize: true })` → check the page count (3 for a small trip) and that the text contains `عقد نقل على الطريق البريه`, the contract number and every passenger name, and not `عقد نقل حقائب`.

---

## Done Criteria

- [x] `jsbarcode` and `@fontsource/cairo` installed; `Trip.contractNumber` typed.
- [x] `/trips/:id/contract` outside `AppLayout`, inside `RequireAuth`; `ROUTES.tripContract`.
- [x] Contract document: RTL Arabic, company header / footer on every printed page (text fallbacks), contract page, manifest with all passengers and repeated headings, inspection page, no luggage page.
- [x] Print button enabled only when images, barcode and font are ready; `document.title` set and restored.
- [x] QR card print rule scoped with `body:has(.printArea)`.
- [x] Contract button and contract number on trip details; `print` icon.
- [x] English and Arabic toolbar texts.
- [x] `npm run build` and `npm run lint` pass; browser checks above pass.

## Implementation notes (2026-11-09)

Differences from the code blocks above, which stay as the intended design:

- Bidi: numbers, dates, times, phones and identity numbers are wrapped in `<bdi dir="ltr">` in the contract components (a phone `+966…` otherwise printed as `966…+`); values that may mix scripts (plate, doc type, English check names) use plain `<bdi>`. `ltr()` is used only on the trip details page.
- The content padding is on `td.content` (a `.frame > tbody > tr > td` reset first removed it). Tables use 9.5 pt, line height 1.35 and 1 mm cell padding so the 16-check inspection fits one page, as in the template.
- Image readiness tracks a set of settled object URLs (not a counter). `useFontsReady` calls `document.fonts.load('700 16px Cairo', 'عقد')` before `document.fonts.ready`. `useDocumentTitle` lives in `TripContractPage.tsx`.
- The `FileObjectUrl` type is now exported from `src/features/files/index.ts`.
- Driver column heading uses "نوع السيارة" (the template prints the two words reversed); the rest of the text is verbatim, template spelling included.
- Passenger order is the API's (sorted by name), so the numbering follows names, not entry order.
- Phone width: the A4 sheet is shown at `zoom: 0.45` below 840 px (screen only).

Verified (headless Chrome, 2026-11-09, test company / vehicle / driver / trips created and deleted by the script): 32/32 checks — details row and button, page outside the layout, Print enabled only when ready, tab title, RTL Arabic document in both UI languages, all fields, 60 passengers listed, Riyadh inspection time, failed-check note, no luggage text, barcode drawn, Cairo loaded, toolbar hidden in print, text header / footer fallbacks, "no passengers" row, PM time, QR card print still isolates the card while other pages print normally, no horizontal scroll at 390 px, title restored, no console errors. Print PDFs (`page.pdf` with print media) rendered and inspected: small trip 3 pages, 60 passengers 5 pages; header / footer images on every page; passenger headings repeated; inspection on one page.

Not tested: a real printer, Firefox / Safari, the system print dialog itself.

**STOP HERE. Report to the user and wait for confirmation before starting another story.**
