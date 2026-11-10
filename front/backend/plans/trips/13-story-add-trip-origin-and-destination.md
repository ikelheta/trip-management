# Story 13 — Add the trip's origin and destination (from / to)

## Prerequisites

- **Story 08 completed:** [08-story-trip-management-api.md](08-story-trip-management-api.md) — `src/modules/trips/` (entity, DTOs, repository, service).
- **Stories 10, 11, 12 completed:** [10](10-story-send-pre-trip-inspection-with-trip.md) (inspection in the same create transaction), [11](11-story-generate-trip-qr-code-after-creation.md) (`qrCodeUrl`, latest trips migration), [12](../auth/12-story-basic-jwt-authentication-with-email-and-password.md) (every route needs the token; latest migration overall).
- Intake: [../../stories/trips/add-trip-origin-and-destination/intake.md](../../stories/trips/add-trip-origin-and-destination/intake.md).
- Local PostgreSQL (`trip-management-postgres`) with all migrations applied (latest: `1793455200000-AddPasswordHashToUsers`) — runtime verification only.
- **Do not start until `npm run build` passes on the current `src/`.**
- **Front-end coordination:** after this ships, `POST /api/trips` without `origin` / `destination` returns 400, so the React app's create form breaks until front-end Story 17 (`frontend/trip-managment/.squad/plans/trips/17-story-trip-origin-and-destination.md`) is deployed. Ship both together.

---

## Story Goal

1. Two new trip fields, **`origin`** (from) and **`destination`** (to): free text, trimmed, **2–256** characters.
2. **Required** on `POST /api/trips`. **Optional** on `PATCH /api/trips/:id` (omit = unchanged). **`null` is rejected** on both.
3. Every trip response includes `origin: string | null` and `destination: string | null` (`null` only for trips created before this story).
4. `GET /api/trips?search=` matches **trip name, origin or destination** (case-insensitive partial match).
5. One hand-written migration adds two nullable `varchar(256)` columns.
6. `contract/` updated and mirrored to the front end.

**Not in scope:** a locations table / foreign keys, coordinates, distance, requiring origin ≠ destination, separate `origin` / `destination` list filters, backfilling old trips, tests.

**Hard constraints for the executor:**

- Controller → Service → Repository; `TripResponseDto.fromEntity` maps entities in the controller (unchanged).
- ESM: relative imports end in `.js`.
- The service needs **no change**: `create` spreads the remaining DTO fields into `tripsRepository.create(fields, manager)` (`src/modules/trips/trips.service.ts` lines 69 and 73) and `update` copies every defined field into `changes` (lines 106–109).
- One hand-written migration; `npm run migration:generate` must report no drift afterwards.

---

## Context — Read These Files First

1. `src/modules/trips/entities/trip.entity.ts` — lines 19–23 (`tripName` / `secretCode` nullable `varchar` columns: copy their style), lines 52–58 (`time` and `qrCodeUrl`; the new columns go between them).
2. `src/modules/trips/dto/create-trip.dto.ts` — lines 19–20 the local `Trim()` decorator, lines 27–39 (`tripName` / `secretCode`: `@IsOptional()` → null allowed), lines 64–72 (`time`: required field without `@IsOptional()` → the pattern for the new fields).
3. `src/modules/trips/dto/update-trip.dto.ts` — lines 7–12: `PartialType(OmitType(CreateTripDto, ['inspection']), { skipNullProperties: false })` makes every field optional and keeps rejecting `null` for fields without `@IsOptional()`. **No change needed** — the new fields inherit this.
4. `src/modules/trips/dto/trip-response.dto.ts` — lines 5–25 (fields), lines 28–47 (`fromEntity`).
5. `src/modules/trips/trips.repository.ts` — lines 31–48 `findPaginated` (single `where` object; `search` only on `tripName`, line 38–40).
6. `src/modules/drivers/drivers.repository.ts` — lines 22–36: multi-column search precedent (`pattern` + array of `where` objects spreading a shared `scope`). Copy this shape.
7. `src/modules/trips/trips.service.ts` — lines 65–94 (`create`) and 96–130 (`update`): confirm no change is needed.
8. `src/database/migrations/1793451600000-AddQrCodeUrlToTrips.ts` — lines 1–15: template for an "add column to trips" migration.
9. `contract/trips.md` — lines 54–67 (`Trip`), 84–96 (`CreateTripBody`), 98–110 (`UpdateTripBody`), 115–160 (POST example request / response), 203 (`search` rule), 219–245 (PATCH notes and errors). `contract/README.md` lines 5 (Last updated) and 148–153 (Changelog).

---

## Implementation tasks

### 1 — Entity columns

File: `src/modules/trips/entities/trip.entity.ts` — insert after `time` (line 54), before the QR code comment (line 56):

```ts
  // Free text ("Riyadh", "King Khalid Airport"). Null only for trips created before Story 13.
  @Column({ type: 'varchar', length: 256, nullable: true })
  origin: string | null;

  @Column({ type: 'varchar', length: 256, nullable: true })
  destination: string | null;
```

Column names are the property names (`origin`, `destination`), so no `name:` option is needed.

### 2 — Migration

Create file: `src/database/migrations/1793458800000-AddOriginAndDestinationToTrips.ts`

```ts
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOriginAndDestinationToTrips1793458800000
  implements MigrationInterface
{
  name = 'AddOriginAndDestinationToTrips1793458800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "trips" ADD "origin" character varying(256)`,
    );
    await queryRunner.query(
      `ALTER TABLE "trips" ADD "destination" character varying(256)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "trips" DROP COLUMN "destination"`);
    await queryRunner.query(`ALTER TABLE "trips" DROP COLUMN "origin"`);
  }
}
```

The timestamp is one hour after the latest migration (`1793455200000-AddPasswordHashToUsers`), matching the existing spacing. Check `src/database/migrations/` again right before creating it; if a newer file exists, use its timestamp + 3600000.

### 3 — Request DTO

File: `src/modules/trips/dto/create-trip.dto.ts` — insert after `time` (after line 72), before `passengers`:

```ts
  /**
   * Where the trip starts. Free text, trimmed.
   * @example "Riyadh"
   */
  @Trim()
  @IsString()
  @Length(2, 256)
  origin: string;

  /**
   * Where the trip ends. Free text, trimmed.
   * @example "Jeddah"
   */
  @Trim()
  @IsString()
  @Length(2, 256)
  destination: string;
```

No `@IsOptional()`: missing on POST → 400; `null` on PATCH → 400 (via `skipNullProperties: false` in `UpdateTripDto`). `Trim()` runs first, so `"  "` fails `Length(2, 256)`.

### 4 — Response DTO

File: `src/modules/trips/dto/trip-response.dto.ts`

- After `time` (line 14):

```ts
  /**
   * Null only for trips created before origin and destination existed.
   * @example "Riyadh"
   */
  origin: string | null;
  /** @example "Jeddah" */
  destination: string | null;
```

- In `fromEntity`, after `time: trip.time,` (line 36): `origin: trip.origin,` and `destination: trip.destination,`.

### 5 — Search

File: `src/modules/trips/trips.repository.ts` — replace `findPaginated` (lines 31–48) with the drivers-repository shape:

```ts
  // Searchable columns: tripName, origin, destination. vehicleId/driverId/date range narrow the result.
  findPaginated(query: ListTripsQueryDto): Promise<[Trip[], number]> {
    const dateRange = toDateRange(query.dateFrom, query.dateTo);
    const scope: FindOptionsWhere<Trip> = {
      ...(query.vehicleId && { vehicleId: query.vehicleId }),
      ...(query.driverId && { driverId: query.driverId }),
      ...(dateRange && { date: dateRange }),
    };
    const pattern = query.search
      ? ILike(`%${escapeLike(query.search)}%`)
      : undefined;
    return this.findAndCount({
      where: pattern
        ? [
            { ...scope, tripName: pattern },
            { ...scope, origin: pattern },
            { ...scope, destination: pattern },
          ]
        : scope,
      relations: { passengers: true },
      order: { date: 'DESC', time: 'DESC', createdAt: 'DESC' },
      ...toSkipTake(query),
    });
  }
```

`ListTripsQueryDto` and `BaseListQueryDto` do not change (`search` is already validated there, `src/common/dto/base-list-query.dto.ts` lines 36–41).

### 6 — Contract

`contract/trips.md`:

- `Trip` (lines 54–67): after `time`, add
  `origin: string | null;      // free text; null only for trips created before origin/destination existed`
  `destination: string | null;`
- `CreateTripBody` (lines 84–96): after `time`, add
  `origin: string;             // REQUIRED, trimmed, 2–256, free text`
  `destination: string;        // REQUIRED, trimmed, 2–256, free text`
- `UpdateTripBody` (lines 98–110): after `time`, add `origin?: string;` and `destination?: string;` (`// null rejected`).
- POST example request and the 201 response example (section starting line 115): add `"origin": "Riyadh", "destination": "Jeddah"` after `"time"`. Take the response from a real call (Verification step 3).
- POST errors: add `origin must be longer than or equal to 2 characters` / `destination must be a string` as examples of the new 400s.
- GET query table line 203: `search` matches **trip name, origin or destination**.
- PATCH note line 240: `tripName: null` / `secretCode: null` clear them; `null` for any other field (including `origin` / `destination`) → 400.

`contract/README.md`: set **Last updated** (line 5) to the implementation date with "Story 13, trip origin and destination"; add a Changelog row on top (line 152):

`| <date> | Story 13: trips get required \`origin\` and \`destination\` (free text, 2–256) on create, optional on update, \`null\` for older trips; \`search\` also matches them. | trips |`

Regenerate `contract/openapi.json` with the app running: `curl -s http://localhost:3000/api/docs-json -o contract/openapi.json`.

### 7 — Plans and sync

- Tick the Done Criteria below; set Story 13's status in `.squad/plans/trips/00-overview.md`.
- `npm run sync:frontend`.

---

## Edge Cases & Failure Modes

- **Old trips:** columns are nullable; responses return `null`. `PATCH` of an old trip without the new fields still works (fields stay `null`); sending them fills them.
- **Whitespace only:** `"   "` → trimmed to `""` → `origin must be longer than or equal to 2 characters` (400).
- **Non-string:** `"origin": 5` → `origin must be a string` (400). `Trim()` only trims strings, so `IsString` still sees the number.
- **null:** POST or PATCH with `"origin": null` → 400 (`IsString` / `Length` fail; no `@IsOptional()`), same as `vehicleId: null` today.
- **Unknown field names** such as `from` / `to` → 400 `property from should not exist` (`forbidNonWhitelisted`).
- **Search with filters:** every `where` entry spreads the same `scope`, so `vehicleId` / `driverId` / date range still apply to all three OR branches (same as drivers). `escapeLike` keeps `%` / `_` literal.
- **Same origin and destination** is accepted (round trips).
- **QR code:** content is the trip url only (Story 11); unaffected.
- **Front end not yet updated:** its create form omits the fields → 400 `origin must be …`. Deploy front-end Story 17 together.

---

## Test Plan

No test files (project rule since Story 01). Manual checks with `curl` (token from `POST /api/auth/login`, seeded admin):

1. `POST /api/trips` without `origin` → 400 listing `origin` and `destination` messages.
2. `POST` with `"origin": "  Riyadh ", "destination": "Jeddah"` → 201, response `"origin": "Riyadh"`.
3. `PATCH /api/trips/:id` `{ "destination": "Makkah" }` → 200, `origin` unchanged.
4. `PATCH` `{ "origin": null }` → 400.
5. `GET /api/trips?search=makk` → contains the trip; `?search=makk&vehicleId=<other vehicle>` → does not.
6. `GET /api/trips/<trip created before the migration>` → `"origin": null, "destination": null`.

---

## Migration / Rollback

- **Up:** two `ALTER TABLE "trips" ADD` statements; no data change, no lock-heavy rewrite (nullable, no default).
- **Rollback:** `npm run migration:revert` drops both columns (data in them is lost). Revert the code at the same time, or the entity references missing columns.
- **Half-applied:** if only one `ADD` ran (it cannot partially fail inside TypeORM's migration transaction), re-run `migration:run`.
- **Drift check:** after `migration:run`, `npm run migration:generate -- src/database/migrations/Check` must print "No changes in database schema were found" (same check as Story 11); delete any generated file.

---

## Verification Steps

1. **Backend builds:** `npm run build` and `npm run lint` in `trip-management/`.
2. **Migration:** `npm run migration:run`; then the drift check above.
3. **Runtime:** `npm run start:dev`; run the Test Plan; copy a real 201 response into `contract/trips.md`.
4. **Contract:** `curl -s http://localhost:3000/api/docs-json -o contract/openapi.json`; `origin` / `destination` appear in `CreateTripDto`, `UpdateTripDto` and `TripResponseDto`.
5. **Sync:** `npm run sync:frontend`; `../frontend/trip-managment/backend/contracts/trips.md` shows the new fields.

---

## Done Criteria

- [x] `Trip` entity has nullable `origin` / `destination` `varchar(256)` columns.
- [x] Migration `1793458800000-AddOriginAndDestinationToTrips` adds / drops both; no drift.
- [x] `CreateTripDto` requires both (trimmed, 2–256); `UpdateTripDto` makes them optional and rejects `null`.
- [x] Every trip response includes `origin` and `destination` (`null` for older trips).
- [x] `search` matches trip name, origin or destination, with the existing filters still applied.
- [x] contract/ updated (`trips.md`, `README.md` changelog + last updated, `openapi.json`) and `npm run sync:frontend` run.
- [x] `npm run build` and `npm run lint` pass.

**STOP HERE. Report to the user and wait for confirmation before proceeding.**
