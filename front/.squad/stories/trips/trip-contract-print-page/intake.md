# Story intake

- Folder: `.squad/stories/trips/trip-contract-print-page/intake.md`
- Attachments: `attachments/statement_10-11-2026_12-14-44.pdf` — the contract template (4 pages; page 3, the luggage contract, is not printed).

---

## Feature

- **Feature name (display):** Trips
- **Feature slug (folder under `plans/`):** `trips`

## Tracker (metadata only)

- **Tracker type:** `none`
- **Work item id:** ``
- **Work item type:** `Story`
- **Status:** `New`
- **Labels:** `frontend`, `trips`, `print`

---

## Title

```text
Trip contract print page: print or save the driver's contract as PDF from the browser
```

## Description

```text
Every trip needs a printed land transport contract (عقد نقل على الطريق البريه)
that the driver carries. Build it in the front end as a print page; the
user prints it or picks "Save as PDF" in the browser's print dialog.
(Decided 2026-11-09: browser printing instead of a server-rendered PDF.)

- Trip details: a "Contract" button and a "Contract number" row.
- New page /trips/:id/contract, full page without the app sidebar:
  a toolbar (Back to trip, Print / Save as PDF) that is not printed, and
  the contract document below it.
- The document is A4, always Arabic and right to left (whatever the UI
  language). EVERY PRINTED PAGE shows the HEADER image at the top and the
  FOOTER image at the bottom of the COMPANY THAT OWNS THE TRIP'S VEHICLE
  (trip → vehicle → company headerUrl / footerUrl). Without an image, a
  text header (company name) / footer (address, phone, registration no.).
- Pages, following the template:

  Page 1 — Contract: title; barcode (Code 128) of the trip's
    contractNumber and the trip's QR code; date; the fixed legal paragraph
    (article 39 / 40); first party = company name, "سجل رقم" = registration
    number; second party (empty); agreement sentence; trip table النقل من |
    وصولا إلى | رقم الرحلة | وقت الرحلة | تاريخ الرحلة; agreement sentence
    again; heading "بيان الركاب".

  Page 2 (more if needed) — Passenger manifest: time, weekday, entity
    name, date; driver table (identity, name, plate, vehicle type);
    "معلومات الضيوف" table with ALL passengers (الرقم | اسم المعتمرين | نوع
    التاشيرة | رقم جواز السفر رقم التاشيرة | الجنسية). If they do not fit,
    the table continues on the next pages with its headings repeated. Then
    the important note, inquiries (company phone) and booking number.

  Last page — Pre-trip inspection: time, date, plate, driver; one table per
    indicator (Arabic + English titles) with البند - ITEM | SOUND | UNSOUND
    | NOTES and a tick per check.

  REMOVED: the luggage contract page ("عقد نقل حقائب وأمتعة الركاب").

- The browser's "Save as PDF" suggests the file name
  trip-contract-<contractNumber>.
```

## Acceptance criteria

```text
- [ ] Trip details shows "Contract number" and a "Contract" button.
- [ ] /trips/:id/contract shows the toolbar and the document, without the sidebar.
- [ ] Print is enabled only after the header, footer, QR images and the barcode are ready.
- [ ] Print preview (Chrome / Edge): A4, company header and footer on every page,
      contract page, manifest with all passengers (100 passengers → several pages
      with repeated headings), inspection page; no luggage page; toolbar not printed;
      no browser date / URL lines.
- [ ] "Save as PDF" suggests trip-contract-<number>.
- [ ] Arabic text is correct and right to left in both UI languages.
- [ ] Printing the QR code from the trip details page still prints only the QR code.
- [ ] npm run build and npm run lint pass; no console errors.
```

## Dependencies

- Backend Story 14 (`contractNumber` on every trip) implemented and synced.
- Front-end Stories 05 (files: protected images), 06 (companies), 08 (vehicles), 09 (drivers), 11, 12 (trip details, QR code), 14 (translations), 15 (styles).

## Extra notes (defaults chosen where the template is blank)

- رقم الرحلة (trip number) = contract number; اسم الجهة (entity name) = trip name; الطرف الثاني (second party) and رقم الحجز (booking number) empty; للأستفسارات = company phone; نوع السيارة = vehicle model.
- Inspection time printed in Asia/Riyadh.

## Out of scope

- A one-click .pdf download (needs server-side rendering; dropped).
- Sending the contract (WhatsApp / email), signatures, an English contract, a driver login.
