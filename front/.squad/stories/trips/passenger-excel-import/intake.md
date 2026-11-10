# Story intake

- Folder: `.squad/stories/trips/passenger-excel-import/intake.md`

---

## Feature

- **Feature name (display):** Trips
- **Feature slug (folder under `plans/`):** `trips`

## Tracker (metadata only)

- **Tracker type:** `none`
- **Work item id:** ``
- **Work item type:** `Story`
- **Status:** `New`
- **Labels:** `frontend`, `trips`, `passengers`, `excel`, `import`

---

## Title

```text
Import trip passengers from an Excel file
```

---

## Description

```text
Typing many passengers one by one on the "New trip" form is slow. The
passengers section gets an "Import from Excel" action: the user picks an
.xlsx file and its rows are added to the passenger list, ready to review
before the trip is saved.

The file:
- .xlsx, first sheet only, first row is the header row.
- Four required columns, matched by header (any order, case and spaces
  ignored, English or Arabic header text):
    Name            / الاسم
    Identity number / رقم الهوية
    Document type   / نوع الوثيقة
    Nationality     / الجنسية
  Extra columns are ignored. Completely empty rows are skipped.
- A "Download template" action gives an .xlsx with exactly these headers
  (in the current language) and the identity number column formatted as
  Text, so leading zeros are kept.

Behaviour:
- The imported rows are ADDED after the passengers already in the list.
- Nothing is sent to the server on import. The rows go into the form, and
  the existing passenger rules (name 2–256, identity number 1–50 digits,
  document type 1–50, nationality 2–256, no repeated identity number, at
  most 100 passengers) are checked at once so wrong cells are marked in red
  and can be fixed or removed before "Create trip".
- The whole file is rejected, with a clear message and nothing added, when:
  it is not an .xlsx file, it cannot be read, a required column is missing
  (the message names the missing columns), it has no data rows, or the
  list would go over 100 passengers.
- After a successful import a message says how many passengers were added
  from which file.
- All texts in English and Arabic.

The same passengers section is used on "Edit trip", so the import works
there too.
```

---

## Acceptance criteria

```text
- [ ] "New trip" shows "Import from Excel" and "Download template" in the
      passengers section.
- [ ] The downloaded template opens in Excel with the four headers; an
      identity number typed with leading zeros keeps them.
- [ ] Importing a valid file adds one passenger row per data row, after the
      existing rows, and shows "N passengers added from <file>".
- [ ] Headers in English or Arabic, in any order and case, are recognised;
      extra columns are ignored; empty rows are skipped.
- [ ] A missing column, a non-.xlsx file, an unreadable file, a file with no
      data rows, or more than 100 passengers in total is rejected with a
      message and adds nothing.
- [ ] Invalid cells (e.g. letters in the identity number, a repeated identity
      number) are marked on the imported rows straight away; "Create trip"
      is blocked until they are fixed.
- [ ] A trip created from imported rows has those passengers on its details
      page.
- [ ] English and Arabic texts; right-to-left layout in Arabic.
- [ ] npm run build and npm run lint pass.
```

---

## Dependencies

- **Blocked by:** Story 11 (trip form with passengers, implemented), Story 13/14 (texts in both languages, implemented).
- No backend change: `POST /api/trips` / `PATCH /api/trips/:id` already take
  `passengers[]` (backend/contracts/trips.md, `PassengerBody`).

## Extra notes (optional)

- New dependencies are needed to read and write .xlsx in the browser:
  `read-excel-file` and `write-excel-file` (MIT). Both are loaded only when
  the user imports or downloads the template, so the main bundle does not
  grow. The npm `xlsx` package is not used: its npm release is stuck on
  0.18.5, which has known security advisories.

## Out of scope

- .xls, .csv or other formats; choosing a sheet; a column-mapping screen;
  a "replace the list" mode (users remove rows by hand); a server-side
  bulk-import endpoint; exporting a trip's passengers to Excel.
