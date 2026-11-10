# Inspection checklist

The admin-managed pre-trip checklist: **indicators** (groups) each holding **checks**. `npm run seed` loads 3 indicators with 16 checks. Every trip's inspection must answer every live check (see [trips.md](trips.md)). Source: `src/modules/inspection-checklist/`.

| Method | Path | Purpose | Success |
|--------|------|---------|---------|
| GET | `/api/inspection-indicators` | **The whole checklist**: every indicator with its checks, sorted (**not paginated**) | 200 |
| POST | `/api/inspection-indicators` | Create an indicator | 201 |
| GET | `/api/inspection-indicators/:id` | Get an indicator with its checks | 200 |
| PATCH | `/api/inspection-indicators/:id` | Update an indicator | 200 |
| DELETE | `/api/inspection-indicators/:id` | Soft-delete an empty indicator | 204 |
| POST | `/api/inspection-checks` | Create a check in an indicator | 201 |
| GET | `/api/inspection-checks/:id` | Get a check | 200 |
| PATCH | `/api/inspection-checks/:id` | Update a check, or move it to another indicator | 200 |
| DELETE | `/api/inspection-checks/:id` | Soft-delete a check | 204 |

There is no `GET /api/inspection-checks` list: read checks through `GET /api/inspection-indicators`.

## Types

```ts
interface InspectionCheck {
  id: string;
  indicatorId: string;
  nameAr: string;
  nameEn: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface InspectionIndicator {
  id: string;
  nameAr: string;
  nameEn: string;
  sortOrder: number;
  checks: InspectionCheck[];  // live checks, sorted by sortOrder then nameEn
  createdAt: string;
  updatedAt: string;
}

interface CreateIndicatorBody {
  nameAr: string;      // trimmed, 2–256, unique among non-deleted indicators
  nameEn: string;      // trimmed, 2–256, unique among non-deleted indicators
  sortOrder?: number;  // integer 0–1000, default 0; lower comes first; null rejected
}
type UpdateIndicatorBody = Partial<CreateIndicatorBody>; // null rejected

interface CreateCheckBody {
  indicatorId: string; // UUID of an existing, non-deleted indicator
  nameAr: string;      // trimmed, 2–256, unique within the indicator
  nameEn: string;      // trimmed, 2–256, unique within the indicator
  sortOrder?: number;  // integer 0–1000, default 0
}
type UpdateCheckBody = Partial<CreateCheckBody>; // null rejected; indicatorId moves the check
```

## GET /api/inspection-indicators

Indicators sorted by `sortOrder` then `nameEn`; each with its live checks sorted the same way. This is what the trip inspection form renders.

**200** (shortened to one indicator and two checks):

```json
[
  {
    "id": "f2c0f1a8-3df4-491a-a8c6-d7db36ea6df5",
    "nameAr": "فحص مؤشرات لوحة القيادة",
    "nameEn": "Dashboard Indicators",
    "sortOrder": 1,
    "checks": [
      {
        "id": "d31e0bbe-a922-4a13-be17-0b558b072292",
        "indicatorId": "f2c0f1a8-3df4-491a-a8c6-d7db36ea6df5",
        "nameAr": "مؤشر الوقود",
        "nameEn": "Fuel gauge",
        "sortOrder": 1,
        "createdAt": "2026-10-31T18:31:52.966Z",
        "updatedAt": "2026-10-31T18:31:52.966Z"
      },
      {
        "id": "4db41078-76b6-498d-be7f-c1da8d178516",
        "indicatorId": "f2c0f1a8-3df4-491a-a8c6-d7db36ea6df5",
        "nameAr": "مؤشر الحرارة",
        "nameEn": "Temperature gauge",
        "sortOrder": 2,
        "createdAt": "2026-10-31T18:31:52.966Z",
        "updatedAt": "2026-10-31T18:31:52.966Z"
      }
    ],
    "createdAt": "2026-10-31T18:31:52.966Z",
    "updatedAt": "2026-10-31T18:31:52.966Z"
  }
]
```

## POST /api/inspection-indicators

```json
{ "nameAr": "فحص مؤشرات لوحة القيادة", "nameEn": "Dashboard Indicators", "sortOrder": 1 }
```

**201** — `InspectionIndicator` with `checks: []`.

Errors: **400** validation; **409** `Arabic name is already in use` / `English name is already in use`.

## GET /api/inspection-indicators/:id

**200** — `InspectionIndicator`. Errors: **400** bad uuid; **404** `Inspection indicator <id> not found`.

## PATCH /api/inspection-indicators/:id

E.g. `{ "sortOrder": 2 }`. **200** — updated `InspectionIndicator` (with checks).

Errors: **400**; **404**; **409** as on create.

## DELETE /api/inspection-indicators/:id

**204**. Errors: **400**; **404**; **409** `Inspection indicator still has checks; delete or move them first`.

## POST /api/inspection-checks

```json
{
  "indicatorId": "f2c0f1a8-3df4-491a-a8c6-d7db36ea6df5",
  "nameAr": "مؤشر الوقود",
  "nameEn": "Fuel gauge",
  "sortOrder": 1
}
```

**201** — `InspectionCheck`:

```json
{
  "id": "d31e0bbe-a922-4a13-be17-0b558b072292",
  "indicatorId": "f2c0f1a8-3df4-491a-a8c6-d7db36ea6df5",
  "nameAr": "مؤشر الوقود",
  "nameEn": "Fuel gauge",
  "sortOrder": 1,
  "createdAt": "2026-10-31T18:31:52.966Z",
  "updatedAt": "2026-10-31T18:31:52.966Z"
}
```

Errors: **400** validation; `Inspection indicator <indicatorId> does not exist`. **409** `Arabic name is already used by another check in this indicator` / `English name is already used by another check in this indicator`.

A new check is required in every **new** trip inspection from then on; existing inspections are not affected.

## GET /api/inspection-checks/:id

**200** — `InspectionCheck`. Errors: **400**; **404** `Inspection check <id> not found`.

## PATCH /api/inspection-checks/:id

E.g. `{ "nameEn": "Fuel level gauge" }` or `{ "indicatorId": "<other indicator>" }`. **200** — updated `InspectionCheck`.

Errors: as on create, plus **404**.

Renaming or moving a check does **not** change past trip inspections: they keep a snapshot of names and order.

## DELETE /api/inspection-checks/:id

**204**. Past inspections keep their copy of the check; new inspections no longer include it. Errors: **400**; **404**.
