# Drivers

Drivers with a nationality (country) and an assigned vehicle. Source: `src/modules/drivers/`.

| Method | Path | Purpose | Success |
|--------|------|---------|---------|
| POST | `/api/drivers` | Create a driver | 201 |
| GET | `/api/drivers` | List drivers, newest first (paginated) | 200 |
| GET | `/api/drivers/:id` | Get a driver | 200 |
| PATCH | `/api/drivers/:id` | Update a driver | 200 |
| DELETE | `/api/drivers/:id` | Soft-delete a driver | 204 |

## Types

```ts
interface Driver {
  id: string;
  name: string;
  identityId: string;
  nationalityId: string;  // country id
  vehicleId: string;
  createdAt: string;
  updatedAt: string;
}

interface CreateDriverBody {
  name: string;           // trimmed, 2–256
  identityId: string;     // trimmed, 1–50; national ID / iqama; unique among non-deleted drivers
  nationalityId: string;  // UUID of an existing, non-deleted country
  vehicleId: string;      // UUID of an existing, non-deleted vehicle
}

type UpdateDriverBody = Partial<CreateDriverBody>; // null rejected
```

The response has only ids; resolve names with `GET /api/countries/:id` and `GET /api/vehicles/:id`.

## POST /api/drivers

```json
{
  "name": "Mohammed Ali",
  "identityId": "1010101010",
  "nationalityId": "fe8cd526-836a-4489-a995-50de222e3b94",
  "vehicleId": "4547f27b-3db8-416c-811a-1cdb7f972894"
}
```

**201**

```json
{
  "id": "668bcc14-107b-4243-a435-715ccc5f3312",
  "name": "Mohammed Ali",
  "identityId": "1010101010",
  "nationalityId": "fe8cd526-836a-4489-a995-50de222e3b94",
  "vehicleId": "4547f27b-3db8-416c-811a-1cdb7f972894",
  "createdAt": "2026-10-31T18:44:48.246Z",
  "updatedAt": "2026-10-31T18:44:48.246Z"
}
```

Errors: **400** validation; `Country <nationalityId> does not exist`; `Vehicle <vehicleId> does not exist`. **409** `Identity id is already in use`.

## GET /api/drivers

| Query | Rules |
|-------|-------|
| `page`, `limit`, `search` | see [README](README.md#lists-and-pagination); `search` matches **name and identity id** |
| `nationalityId` | optional UUID — only drivers of this nationality |
| `vehicleId` | optional UUID — only drivers assigned to this vehicle |

**200** — `{ data: Driver[], meta }` (same item shape as above).

## GET /api/drivers/:id

**200** — `Driver`. Errors: **400** bad uuid; **404** `Driver <id> not found`.

## PATCH /api/drivers/:id

E.g. `{ "vehicleId": "<another vehicle id>" }`. **200** — updated `Driver`.

Errors: as on create, plus **404**.

## DELETE /api/drivers/:id

**204** (soft delete). Trips that reference the driver keep their `driverId`, but new trips cannot use them. Errors: **400**; **404**.
