# Companies

Leasing company profiles with optional header/footer images (used on printed documents). Source: `src/modules/companies/`.

| Method | Path | Purpose | Success |
|--------|------|---------|---------|
| POST | `/api/companies` | Create a company | 201 |
| GET | `/api/companies` | List companies, newest first (paginated) | 200 |
| GET | `/api/companies/:id` | Get a company | 200 |
| PATCH | `/api/companies/:id` | Update a company | 200 |
| DELETE | `/api/companies/:id` | Soft-delete a company | 204 |

## Types

```ts
interface Company {
  id: string;
  name: string;
  registrationNumber: string;
  city: string;
  address: string;
  whatsAppNumber: string;
  phoneNumber: string;
  headerUrl: string | null;   // "/api/files/<id>/download" or null
  footerUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CreateCompanyBody {
  name: string;                // trimmed, 2–256
  registrationNumber: string;  // trimmed, 2–256, unique among non-deleted companies
  city: string;                // trimmed, 2–256
  address: string;             // trimmed, 2–256
  whatsAppNumber: string;      // trimmed, 2–256 (free text, e.g. "+966500000000")
  phoneNumber: string;         // trimmed, 2–256
  headerUrl?: string | null;   // url from POST /api/files, ≤ 512
  footerUrl?: string | null;
}

type UpdateCompanyBody = Partial<CreateCompanyBody>;
```

### Image rules (`headerUrl`, `footerUrl`)

1. Upload first: `POST /api/files` with `ownerType=companies` and **no** `ownerId`; send the returned `url`.
2. The file must be a live `companies` file that is not linked to another company, and a **JPEG, PNG or WebP** image.
3. `headerUrl` and `footerUrl` must be different files.
4. On **PATCH**: a new url replaces the image and the old file is deleted; `null` removes the image (and deletes the file); omitted keeps it.

## POST /api/companies

```json
{
  "name": "Azm Leasing",
  "registrationNumber": "CR-1010",
  "city": "Riyadh",
  "address": "King Fahd Rd",
  "whatsAppNumber": "+966500000000",
  "phoneNumber": "+966110000000",
  "headerUrl": "/api/files/3f2b8c1e-4a5d-4e6f-9a7b-1c2d3e4f5a6b/download"
}
```

**201** — `Company`:

```json
{
  "id": "a5d7f6d5-7516-4fb4-9297-67fa03dfa074",
  "name": "Azm Leasing",
  "registrationNumber": "CR-1010",
  "city": "Riyadh",
  "address": "King Fahd Rd",
  "whatsAppNumber": "+966500000000",
  "phoneNumber": "+966110000000",
  "headerUrl": "/api/files/3f2b8c1e-4a5d-4e6f-9a7b-1c2d3e4f5a6b/download",
  "footerUrl": null,
  "createdAt": "2026-10-31T18:44:48.228Z",
  "updatedAt": "2026-10-31T18:44:48.228Z"
}
```

Errors:

- **400** validation; `headerUrl and footerUrl must be different files`; `headerUrl must be the url of a file uploaded with ownerType "companies" and not used by another company` (same for `footerUrl`); `headerUrl must point to a JPEG, PNG or WebP image`.
- **409** `Registration number is already in use`.

## GET /api/companies

Query: `page`, `limit`, `search` (see [README](README.md#lists-and-pagination)). `search` matches **name, registration number and city**.

**200**

```json
{
  "data": [
    {
      "id": "a5d7f6d5-7516-4fb4-9297-67fa03dfa074",
      "name": "Azm Leasing",
      "registrationNumber": "CR-1010",
      "city": "Riyadh",
      "address": "King Fahd Rd",
      "whatsAppNumber": "+966500000000",
      "phoneNumber": "+966110000000",
      "headerUrl": null,
      "footerUrl": null,
      "createdAt": "2026-10-31T18:44:48.228Z",
      "updatedAt": "2026-10-31T18:44:48.228Z"
    }
  ],
  "meta": { "page": 1, "limit": 10, "total": 1, "totalPages": 1 }
}
```

## GET /api/companies/:id

**200** — `Company`. Errors: **400** bad uuid; **404** `Company <id> not found`.

## PATCH /api/companies/:id

Any subset of the create fields. Examples: `{ "city": "Jeddah" }`, `{ "headerUrl": null }`. **200** — updated `Company`.

Errors: same as create, plus **404**. `null` on a required field (e.g. `"name": null`) → **400**.

## DELETE /api/companies/:id

**204** (soft delete). Its vehicles are not deleted. Errors: **400** bad uuid; **404**.
