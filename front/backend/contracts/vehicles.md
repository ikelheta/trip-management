# Vehicles

Vehicles owned by a company. Source: `src/modules/vehicles/`.

| Method | Path | Purpose | Success |
|--------|------|---------|---------|
| POST | `/api/vehicles` | Create a vehicle | 201 |
| GET | `/api/vehicles` | List vehicles, newest first (paginated) | 200 |
| GET | `/api/vehicles/:id` | Get a vehicle | 200 |
| PATCH | `/api/vehicles/:id` | Update a vehicle | 200 |
| DELETE | `/api/vehicles/:id` | Soft-delete a vehicle | 204 |

## Types

```ts
interface Vehicle {
  id: string;
  plateNumber: string;
  model: string;
  type: string;
  companyId: string;
  createdAt: string;
  updatedAt: string;
}

interface CreateVehicleBody {
  plateNumber: string;  // trimmed, 1–50, unique among non-deleted vehicles
  model: string;        // trimmed, 1–256
  type: string;         // trimmed, 1–256 (free text, e.g. "Bus")
  companyId: string;    // UUID of an existing, non-deleted company
}

type UpdateVehicleBody = Partial<CreateVehicleBody>; // null rejected
```

The response has only `companyId`; load the company with `GET /api/companies/:id` (or cache the company list) to show its name.

## POST /api/vehicles

```json
{
  "plateNumber": "ABC 1234",
  "model": "Toyota Hiace 2024",
  "type": "Bus",
  "companyId": "a5d7f6d5-7516-4fb4-9297-67fa03dfa074"
}
```

**201**

```json
{
  "id": "4547f27b-3db8-416c-811a-1cdb7f972894",
  "plateNumber": "ABC 1234",
  "model": "Toyota Hiace 2024",
  "type": "Bus",
  "companyId": "a5d7f6d5-7516-4fb4-9297-67fa03dfa074",
  "createdAt": "2026-10-31T18:44:48.238Z",
  "updatedAt": "2026-10-31T18:44:48.238Z"
}
```

Errors: **400** validation; `Company <companyId> does not exist`. **409** `Plate number is already in use`.

## GET /api/vehicles

| Query | Rules |
|-------|-------|
| `page`, `limit`, `search` | see [README](README.md#lists-and-pagination); `search` matches **plate number, model and type** |
| `companyId` | optional UUID — only this company's vehicles |

**200** — `{ data: Vehicle[], meta }`:

```json
{
  "data": [
    {
      "id": "4547f27b-3db8-416c-811a-1cdb7f972894",
      "plateNumber": "ABC 1234",
      "model": "Toyota Hiace 2024",
      "type": "Bus",
      "companyId": "a5d7f6d5-7516-4fb4-9297-67fa03dfa074",
      "createdAt": "2026-10-31T18:44:48.238Z",
      "updatedAt": "2026-10-31T18:44:48.238Z"
    }
  ],
  "meta": { "page": 1, "limit": 10, "total": 1, "totalPages": 1 }
}
```

## GET /api/vehicles/:id

**200** — `Vehicle`. Errors: **400** bad uuid; **404** `Vehicle <id> not found`.

## PATCH /api/vehicles/:id

E.g. `{ "model": "Toyota Hiace 2025" }`. **200** — updated `Vehicle`.

Errors: as on create, plus **404**.

## DELETE /api/vehicles/:id

**204** (soft delete). Drivers and trips that reference it keep their `vehicleId`, but new drivers/trips cannot use it. Errors: **400**; **404**.
