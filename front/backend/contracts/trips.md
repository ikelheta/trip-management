# Trips

A trip is one vehicle + one driver on a date and time, with nested **passengers**, a required **pre-trip inspection**, and a generated **QR code**. Source: `src/modules/trips/` (inspection logic in `src/modules/trip-inspections/`, which has no endpoints of its own).

| Method | Path | Purpose | Success |
|--------|------|---------|---------|
| POST | `/api/trips` | Create a trip with passengers and inspection; generates its QR code | 201 |
| GET | `/api/trips` | List trips, latest date/time first (paginated) | 200 |
| GET | `/api/trips/:id` | Get a trip | 200 |
| PATCH | `/api/trips/:id` | Update trip fields, replace passengers, edit the inspection | 200 |
| POST | `/api/trips/:id/qr-code` | Generate a new QR code (old file deleted) | 200 |
| DELETE | `/api/trips/:id` | Soft-delete a trip | 204 |

Every trip response has the same full shape (`Trip` below), including passengers and inspection, on create, list, get and update.

## Types

```ts
interface Passenger {
  id: string;
  name: string;
  identityNumber: string;  // digits only, as a string
  docType: string;         // free text, e.g. "passport", "national_id"
  nationality: string;     // free text (not a country id)
}

interface InspectionCheckResult {
  checkId: string;
  nameAr: string;          // snapshot taken when the inspection was created
  nameEn: string;
  status: boolean;         // true = good
  note: string | null;
}

interface InspectionIndicatorResult {
  indicatorId: string;
  nameAr: string;
  nameEn: string;
  passed: boolean;         // every check of this indicator is good
  checks: InspectionCheckResult[];
}

interface TripInspection {
  id: string;
  tripId: string;
  inspectedAt: string;     // ISO timestamp
  passed: boolean;         // every check is good
  failedCount: number;
  indicators: InspectionIndicatorResult[]; // ordered by the snapshot
  createdAt: string;
  updatedAt: string;
}

interface Trip {
  id: string;
  tripName: string | null;
  secretCode: string | null;
  vehicleId: string;
  driverId: string;
  date: string;            // "YYYY-MM-DD"
  time: string;            // "HH:mm:ss"
  origin: string | null;      // free text, e.g. "Riyadh"; null only for trips created before origin/destination existed
  destination: string | null; // free text, e.g. "Jeddah"
  contractNumber: string;   // "YYYYMMDD-NNNN", e.g. "20261115-0001"; see Contract number
  qrCodeUrl: string | null; // "/api/files/<id>/download" (PNG); null if generation failed or trip predates QR codes
  passengers: Passenger[]; // sorted by name
  inspection: TripInspection | null; // null only for trips created before inspections were required
  createdAt: string;
  updatedAt: string;
}

// ---- Request bodies ----

interface PassengerBody {
  name: string;            // trimmed, 2–256
  identityNumber: string;  // trimmed, 1–50 digits only (string, keeps leading zeros); unique within the trip
  docType: string;         // trimmed, 1–50
  nationality: string;     // trimmed, 2–256
}

interface InspectionResultBody {
  checkId: string;         // UUID of a live check (from GET /api/inspection-indicators)
  status: boolean;         // a real boolean, not "true"
  note?: string | null;    // trimmed, 1–500; omitted or null = no note
}

interface CreateTripBody {
  tripName?: string | null;   // trimmed, 2–256
  secretCode?: string | null; // trimmed, 1–50
  vehicleId: string;          // existing, non-deleted vehicle
  driverId: string;           // existing, non-deleted driver
  date: string;               // "YYYY-MM-DD", a real date
  time: string;               // "HH:mm" or "HH:mm:ss", 24h
  origin: string;             // REQUIRED, trimmed, 2–256, free text (where the trip starts)
  destination: string;        // REQUIRED, trimmed, 2–256, free text (where the trip ends)
  passengers?: PassengerBody[]; // max 100; omit for none; null rejected
  inspection: {               // REQUIRED
    inspectedAt?: string;     // ISO 8601 with offset, e.g. "2026-11-15T07:45:00+03:00"; default now; null rejected
    results: InspectionResultBody[]; // exactly one per live check, 1–200 items, no repeated checkId
  };
}

interface UpdateTripBody {
  tripName?: string | null;   // null clears
  secretCode?: string | null; // null clears
  vehicleId?: string;
  driverId?: string;
  date?: string;
  time?: string;
  origin?: string;            // trimmed, 2–256; null rejected
  destination?: string;       // trimmed, 2–256; null rejected
  passengers?: PassengerBody[]; // REPLACES the whole list; [] clears; omit = unchanged
  inspection?: {              // omit = unchanged; null rejected
    inspectedAt?: string;
    results?: InspectionResultBody[]; // only the checks to change (status + note replaced)
  };
}
```

`qrCodeUrl` is read-only: sending it in POST or PATCH → **400** `property qrCodeUrl should not exist`.

## POST /api/trips

Build `inspection.results` from `GET /api/inspection-indicators`: one entry for **every** check of **every** indicator.

```json
{
  "tripName": "Riyadh to Jeddah — morning",
  "secretCode": "A7K29Q",
  "vehicleId": "4547f27b-3db8-416c-811a-1cdb7f972894",
  "driverId": "668bcc14-107b-4243-a435-715ccc5f3312",
  "date": "2026-11-15",
  "time": "08:30",
  "origin": "Riyadh",
  "destination": "Jeddah",
  "passengers": [
    { "name": "Sara Ahmed", "identityNumber": "1010101010", "docType": "national_id", "nationality": "Saudi Arabia" },
    { "name": "John Smith", "identityNumber": "0012345678", "docType": "passport", "nationality": "United Kingdom" }
  ],
  "inspection": {
    "inspectedAt": "2026-11-15T07:45:00+03:00",
    "results": [
      { "checkId": "d31e0bbe-a922-4a13-be17-0b558b072292", "status": true },
      { "checkId": "4db41078-76b6-498d-be7f-c1da8d178516", "status": false, "note": "Needle stuck at cold" }
      /* … one entry per live check (16 with the seeded checklist) */
    ]
  }
}
```

Trip, passengers and inspection are saved in **one transaction**: any error creates nothing. Then the QR code is generated (see [QR code](#qr-code)).

**201** — `Trip`:

```json
{
  "id": "a96bf08b-688d-4c09-b166-0ffe19480b05",
  "tripName": "Riyadh to Jeddah — morning",
  "secretCode": "A7K29Q",
  "vehicleId": "4547f27b-3db8-416c-811a-1cdb7f972894",
  "driverId": "668bcc14-107b-4243-a435-715ccc5f3312",
  "date": "2026-11-15",
  "time": "08:30:00",
  "origin": "Riyadh",
  "destination": "Jeddah",
  "contractNumber": "20261115-0001",
  "qrCodeUrl": "/api/files/aa569ad1-ff2a-4e18-aeae-2b0fa5e50f6e/download",
  "passengers": [
    { "id": "5e6f7a8b-9c0d-4e1f-8a2b-3c4d5e6f7a8b", "name": "John Smith", "identityNumber": "0012345678", "docType": "passport", "nationality": "United Kingdom" },
    { "id": "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d", "name": "Sara Ahmed", "identityNumber": "1010101010", "docType": "national_id", "nationality": "Saudi Arabia" }
  ],
  "inspection": {
    "id": "eb6e5ae3-9a97-4a7e-b07b-adc5f210f0fe",
    "tripId": "a96bf08b-688d-4c09-b166-0ffe19480b05",
    "inspectedAt": "2026-11-15T04:45:00.000Z",
    "passed": false,
    "failedCount": 1,
    "indicators": [
      {
        "indicatorId": "f2c0f1a8-3df4-491a-a8c6-d7db36ea6df5",
        "nameAr": "فحص مؤشرات لوحة القيادة",
        "nameEn": "Dashboard Indicators",
        "passed": false,
        "checks": [
          { "checkId": "d31e0bbe-a922-4a13-be17-0b558b072292", "nameAr": "مؤشر الوقود", "nameEn": "Fuel gauge", "status": true, "note": null },
          { "checkId": "4db41078-76b6-498d-be7f-c1da8d178516", "nameAr": "مؤشر الحرارة", "nameEn": "Temperature gauge", "status": false, "note": "Needle stuck at cold" }
        ]
      }
      /* … the other indicators */
    ],
    "createdAt": "2026-10-31T18:44:48.375Z",
    "updatedAt": "2026-10-31T18:44:48.375Z"
  },
  "createdAt": "2026-10-31T18:44:48.360Z",
  "updatedAt": "2026-10-31T18:44:48.402Z"
}
```

Errors (all **400** unless noted; nothing is created):

| Cause | Message |
|-------|---------|
| Field validation | array of messages, e.g. `date must be in YYYY-MM-DD format`, `time must be in HH:mm or HH:mm:ss format (24h)`, `origin must be longer than or equal to 2 characters` / `destination must be a string` (both fields are required), `passengers.0.identityNumber must contain 1-50 digits only`, `passengers must not repeat an identityNumber` |
| `inspection` missing or `null` | `inspection should not be null or undefined` (plus `nested property inspection must be either object or array` for `null`) |
| Bad inspection item | e.g. `inspection.results.0.status must be a boolean value`, `inspection.results must not repeat a checkId`, `inspection.results should not be empty` |
| Vehicle / driver missing or deleted | `Vehicle <id> does not exist` / `Driver <id> does not exist` (checked before the inspection) |
| No checklist configured | `No inspection checks are configured` (run `npm run seed`) |
| Unknown / deleted check | `Unknown or deleted checks: <ids>` |
| A live check not answered | `Missing results for checks: <ids>` |

## GET /api/trips

| Query | Rules |
|-------|-------|
| `page`, `limit`, `search` | see [README](README.md#lists-and-pagination); `search` matches **trip name, origin or destination** (case-insensitive, partial) |
| `vehicleId` | optional UUID |
| `driverId` | optional UUID |
| `dateFrom` | optional `"YYYY-MM-DD"`, trips on or after |
| `dateTo` | optional `"YYYY-MM-DD"`, trips on or before |

Sorted by `date` desc, then `time` desc, then `createdAt` desc. Each item is a full `Trip` (passengers + inspection + qrCodeUrl).

**200** — `{ data: Trip[], meta }`.

Errors: **400** validation; `dateFrom must be on or before dateTo`.

## GET /api/trips/:id

**200** — `Trip`. Errors: **400** bad uuid; **404** `Trip <id> not found`.

## PATCH /api/trips/:id

All fields optional; everything in one request is applied in **one transaction** (any error → nothing saved).

```json
{
  "tripName": "Riyadh to Jeddah — moved",
  "time": "09:15",
  "passengers": [
    { "name": "Sara Ahmed", "identityNumber": "1010101010", "docType": "national_id", "nationality": "Saudi Arabia" }
  ],
  "inspection": {
    "results": [
      { "checkId": "4db41078-76b6-498d-be7f-c1da8d178516", "status": true }
    ]
  }
}
```

- `passengers` **replaces** the whole list (`[]` removes all). Omit to keep it.
- `inspection.results` updates only the listed checks: `status` and `note` are replaced (omitted `note` = no note). `inspection.inspectedAt` moves the time. `inspection: {}` changes nothing.
- `tripName: null` / `secretCode: null` clear them; `null` for any other field (including `origin` / `destination`) → 400. Omit `origin` / `destination` to keep them. Trips created before they existed keep `null` until you send them.
- The QR code does not change. `contractNumber` does not change either, even when `date` changes; sending it → 400 `property contractNumber should not exist`.

**200** — updated `Trip`.

Errors: field validation (400, e.g. `vehicleId must be a UUID` for `"vehicleId": null`, `nested property inspection must be either object or array` for `"inspection": null`); `Vehicle <id> does not exist` / `Driver <id> does not exist` (only when changed); `Checks not part of this inspection: <ids>`; `Trip <id> has no inspection` (old trips); **404** `Trip <id> not found`.

## POST /api/trips/:id/qr-code

No body. Generates a new QR code, stores it, sets `qrCodeUrl`, and soft-deletes the previous QR file. Use it for trips with `qrCodeUrl: null` or after the server's `TRIP_QR_BASE_URL` changed.

**200** — `Trip` with the new `qrCodeUrl`.

Errors: **400** bad uuid; **404** `Trip <id> not found`; **415** if the server does not allow `image/png` uploads.

## DELETE /api/trips/:id

**204** (soft delete). Its inspection and QR file stay in the database but are unreachable. Errors: **400**; **404**.

## QR code

- Created automatically after `POST /api/trips` succeeds.
- Content: the plain url **`<TRIP_QR_BASE_URL>/<trip id>`** (server env; default `http://localhost:3000/api/trips`), e.g. `http://localhost:3000/api/trips/a96bf08b-688d-4c09-b166-0ffe19480b05`. Phone cameras open it directly; the trip id is the last path segment. **Since auth (Story 12) the default url needs a token, so a scanned code shows a 401** until `TRIP_QR_BASE_URL` points at a public trip page (not built yet).
- Image: 512×512 PNG at `qrCodeUrl`. The download needs the token: fetch it and show it through an object URL (see [files.md](files.md#get-apifilesiddownload)).
- Best effort: if generation fails, the trip is still created (201) with `qrCodeUrl: null`; show a "Generate QR code" button that calls `POST /api/trips/:id/qr-code`.
- Never contains `secretCode` or passenger data.

## Contract number

- `contractNumber` = trip date (`YYYYMMDD`) + `-` + a sequence per trip date, 4 digits (`20261115-0001`, `20261115-0002`, …; more than 9999 on one date gives 5 digits).
- Assigned by the server when the trip is created; not accepted in `POST` / `PATCH` bodies (400 `property contractNumber should not exist`).
- Never changes (editing `date` keeps it) and is never reused: deleted trips keep theirs, so the next trip of that date gets the next number. Unique across all trips.
- Trips created before Story 14 were numbered per date in creation order.
- Printed under the barcode of the trip contract, which the front end prints from the browser (front-end Story 18).

## Front-end notes

- **Create form:** load `GET /api/inspection-indicators` first and render one yes/no (+ optional note) per check, grouped by indicator. Send every check.
- **Edit form:** send only changed inspection results; send `passengers` only if the list changed (it replaces all).
- **Display names:** responses carry `vehicleId` and `driverId` only; fetch vehicles/drivers to show plate numbers and names.
- **Timezones:** `date`/`time` are local wall-clock values with no timezone; `inspectedAt` is a real instant (UTC in responses).
