# Story 14 — Add a contract number to every trip

## Prerequisites

- **Stories 08 and 13 completed:** [08](08-story-trip-management-api.md) (trips), [13](13-story-add-trip-origin-and-destination.md) (latest migration `1793458800000-AddOriginAndDestinationToTrips`).
- Intake: [../../stories/trips/add-trip-contract-number/intake.md](../../stories/trips/add-trip-contract-number/intake.md).
- Local PostgreSQL (`trip-management-postgres`) with all migrations applied — runtime verification only.
- **Do not start until `npm run build` passes on the current `src/`.**
- **Front-end coordination:** front-end Story 18 (`frontend/trip-managment/.squad/plans/trips/18-story-trip-contract-print-page.md`) prints the number on the contract. This story is additive (new response field), so the current front end keeps working.

---

## Story Goal

1. **`contractNumber`** on every trip: `"YYYYMMDD-NNNN"` = trip date + 4-digit sequence per trip date (`20261110-0001`).
2. Assigned on create inside the create transaction; serialised per date with an advisory lock.
3. Never changed by `PATCH` (not a DTO field → `property contractNumber should not exist`), never reused (soft-deleted trips keep theirs; unique index over all rows).
4. Existing trips backfilled by the migration.
5. Every trip response includes it; `contract/` updated and synced.

**Not in scope:** PDF generation on the server (the front end prints the contract), editing or resetting numbers, tests.

**Hard constraints for the executor:**

- Controller → Service → Repository; raw SQL only in `TripsRepository`.
- ESM: relative imports end in `.js`.
- One hand-written migration; `npm run migration:generate` must report no drift afterwards.

---

## Context — Read These Files First

1. `src/modules/trips/entities/trip.entity.ts` — lines 56–61 (`origin` / `destination`), 63–65 (`qrCodeUrl`). `contractNumber` goes after `destination`.
2. `src/common/entities/base.entity.ts` — `created_at` column (backfill order).
3. `src/modules/trips/trips.service.ts` — lines 65–94 `create` (transaction; `tripsRepository.create(fields, manager)` at line 73), 96–130 `update` (`changes` comes from DTO fields only, so the number cannot change).
4. `src/modules/trips/trips.repository.ts` — lines 1–16 imports (`EntityManager` already imported), 24–29 `findByIdWithPassengers`.
5. `src/modules/trips/dto/trip-response.dto.ts` — lines 5–33 fields, 35–56 `fromEntity`.
6. `src/database/migrations/1793458800000-AddOriginAndDestinationToTrips.ts` — migration template.
7. `contract/trips.md` — `## Types` (line 16), `## Front-end notes` (line 277). `contract/README.md` Changelog (line 148).

---

## Implementation tasks

### 1 — Entity column

`src/modules/trips/entities/trip.entity.ts`, after `destination`:

```ts
  // "YYYYMMDD-NNNN": trip date + sequence per date, assigned on create, never changed or reused.
  // Printed under the barcode of the trip contract (front end).
  @Index('UQ_trips_contract_number', { unique: true })
  @Column({ name: 'contract_number', type: 'varchar', length: 20 })
  contractNumber: string;
```

The unique index is **not** partial: soft-deleted trips keep their number so it is never issued twice.

### 2 — Migration

`src/database/migrations/1793462400000-AddContractNumberToTrips.ts`:

```ts
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddContractNumberToTrips1793462400000 implements MigrationInterface {
  name = 'AddContractNumberToTrips1793462400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "trips" ADD "contract_number" character varying(20)`,
    );
    // Existing trips (deleted ones too): sequence per trip date in creation order.
    await queryRunner.query(`
      UPDATE "trips" AS t
      SET "contract_number" = numbered.value
      FROM (
        SELECT "id",
               to_char("date", 'YYYYMMDD') || '-' ||
               lpad(row_number() OVER (PARTITION BY "date" ORDER BY "created_at", "id")::text, 4, '0') AS value
        FROM "trips"
      ) AS numbered
      WHERE t."id" = numbered."id"
    `);
    await queryRunner.query(
      `ALTER TABLE "trips" ALTER COLUMN "contract_number" SET NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_trips_contract_number" ON "trips" ("contract_number")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."UQ_trips_contract_number"`);
    await queryRunner.query(`ALTER TABLE "trips" DROP COLUMN "contract_number"`);
  }
}
```

### 3 — Assign the number on create

`src/modules/trips/trips.repository.ts`:

```ts
  /**
   * Next "YYYYMMDD-NNNN" for a trip date. Call inside the create transaction: the advisory
   * lock serialises creates for the same date until commit. Counts deleted trips too.
   */
  async nextContractNumber(date: string, manager: EntityManager): Promise<string> {
    await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
      `trip-contract-${date}`,
    ]);
    const prefix = date.replaceAll('-', '');
    const rows: { last: number }[] = await manager.query(
      `SELECT COALESCE(MAX(SUBSTRING("contract_number" FROM 10)::int), 0)::int AS "last"
       FROM "trips" WHERE "contract_number" LIKE $1`,
      [`${prefix}-%`],
    );
    return `${prefix}-${String(rows[0].last + 1).padStart(4, '0')}`;
  }
```

(`SUBSTRING … FROM 10`: `"YYYYMMDD-"` is 9 characters.)

`TripsService.create`, inside the transaction, replacing the `tripsRepository.create(fields, manager)` line:

```ts
      const contractNumber = await this.tripsRepository.nextContractNumber(
        fields.date,
        manager,
      );
      const trip = await this.tripsRepository.create(
        { ...fields, contractNumber },
        manager,
      );
```

### 4 — Response DTO

`src/modules/trips/dto/trip-response.dto.ts`, after `destination`:

```ts
  /**
   * "YYYYMMDD-NNNN" (trip date + sequence per date). Assigned on create; never changes.
   * @example "20261110-0001"
   */
  contractNumber: string;
```

and `contractNumber: trip.contractNumber,` in `fromEntity`.

### 5 — Contract docs

- `contract/trips.md`: `Trip.contractNumber` with the rules (format, assigned on create, sequence per trip date, unique, never changes when the date is edited, never reused, not accepted in bodies). Update the POST / GET examples from a real response. Front-end notes: printed under the contract barcode (front-end Story 18).
- `contract/README.md`: Changelog row + Last updated.
- `curl -s http://localhost:3000/api/docs-json -o contract/openapi.json`.

### 6 — Plans and sync

- Tick the Done Criteria; set Story 14's status in `00-overview.md`.
- `npm run sync:frontend`.

---

## Edge Cases & Failure Modes

- **Two creates for the same date at once:** the advisory lock makes the second wait until the first commits; it then sees `…-0001` and takes `…-0002`. Without the lock the unique index would turn the race into a 409, never a duplicate.
- **Create fails after the number was computed:** the transaction rolls back; the number was never stored, so it is used by the next create (no gap).
- **Trip date edited:** the number keeps the original date (identifier, not a date field). Documented.
- **Deleted trip:** keeps its number; `MAX` reads every row (raw SQL, no soft-delete filter), so the number is not reused.
- **More than 9999 trips on one date:** `padStart` does not truncate → `…-10000`; still unique (length 20). `MAX(SUBSTRING …::int)` still sorts numerically.
- **`contractNumber` in a body:** 400 `property contractNumber should not exist` (`forbidNonWhitelisted`).

---

## Test Plan

No test files (project rule since Story 01). Manual checks with `curl` (token from `POST /api/auth/login`, seeded admin):

1. After `migration:run`: `SELECT contract_number, date, created_at FROM trips ORDER BY date, created_at;` — every row numbered, sequence restarts per date.
2. Create two trips for `2026-11-10` → consecutive numbers; one for `2026-11-11` → `20261111-000N` continuing that date's sequence.
3. `PATCH` the date of one trip → number unchanged. `PATCH` `{ "contractNumber": "x" }` → 400.
4. Delete the latest trip of a date, create another → next number, not the deleted one.
5. Fire two creates for the same new date at once (`curl … & curl …`) → two different numbers, no 409.

---

## Migration / Rollback

- **Up:** add nullable column → backfill (one `UPDATE` with `row_number()`) → `SET NOT NULL` → unique index, in TypeORM's migration transaction.
- **Rollback:** `npm run migration:revert` drops index and column; revert the code too. Re-running `up` re-numbers by creation order, which can differ from numbers already printed on contracts.
- **Drift check:** `npm run migration:generate -- src/database/migrations/Check` must print "No changes in database schema were found"; delete any generated file.

---

## Verification Steps

1. `npm run build` and `npm run lint`.
2. `npm run migration:run`, then the drift check.
3. `npm run start:dev`; run the Test Plan; copy a real response into `contract/trips.md`.
4. Regenerate `contract/openapi.json`; `TripResponseDto` has `contractNumber`.
5. `npm run sync:frontend`; `../frontend/trip-managment/backend/contracts/trips.md` shows the field.

---

## Done Criteria

- [x] `Trip.contractNumber` column with a unique (non-partial) index.
- [x] Migration `1793462400000-AddContractNumberToTrips` adds, backfills and indexes it; no drift.
- [x] New trips get `YYYYMMDD-NNNN` per trip date under an advisory lock; `PATCH` never changes it; not accepted in bodies.
- [x] Every trip response includes `contractNumber`.
- [x] contract/ updated (`trips.md`, `README.md` changelog + last updated, `openapi.json`) and `npm run sync:frontend` run.
- [x] `npm run build` and `npm run lint` pass.

## Implementation notes (2026-11-09)

- Implemented as planned; the code blocks above match the code (`nextContractNumber` types the raw query result as `{ last: number }[]`).
- Migration applied locally: 49 existing trips numbered per date (deleted ones included); drift check: "No changes in database schema were found".
- Verified against the running API (scripted, 13/13): 0001 / 0002 per date, another date restarts, PATCH of `date` keeps the number, `contractNumber` in POST / PATCH → 400, GET / list / QR regenerate include it, no reuse after delete, two parallel creates for one date → 0001 and 0002 (no 409). Test trips deleted afterwards.
- Running `migration:run` rebuilds `dist/` and crashes a running `start:dev`; restart it afterwards.

**STOP HERE. Report to the user and wait for confirmation before proceeding.**
