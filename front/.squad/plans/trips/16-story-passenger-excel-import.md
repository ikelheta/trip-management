# Story 16 — Import trip passengers from an Excel file

## Prerequisites

- Story 11 completed: [11-story-trip-list-details-and-form-with-passengers-and-inspection.md](11-story-trip-list-details-and-form-with-passengers-and-inspection.md) (trip form, `PassengersFieldset`, passenger schema).
- Stories 13 / 14 completed: every text goes through `tripsMessages` with English and Arabic.
- Story 15 completed: global button / `field-hint` / alert styles used below.
- Intake: `.squad/stories/trips/passenger-excel-import/intake.md`.
- **No backend change.** `POST /api/trips` and `PATCH /api/trips/:id` already accept `passengers: PassengerBody[]` (`backend/contracts/trips.md` lines 71–76, 91, 105).

---

## Story Goal

In the passengers section of the trip form:

1. **"Import from Excel"** reads an `.xlsx` file in the browser and **adds** one passenger row per data row after the rows already in the list.
2. **"Download template"** saves an `.xlsx` with the four headers in the current language and the identity number column formatted as Text.
3. Imported rows are validated **at once** with the existing schema (wrong cells marked in red), and nothing is sent to the server until the user clicks "Create trip" / "Save changes".
4. A bad file (wrong type, too large, unreadable, missing columns, no data rows, over 100 passengers in total) is rejected with a message and adds nothing.

The import lives in `PassengersFieldset`, which both "New trip" and "Edit trip" render, so it works on both.

**Not in scope:** `.xls` / `.csv`, choosing a sheet, a column-mapping screen, a "replace the list" mode, a backend bulk endpoint, exporting passengers.

---

## Context — Read These Files First

1. `backend/contracts/trips.md` — lines 19–25 (`Passenger`) and 71–76 (`PassengerBody`: name 2–256, identityNumber 1–50 digits as a string, docType 1–50, nationality 2–256, unique identity number); line 91 (max 100).
2. `src/features/trips/types/tripSchemas.ts` — line 5 `MAX_PASSENGERS = 100`; lines 23–38 `passengerSchema`; lines 61–76 the `passengers` array with `.max(...)` and the duplicate-identity `superRefine`; line 85 `PassengerFormValues`. **Do not change the rules**; the import relies on them.
3. `src/features/trips/components/PassengersFieldset.tsx` — lines 10–16 (`useFormContext`, `useFieldArray({ name: 'passengers' })`), lines 21–31 (section header with the "Add passenger" button), line 37 (empty text). The import goes into this section.
4. `src/features/trips/components/TripSections.module.css` — lines 1–12 `.sectionHeader`, lines 51–56 the ≤ 720px rules.
5. `src/features/trips/utils/tripForm.ts` — line 20 `EMPTY_PASSENGER`; lines 93 and 116–117 show passengers go to the API unchanged.
6. `src/features/trips/i18n.ts` — lines 1–3 imports (`isolate`, `defineMessages`, `plural`); `en.passengers` at lines 77–87 and `ar.passengers` at lines 216–226 (the labels reused as template headers); `ar.passengersHeading` lines 140–148 for the Arabic `plural` shape; line 294 `TripsMessages`.
7. `src/features/files/components/ImageUploadField.tsx` — the precedent for a file picker in a form: lines 27–38 keep the problem as **data, not text** so the message follows a language switch; lines 63–66 reset `input.value` so the same file can be picked again.
8. `src/shared/i18n/bidi.ts` — `isolate(text)` (line 10) for the file name inside Arabic sentences.

---

## Frontend Tasks

### 1 — Install the two libraries

In the project root:

```
npm install read-excel-file@^9.3.14 write-excel-file@^4.1.1
```

Both MIT. **Do not** install the npm `xlsx` package (its npm release, 0.18.5, has known security advisories) or `exceljs` (much larger).

API facts checked against the package READMEs (versions above):

- `import { readSheet } from 'read-excel-file/browser'` — `await readSheet(file)` takes a `File` / `Blob` / `ArrayBuffer`, reads the **first sheet**, and returns rows: an array of arrays of `string | number | boolean | Date`, empty cells `null`. Only empty rows at the **end** are dropped; empty rows in the middle are kept.
- `import writeExcelFile from 'write-excel-file/browser'` — `await writeExcelFile(sheetData, { columns }).toFile('name.xlsx')` downloads the file. A cell is a value or `{ value, type, format, fontWeight }`; `format: '@'` on a `String` cell makes Excel treat it as Text; `columns: [{ width }]` sets widths (in characters).
- Both `/browser` entries use Web Workers internally.

**Load both only on demand** with `await import(...)` (Task 2), so the main bundle does not grow.

### 2 — Read / write helpers

Create file: `src/features/trips/utils/passengerExcel.ts`

```ts
import { MAX_PASSENGERS, type PassengerFormValues } from '../types/tripSchemas.ts'

export type PassengerColumn = keyof PassengerFormValues

/** Column order in the template. */
export const PASSENGER_COLUMNS: PassengerColumn[] = ['name', 'identityNumber', 'docType', 'nationality']

export const EXCEL_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
export const MAX_IMPORT_FILE_SIZE_MB = 5

const BYTES_PER_MB = 1024 * 1024
const COLUMN_WIDTHS = [32, 20, 18, 24]

// Header text after normaliseHeader() → column. English and Arabic, so a template in either language imports.
const HEADER_ALIASES = new Map<string, PassengerColumn>([
  ['name', 'name'],
  ['fullname', 'name'],
  ['passengername', 'name'],
  ['الاسم', 'name'],
  ['اسمالراكب', 'name'],
  ['identitynumber', 'identityNumber'],
  ['idnumber', 'identityNumber'],
  ['رقمالهوية', 'identityNumber'],
  ['doctype', 'docType'],
  ['documenttype', 'docType'],
  ['نوعالوثيقة', 'docType'],
  ['nationality', 'nationality'],
  ['الجنسية', 'nationality'],
])

type Cell = string | number | boolean | Date | null

/** Why a file was rejected. Kept as data, not text, so the message follows a language switch. */
export type ImportProblem =
  | { kind: 'wrongType' }
  | { kind: 'tooLarge' }
  | { kind: 'unreadable' }
  | { kind: 'noRows' }
  | { kind: 'missingColumns'; columns: PassengerColumn[] }
  | { kind: 'tooMany'; inFile: number; available: number }

export type ImportResult =
  | { ok: true; passengers: PassengerFormValues[]; unreadableIdentityNumbers: number }
  | { ok: false; problem: ImportProblem }

function normaliseHeader(cell: Cell): string {
  return String(cell ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '')
}

function cellToText(cell: Cell): string {
  if (cell === null) {
    return ''
  }
  if (cell instanceof Date) {
    return cell.toISOString().slice(0, 10)
  }
  return String(cell).trim()
}

function isExcelFile(file: File): boolean {
  // Some browsers report an empty type, so the extension decides as well.
  return file.type === EXCEL_MIME_TYPE || file.name.toLowerCase().endsWith('.xlsx')
}

/**
 * Reads passengers from the first sheet of an .xlsx file. The first row is the header row.
 * `existingCount`: passengers already in the form (the total may not exceed MAX_PASSENGERS).
 */
export async function readPassengerFile(file: File, existingCount: number): Promise<ImportResult> {
  if (!isExcelFile(file)) {
    return { ok: false, problem: { kind: 'wrongType' } }
  }
  if (file.size > MAX_IMPORT_FILE_SIZE_MB * BYTES_PER_MB) {
    return { ok: false, problem: { kind: 'tooLarge' } }
  }

  let rows: Cell[][]
  try {
    const { readSheet } = await import('read-excel-file/browser')
    rows = await readSheet(file)
  } catch {
    return { ok: false, problem: { kind: 'unreadable' } }
  }

  const [header = [], ...dataRows] = rows
  const columnIndex = new Map<PassengerColumn, number>()
  header.forEach((cell, index) => {
    const column = HEADER_ALIASES.get(normaliseHeader(cell))
    if (column && !columnIndex.has(column)) {
      columnIndex.set(column, index)
    }
  })
  const missing = PASSENGER_COLUMNS.filter((column) => !columnIndex.has(column))
  if (missing.length > 0) {
    return { ok: false, problem: { kind: 'missingColumns', columns: missing } }
  }

  let unreadableIdentityNumbers = 0
  const passengers: PassengerFormValues[] = []
  for (const row of dataRows) {
    const read = (column: PassengerColumn): Cell => row[columnIndex.get(column) ?? -1] ?? null
    const identityCell = read('identityNumber')
    // Above 2^53 Excel's number has already lost digits; leave it empty so the form asks for it.
    const identityLost = typeof identityCell === 'number' && !Number.isSafeInteger(identityCell)
    const passenger: PassengerFormValues = {
      name: cellToText(read('name')),
      identityNumber: identityLost ? '' : cellToText(identityCell),
      docType: cellToText(read('docType')),
      nationality: cellToText(read('nationality')),
    }
    if (Object.values(passenger).every((value) => value === '') && !identityLost) {
      continue
    }
    if (identityLost) {
      unreadableIdentityNumbers += 1
    }
    passengers.push(passenger)
  }

  if (passengers.length === 0) {
    return { ok: false, problem: { kind: 'noRows' } }
  }
  const available = MAX_PASSENGERS - existingCount
  if (passengers.length > available) {
    return { ok: false, problem: { kind: 'tooMany', inFile: passengers.length, available } }
  }
  return { ok: true, passengers, unreadableIdentityNumbers }
}

/** Downloads an empty template; `headers` are the column labels in the current language. */
export async function downloadPassengerTemplate(
  headers: Record<PassengerColumn, string>,
  fileName: string,
): Promise<void> {
  const { default: writeExcelFile } = await import('write-excel-file/browser')
  const headerRow = PASSENGER_COLUMNS.map((column) => ({ value: headers[column], fontWeight: 'bold' as const }))
  // '@' = Text, so Excel keeps leading zeros in identity numbers typed into the template.
  const emptyRow = PASSENGER_COLUMNS.map((column) =>
    column === 'identityNumber' ? { type: String, value: '', format: '@' } : null,
  )
  const dataRows = Array.from({ length: MAX_PASSENGERS }, () => emptyRow)
  await writeExcelFile([headerRow, ...dataRows], {
    columns: COLUMN_WIDTHS.map((width) => ({ width })),
  }).toFile(fileName)
}
```

Notes for the executor:

- `rows = await readSheet(file)`: if the package's TypeScript types are not assignable to `Cell[][]`, convert with a small `map` to `Cell` — **do not** use `any` or a blind `as`.
- The `sheetData` passed to `writeExcelFile` must match the package's exported types. If `{ type: String, value: '', format: '@' }` or `null` cells do not type-check, adjust to the package's cell type (read `node_modules/write-excel-file/browser/index.d.ts`); keep the `'@'` format on the identity column.
- One file, two functions: they share `PASSENGER_COLUMNS`, the widths and the header names. Do not split into more files.

### 3 — Texts

File: `src/features/trips/i18n.ts` — add an `import` group inside `passengers` in **both** languages (after `removeLabel`).

English (`en.passengers`):

```ts
      import: {
        button: 'Import from Excel',
        reading: 'Reading the file…',
        template: 'Download template',
        templateFileName: 'passengers-template.xlsx',
        templateFailed: 'The template could not be created. Try again.',
        hint: (columns: string) =>
          `Excel file (.xlsx) with the columns ${columns}. Format the identity number column as Text to keep leading zeros.`,
        added: (count: number, fileName: string) =>
          `${plural('en', count, { one: '1 passenger', other: '{count} passengers' })} added from ${fileName}. Check the rows before saving.`,
        identityNumbersLost: (count: number) =>
          `${plural('en', count, { one: '1 identity number was', other: '{count} identity numbers were' })} too long to read as a number. Type them in, or format the column as Text and import again.`,
        problems: {
          wrongType: 'Choose an Excel file (.xlsx).',
          tooLarge: (maxMb: number) => `The file is larger than ${maxMb} MB.`,
          unreadable: 'The file could not be read. Save it as an Excel workbook (.xlsx) and try again.',
          noRows: 'The file has no passenger rows under the header row.',
          missingColumns: (columns: string) => `The file is missing these columns: ${columns}.`,
          tooMany: (inFile: number, available: number, max: number) =>
            `The file has ${inFile} passengers, but only ${available} more fit (at most ${max} per trip).`,
        },
      },
```

Arabic (`ar.passengers`):

```ts
      import: {
        button: 'استيراد من Excel',
        reading: 'جارٍ قراءة الملف…',
        template: 'تنزيل القالب',
        templateFileName: 'passengers-template.xlsx',
        templateFailed: 'تعذّر إنشاء القالب. حاول مرة أخرى.',
        hint: (columns: string) =>
          `ملف Excel ‏(.xlsx) يحتوي على الأعمدة: ${columns}. اجعل تنسيق عمود رقم الهوية «نص» للحفاظ على الأصفار في البداية.`,
        added: (count: number, fileName: string) =>
          `${plural('ar', count, {
            zero: 'لم يُضف أي راكب',
            one: 'أُضيف راكب واحد',
            two: 'أُضيف راكبان',
            few: 'أُضيف {count} ركاب',
            many: 'أُضيف {count} راكبًا',
            other: 'أُضيف {count} راكب',
          })} من ${isolate(fileName)}. راجع الصفوف قبل الحفظ.`,
        identityNumbersLost: (count: number) =>
          `${plural('ar', count, {
            zero: 'لا توجد أرقام هوية',
            one: 'رقم هوية واحد',
            two: 'رقما هوية',
            few: '{count} أرقام هوية',
            many: '{count} رقم هوية',
            other: '{count} رقم هوية',
          })} أطول من أن تُقرأ كرقم. اكتبها يدويًا، أو اجعل تنسيق العمود «نص» واستورد الملف مرة أخرى.`,
        problems: {
          wrongType: 'اختر ملف Excel ‏(.xlsx).',
          tooLarge: (maxMb: number) => `حجم الملف أكبر من ${maxMb} ميجابايت.`,
          unreadable: 'تعذّرت قراءة الملف. احفظه كمصنف Excel ‏(.xlsx) ثم حاول مرة أخرى.',
          noRows: 'لا يحتوي الملف على صفوف ركاب تحت صف العناوين.',
          missingColumns: (columns: string) => `الأعمدة التالية غير موجودة في الملف: ${columns}.`,
          tooMany: (inFile: number, available: number, max: number) =>
            `يحتوي الملف على ${inFile} راكبًا، ولا يتسع إلا لـ ${available} آخرين (الحد الأقصى ${max} لكل رحلة).`,
        },
      },
```

`defineMessages` makes a missing Arabic key a build error — keep both shapes identical.

### 4 — Import component

Create file: `src/features/trips/components/PassengerImport.tsx`

```tsx
import { useRef, useState } from 'react'
import { useMessages } from '../../../shared/i18n/messages.ts'
import { useLanguage } from '../../../shared/i18n/useLanguage.ts'
import { tripsMessages, type TripsMessages } from '../i18n.ts'
import { MAX_PASSENGERS, type PassengerFormValues } from '../types/tripSchemas.ts'
import {
  downloadPassengerTemplate,
  EXCEL_MIME_TYPE,
  MAX_IMPORT_FILE_SIZE_MB,
  PASSENGER_COLUMNS,
  readPassengerFile,
  type ImportProblem,
  type PassengerColumn,
} from '../utils/passengerExcel.ts'
import styles from './TripSections.module.css'

interface PassengerImportProps {
  /** Passengers already in the form. */
  existingCount: number
  onImport: (passengers: PassengerFormValues[]) => void
}

// Data, not text: the message follows a language switch.
type Outcome =
  | { kind: 'added'; count: number; fileName: string; identityNumbersLost: number }
  | { kind: 'problem'; problem: ImportProblem }

function columnLabels(m: TripsMessages): Record<PassengerColumn, string> {
  return {
    name: m.passengers.name,
    identityNumber: m.passengers.identityNumber,
    docType: m.passengers.docType,
    nationality: m.passengers.nationality,
  }
}

function describeProblem(problem: ImportProblem, m: TripsMessages, listColumns: (columns: PassengerColumn[]) => string): string {
  const texts = m.passengers.import.problems
  switch (problem.kind) {
    case 'tooLarge':
      return texts.tooLarge(MAX_IMPORT_FILE_SIZE_MB)
    case 'missingColumns':
      return texts.missingColumns(listColumns(problem.columns))
    case 'tooMany':
      return texts.tooMany(problem.inFile, problem.available, MAX_PASSENGERS)
    default:
      return texts[problem.kind]
  }
}

export function PassengerImport({ existingCount, onImport }: PassengerImportProps) {
  const m = useMessages(tripsMessages)
  const { locale } = useLanguage()
  const input = useRef<HTMLInputElement>(null)
  const [reading, setReading] = useState(false)
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const labels = columnLabels(m)
  const listFormat = new Intl.ListFormat(locale, { type: 'conjunction' })
  const listColumns = (columns: PassengerColumn[]): string => listFormat.format(columns.map((column) => labels[column]))

  async function handleFile(file: File | undefined): Promise<void> {
    setOutcome(null)
    if (!file) {
      return
    }
    setReading(true)
    const result = await readPassengerFile(file, existingCount)
    setReading(false)
    if (result.ok) {
      onImport(result.passengers)
      setOutcome({
        kind: 'added',
        count: result.passengers.length,
        fileName: file.name,
        identityNumbersLost: result.unreadableIdentityNumbers,
      })
    } else {
      setOutcome({ kind: 'problem', problem: result.problem })
    }
    // Allow importing the same file again (e.g. after fixing it in Excel).
    if (input.current) {
      input.current.value = ''
    }
  }

  return (
    <div className="stack">
      <div className={styles.importActions}>
        <input
          ref={input}
          type="file"
          accept={`.xlsx,${EXCEL_MIME_TYPE}`}
          hidden
          onChange={(event) => void handleFile(event.target.files?.[0])}
        />
        <button
          type="button"
          className="btn btn-secondary btn-small"
          disabled={reading || existingCount >= MAX_PASSENGERS}
          onClick={() => input.current?.click()}
        >
          {reading ? m.passengers.import.reading : m.passengers.import.button}
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-small"
          onClick={() => void downloadPassengerTemplate(labels, m.passengers.import.templateFileName)}
        >
          {m.passengers.import.template}
        </button>
      </div>
      <p className="field-hint">{m.passengers.import.hint(listColumns(PASSENGER_COLUMNS))}</p>
      {outcome?.kind === 'added' && (
        <div className="alert alert-success" role="status">
          <p>{m.passengers.import.added(outcome.count, outcome.fileName)}</p>
          {outcome.identityNumbersLost > 0 && <p>{m.passengers.import.identityNumbersLost(outcome.identityNumbersLost)}</p>}
        </div>
      )}
      {outcome?.kind === 'problem' && (
        <div className="alert alert-error" role="alert">
          <p>{describeProblem(outcome.problem, m, listColumns)}</p>
        </div>
      )}
    </div>
  )
}
```

- The `default` branch of `describeProblem` covers `wrongType`, `unreadable`, `noRows` (plain strings). If TypeScript cannot narrow `texts[problem.kind]` to `string`, list those three `case`s explicitly — **no `as`**.
- `readPassengerFile` never throws (it returns `unreadable`), so no `try` is needed around it.
- `downloadPassengerTemplate` can reject (for example the library chunk fails to load). Replace the template button's `onClick` with a handler that catches it and shows the error alert with `m.passengers.import.templateFailed`. Add `{ kind: 'templateFailed' }` to `Outcome`. Do not leave an unhandled promise rejection.

### 5 — Wire it into the passengers section

File: `src/features/trips/components/PassengersFieldset.tsx`

- Line 14: also take `trigger` from `useFormContext<TripFormValues>()`.
- Add the import below the section header (after line 31, before the list error):

```tsx
      <PassengerImport
        existingCount={fields.length}
        onImport={(passengers) => {
          append(passengers, { shouldFocus: false })
          // Show wrong cells at once instead of after the first submit.
          void trigger('passengers')
        }}
      />
```

- Import: `import { PassengerImport } from './PassengerImport.tsx'`.

File: `src/features/trips/components/TripSections.module.css` — add:

```css
.importActions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}
```

No other file changes: `tripForm.ts` already sends `values.passengers` (line 93 create, lines 116–117 edit).

### 6 — Docs

- `src/README.md`: no change (the code is trips-only and not shared).
- After implementing: tick the Done Criteria below, correct any code block here that differs from the code, and set the status line in `.squad/plans/trips/00-overview.md`.

---

## Edge Cases & Failure Modes

- **Identity numbers typed as numbers.** Excel stores `0012345` typed into a General cell as `12345`; `readSheet` returns a `number` and the leading zeros are already gone. The template avoids this (`format: '@'`, Task 2) and the hint tells users to format the column as Text. Files made without the template can still lose zeros; this cannot be recovered on the client.
- **Identity numbers above 2^53** stored as numbers have lost digits. `readPassengerFile` leaves them empty and counts them; the form then shows "required/digits" errors on those rows and the success alert explains (`identityNumbersLost`).
- **Template empty cells.** It is not confirmed that `write-excel-file` writes the `'@'` format for a cell whose value is `''`. **Verify** (Verification step 4): open the template in Excel or LibreOffice, type `0012` in B2, it must stay `0012`. If it does not, change `emptyRow`'s identity cell to the smallest form the library writes with a format (check its README "Format" section); do **not** add an example data row (it would be imported as a passenger).
- **Header variations.** Matching ignores case, spaces, `_` and `-` (`normaliseHeader`): "Identity Number", "identity_number", "IDENTITYNUMBER", "رقم الهوية" all match. Other spellings are rejected with `missingColumns` naming the column in the current language. The first matching column wins if a header repeats.
- **Empty rows in the middle** are returned by `readSheet` and skipped by the `every(value === '')` check.
- **Partially filled rows** are imported; the schema marks the empty cells (e.g. "Enter the document type").
- **Duplicates** within the file or against existing rows are flagged by the existing `superRefine` (`tripSchemas.ts` lines 64–75) on the later row.
- **Over the limit:** `existingCount + rows > 100` → whole file rejected (`tooMany`); the import button is also disabled at 100 passengers.
- **Dates / booleans in cells** become text (`YYYY-MM-DD`, `true`/`false`) and fail validation where wrong, which is visible to the user.
- **Not an .xlsx** (`.xls`, `.csv`, image) → `wrongType`. A renamed non-Excel file with `.xlsx` → `readSheet` throws → `unreadable`.
- **Language switch after an import:** the alert re-renders in the new language because `Outcome` holds data (`ImageUploadField.tsx` lines 27–38 pattern).
- **Web Workers / bundling:** both `/browser` entries spawn Web Workers. If `npm run build` or the dev server fails to resolve the worker, switch the import to `read-excel-file/universal` with `readSheet(await file.arrayBuffer())` and `write-excel-file/universal` with `.toBlob()` plus a temporary `<a download>` link (same steps as `features/files/utils/downloadFile.ts` lines 6–14).
- **Bundle size:** both libraries must appear as separate chunks in the `npm run build` output (dynamic `import()`), not in `index-*.js`.

---

## Test Plan

1. No automated tests (the project has no test runner).
2. **Manual / smoke** with the dev server and backend running, signed in as `admin@example.com`:
   1. "New trip" → "Download template" → a `passengers-template.xlsx` with the four headers in the current language.
   2. Fill 3 rows (one identity number starting with `00`), import → "3 passengers added from …", 3 rows appear with the values, `00` kept.
   3. Add one row by hand first, then import → the imported rows come **after** it.
   4. A file with headers in Arabic, columns in another order, an extra column and an empty middle row → imports correctly.
   5. A file without "Nationality" → error naming it, no rows added.
   6. A `.csv` → "Choose an Excel file (.xlsx)."; a `.txt` renamed to `.xlsx` → "could not be read".
   7. A row with letters in the identity number and a repeated identity number → red errors on those rows immediately; "Create trip" blocked until fixed.
   8. 101 rows → `tooMany`, nothing added.
   9. Create the trip → details page lists the imported passengers.
   10. Repeat 2 and 5 in Arabic (right-to-left, Arabic texts, file name isolated).
   11. "Edit trip" → import adds rows; "Save changes" stores them.

---

## Verification Steps

1. **Frontend builds:** `npm run build` in the project root — passes; the build output lists separate chunks for `read-excel-file` and `write-excel-file`.
2. **Lint:** `npm run lint` — no warnings.
3. **Frontend runs:** `npm run dev` (backend running: `npm run start:dev` in `trip-management/`), go through the Test Plan.
4. **Template check:** open the downloaded template in Excel (or LibreOffice), type `0012` under the identity number header → it stays `0012`.
5. **Regression:** "Add passenger", "Remove", create and edit without importing still work; the trip details passenger table is unchanged.

---

## Done Criteria

- [x] `read-excel-file` and `write-excel-file` are in `dependencies`; no `xlsx` / `exceljs`.
- [x] Both libraries are loaded with dynamic `import()` and appear as separate build chunks.
- [x] "Import from Excel" and "Download template" appear in the passengers section of "New trip" and "Edit trip".
- [x] The template has the four headers in the current language and keeps leading zeros in the identity number column.
- [x] A valid file adds one row per data row after the existing rows and shows "N passengers added from <file>".
- [x] English or Arabic headers in any order / case are recognised; extra columns ignored; empty rows skipped.
- [x] Wrong type, too large, unreadable, missing columns (named), no rows and over-100 are rejected with a message and add nothing.
- [x] Invalid imported cells are marked at once; submit is blocked until fixed.
- [x] A trip created from imported rows shows them on its details page.
- [x] All new texts exist in English and Arabic; Arabic is right-to-left.
- [x] No `any`; `npm run build` and `npm run lint` pass.

## Implementation notes (2026-11-09)

Differences from the code blocks above, which stay as the intended design:

- `passengerExcel.ts`: `readSheet` types date cells as `typeof Date`, so cells go through a small `toCell(value: unknown): Cell` (narrowing, no cast) before use.
- `PassengerImport.tsx`: `describeProblem` lists every `ImportProblem` kind in its own `case` (no `default`); `Outcome` has the extra `templateFailed` kind, and the template button uses `handleTemplate` (try/catch).
- Verified: the downloaded template has Text format (`numFmt "@"`) on identity number cells B2–B101 (checked in the .xlsx XML). The main bundle did not grow by the libraries: `read-excel-file` and `write-excel-file` are separate chunks.
- Browser smoke test (headless Chrome, 2026-11-09): 35/35 checks passed, no console errors. English and Arabic. Covers template download, valid import (headers in any order, extra column, empty row, leading zeros), append after existing rows, immediate red cells (letters, repeated identity number), rejection of missing column / .csv / unreadable / no rows / 101 rows, oversize numeric identity, row removal, creating the trip, details page.
- Not tested: opening the template in real Excel / LibreOffice (only its XML was checked); image-free, print and narrow-screen views of the import buttons.

**STOP HERE. Report to the user and wait for confirmation before starting another story.**
