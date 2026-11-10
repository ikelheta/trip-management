# Countries

Country reference data with Arabic and English names. `npm run seed` loads all 249 ISO 3166-1 countries. Used as a driver's nationality. Source: `src/modules/countries/`.

| Method | Path | Purpose | Success |
|--------|------|---------|---------|
| POST | `/api/countries` | Create a country | 201 |
| GET | `/api/countries` | List countries, newest first (paginated) | 200 |
| GET | `/api/countries/:id` | Get a country | 200 |
| PATCH | `/api/countries/:id` | Update a country | 200 |
| DELETE | `/api/countries/:id` | Soft-delete a country | 204 |

## Types

```ts
interface Country {
  id: string;
  nameAr: string;
  nameEn: string;
  createdAt: string;
  updatedAt: string;
}

interface CreateCountryBody {
  nameAr: string;   // trimmed, 2–256, unique among non-deleted countries
  nameEn: string;   // trimmed, 2–256, unique among non-deleted countries
}

type UpdateCountryBody = Partial<CreateCountryBody>; // null rejected
```

## POST /api/countries

```json
{ "nameAr": "المملكة العربية السعودية", "nameEn": "Saudi Arabia" }
```

**201**

```json
{
  "id": "fe8cd526-836a-4489-a995-50de222e3b94",
  "nameAr": "المملكة العربية السعودية",
  "nameEn": "Saudi Arabia",
  "createdAt": "2026-10-31T18:29:36.939Z",
  "updatedAt": "2026-10-31T18:29:36.939Z"
}
```

Errors: **400** validation; **409** `Arabic name is already in use` / `English name is already in use`.

## GET /api/countries

Query: `page`, `limit` (max 100), `search` — matches **nameAr and nameEn**. Sorted newest first (seeded rows share one timestamp, so their order is arbitrary but stable); sort by name on the client if needed. For a nationality picker, use `search` with a debounced input rather than loading all 249.

**200**

```json
{
  "data": [
    {
      "id": "fe8cd526-836a-4489-a995-50de222e3b94",
      "nameAr": "كوريا الجنوبية",
      "nameEn": "South Korea",
      "createdAt": "2026-10-31T18:29:36.939Z",
      "updatedAt": "2026-10-31T18:29:36.939Z"
    },
    {
      "id": "fdfbe328-381b-480e-99ad-6441b4ec7a47",
      "nameAr": "بليز",
      "nameEn": "Belize",
      "createdAt": "2026-10-31T18:29:36.939Z",
      "updatedAt": "2026-10-31T18:29:36.939Z"
    }
  ],
  "meta": { "page": 1, "limit": 2, "total": 249, "totalPages": 125 }
}
```

## GET /api/countries/:id

**200** — `Country`. Errors: **400** bad uuid; **404** `Country <id> not found`.

## PATCH /api/countries/:id

E.g. `{ "nameEn": "Kingdom of Saudi Arabia" }`. **200** — updated `Country`.

Errors: **400** validation (including `null`); **404**; **409** as on create.

## DELETE /api/countries/:id

**204** (soft delete). Drivers that use it keep their `nationalityId`. Errors: **400**; **404**.
