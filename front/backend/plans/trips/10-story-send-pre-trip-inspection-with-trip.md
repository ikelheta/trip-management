# Story 10 — Send the pre-trip inspection with trip creation and manage it through the trip

## Prerequisites

- **Story 08 completed:** [08-story-trip-management-api.md](08-story-trip-management-api.md) — trips with passengers (`src/modules/trips/`).
- **Story 09 completed:** [../vehicle-inspections/09-story-pre-trip-vehicle-inspection.md](../vehicle-inspections/09-story-pre-trip-vehicle-inspection.md) — checklist and trip inspections (`src/modules/inspection-checklist/`, `src/modules/trip-inspections/`). This story **removes** Story 09's `/trips/:tripId/inspection` endpoints and reshapes `TripInspectionsService`.
- Intake: [../../stories/trips/send-pre-trip-inspection-with-trip-creation/intake.md](../../stories/trips/send-pre-trip-inspection-with-trip-creation/intake.md).
- A seeded checklist (`npm run seed`) is needed to create trips at runtime.

---

## Story Goal

The pre-trip inspection travels with the trip.

1. `POST /api/trips` **requires** `inspection: { inspectedAt?, results[] }` — one result per live check, same rules as Story 09's create. Trip, passengers and inspection are written in **one transaction**.
2. `PATCH /api/trips/:id` accepts an optional `inspection: { inspectedAt?, results? }` — same rules as Story 09's update — in the same transaction as the other trip changes.
3. Every trip response includes `inspection` (Story 09's `TripInspectionResponseDto` shape), `null` only for trips without one.
4. `/api/trips/:tripId/inspection` (POST/GET/PATCH/DELETE) is **removed**.

**Not in scope:** checklist API changes, replacing or deleting an inspection, backfilling old trips, schema changes, authorization, tests.

**Hard constraints for the executor:**

- Module dependencies go one way: **trips → trip-inspections → inspection-checklist**. `TripInspectionsModule` must **not** import `TripsModule` (that would be a circular module import).
- From `trip-inspections`, the trips module may import only: `TripInspectionsModule`, `TripInspectionsService`, the DTO classes `CreateTripInspectionDto` / `UpdateTripInspectionDto` / `TripInspectionResponseDto`, and the `TripInspection` **type**. Never its repositories.
- No new migration; `migration:generate` must still report no changes.
- ESM `.js` suffixes; constructor-injected classes are value imports.

---

## Context — Read These Files First

1. `src/modules/trips/trips.service.ts` — `findAll` (~lines 30–38), `findOne` (~lines 40–47), `exists` (~lines 49–51, added by Story 09, **removed here**), `create` (~lines 53–68: destructures `passengers`, one `dataSource.transaction`), `update` (~lines 70–97: same pattern with `replaceForTrip` inside the transaction).
2. `src/modules/trip-inspections/trip-inspections.service.ts` — `create` (~lines 42–93): coverage validation (~lines 51–75) and the insert (~lines 77–91); `update` (~lines 95–135): foreign-checkId validation (~lines 101–111) and writes (~lines 113–133); `ensureTripExists` (~lines 142–146) uses `TripsService` — the dependency this story removes; `toResultRow` (~lines 149–168).
3. `src/modules/trip-inspections/trip-inspections.module.ts` — ~lines 12–25: imports `TripsModule`, declares `TripInspectionsController`.
4. `src/modules/trip-inspections/trip-inspections.repository.ts` — `findByTripIdWithResults` (~lines 15–17), `softDelete` (~lines 19–21, unused after this story).
5. `src/modules/trips/trips.module.ts` — ~lines 12–21: module imports.
6. `src/modules/trips/dto/create-trip.dto.ts`, `dto/update-trip.dto.ts`, `dto/trip-response.dto.ts`, `entities/trip.entity.ts` — the shapes you extend.
7. `src/modules/trip-inspections/dto/create-trip-inspection.dto.ts`, `update-trip-inspection.dto.ts`, `trip-inspection-response.dto.ts` — reused as nested DTOs, unchanged.
8. `src/modules/files/entities/file.entity.ts` — `url`: precedent for a non-column property on an entity.
9. `src/app.module.ts` — lists `TripInspectionsModule`; after this story `TripsModule` imports it.

---

## Implementation tasks

### 1 — Trip inspections become an internal service

**File: `src/modules/trip-inspections/trip-inspections.repository.ts`** — add `In` to the `typeorm` import, add `findByTripIdsWithResults`, and **remove** `softDelete`:

```ts
  findByTripIdsWithResults(tripIds: string[]): Promise<TripInspection[]> {
    return this.findAll({
      where: { tripId: In(tripIds) },
      relations: { results: true },
    });
  }
```

**File: `src/modules/trip-inspections/trip-inspections.service.ts`** — replace the contents:

```ts
import { BadRequestException, Injectable } from '@nestjs/common';
import type { DeepPartial, EntityManager } from 'typeorm';
import {
  InspectionChecklistService,
  type ActiveInspectionCheck,
} from '../inspection-checklist/inspection-checklist.service.js';
import type { CreateTripInspectionDto } from './dto/create-trip-inspection.dto.js';
import type { InspectionResultDto } from './dto/inspection-result.dto.js';
import type { UpdateTripInspectionDto } from './dto/update-trip-inspection.dto.js';
import type { TripInspectionResult } from './entities/trip-inspection-result.entity.js';
import type { TripInspection } from './entities/trip-inspection.entity.js';
import { TripInspectionResultsRepository } from './trip-inspection-results.repository.js';
import { TripInspectionsRepository } from './trip-inspections.repository.js';

/** A new inspection checked against the live checklist, ready to insert. */
export interface PreparedTripInspection {
  inspectedAt: Date;
  results: DeepPartial<TripInspectionResult>[];
}

/**
 * Pre-trip inspections, used only by TripsService: an inspection is created
 * with its trip and edited through it, inside the trip's transaction.
 */
@Injectable()
export class TripInspectionsService {
  constructor(
    private readonly inspectionsRepository: TripInspectionsRepository,
    private readonly resultsRepository: TripInspectionResultsRepository,
    private readonly checklistService: InspectionChecklistService,
  ) {}

  /** Live inspections of these trips, with their results. */
  async findByTripIds(tripIds: string[]): Promise<TripInspection[]> {
    if (tripIds.length === 0) {
      return [];
    }
    return this.inspectionsRepository.findByTripIdsWithResults(tripIds);
  }

  /** Requires one result per live check, exactly once. Call before the trip's transaction. */
  async prepare(dto: CreateTripInspectionDto): Promise<PreparedTripInspection> {
    const checks = await this.checklistService.findActiveChecks();
    if (checks.length === 0) {
      throw new BadRequestException('No inspection checks are configured');
    }
    const checkIds = new Set(checks.map((check) => check.id));
    const resultsByCheckId = new Map(
      dto.results.map((result) => [result.checkId, result]),
    );

    const unknown = dto.results
      .map((result) => result.checkId)
      .filter((checkId) => !checkIds.has(checkId));
    if (unknown.length > 0) {
      throw new BadRequestException(
        `Unknown or deleted checks: ${unknown.join(', ')}`,
      );
    }
    const missing = checks
      .filter((check) => !resultsByCheckId.has(check.id))
      .map((check) => check.id);
    if (missing.length > 0) {
      throw new BadRequestException(
        `Missing results for checks: ${missing.join(', ')}`,
      );
    }

    return {
      inspectedAt: dto.inspectedAt ? new Date(dto.inspectedAt) : new Date(),
      // Every check has a result here: unknown and missing were rejected above.
      results: checks.flatMap((check) => {
        const result = resultsByCheckId.get(check.id);
        return result ? [toResultRow(check, result)] : [];
      }),
    };
  }

  async createForTrip(
    tripId: string,
    prepared: PreparedTripInspection,
    manager: EntityManager,
  ): Promise<void> {
    const inspection = await this.inspectionsRepository.create(
      { tripId, inspectedAt: prepared.inspectedAt },
      manager,
    );
    await this.resultsRepository.createMany(
      prepared.results.map((result) => ({
        ...result,
        inspectionId: inspection.id,
      })),
      manager,
    );
  }

  // Runs inside the trip's transaction: a 400 here rolls back the whole trip update.
  async updateForTrip(
    tripId: string,
    dto: UpdateTripInspectionDto,
    manager: EntityManager,
  ): Promise<void> {
    const inspection =
      await this.inspectionsRepository.findByTripIdWithResults(tripId);
    if (!inspection) {
      throw new BadRequestException(`Trip ${tripId} has no inspection`);
    }

    const ownCheckIds = new Set(
      (inspection.results ?? []).map((result) => result.checkId),
    );
    const foreign = (dto.results ?? [])
      .map((result) => result.checkId)
      .filter((checkId) => !ownCheckIds.has(checkId));
    if (foreign.length > 0) {
      throw new BadRequestException(
        `Checks not part of this inspection: ${foreign.join(', ')}`,
      );
    }

    if (dto.inspectedAt !== undefined) {
      await this.inspectionsRepository.update(
        inspection.id,
        { inspectedAt: new Date(dto.inspectedAt) },
        manager,
      );
    }
    // Each item replaces that check's status and note (omitted note = none).
    for (const result of dto.results ?? []) {
      await this.resultsRepository.updateResult(
        inspection.id,
        result.checkId,
        { status: result.status, note: result.note ?? null },
        manager,
      );
    }
  }
}

// Copies the names and sort orders so later checklist edits do not change this inspection.
function toResultRow(
  check: ActiveInspectionCheck,
  result: InspectionResultDto,
): DeepPartial<TripInspectionResult> {
  return {
    checkId: check.id,
    status: result.status,
    note: result.note ?? null,
    indicatorId: check.indicatorId,
    indicatorNameAr: check.indicator.nameAr,
    indicatorNameEn: check.indicator.nameEn,
    indicatorSortOrder: check.indicator.sortOrder,
    checkNameAr: check.nameAr,
    checkNameEn: check.nameEn,
    checkSortOrder: check.sortOrder,
  };
}
```

**Delete file: `src/modules/trip-inspections/trip-inspections.controller.ts`.**

**File: `src/modules/trip-inspections/trip-inspections.module.ts`** — remove the `TripsModule` and `TripInspectionsController` imports, `TripsModule` from `imports`, and the `controllers` line:

```ts
@Module({
  imports: [
    TypeOrmModule.forFeature([TripInspection, TripInspectionResult]),
    InspectionChecklistModule,
  ],
  providers: [
    TripInspectionsService,
    TripInspectionsRepository,
    TripInspectionResultsRepository,
  ],
  exports: [TripInspectionsService],
})
export class TripInspectionsModule {}
```

### 2 — Trip entity and DTOs

**File: `src/modules/trips/entities/trip.entity.ts`** — add `import type { TripInspection } from '../../trip-inspections/entities/trip-inspection.entity.js';` and, before `deletedAt`:

```ts
  // Not a column: TripsService attaches it from the trip-inspections module.
  // null for trips created before inspections were required.
  inspection?: TripInspection | null;
```

The import is **type-only** and the property has no decorator, so there is no runtime import and TypeORM ignores it (like `FileEntity.url`).

**File: `src/modules/trips/dto/create-trip.dto.ts`** — add `IsDefined` to the `class-validator` import, `import { CreateTripInspectionDto } from '../../trip-inspections/dto/create-trip-inspection.dto.js';`, and after `passengers`:

```ts
  /**
   * Pre-trip inspection: one result for every live check (see GET /inspection-indicators).
   */
  @IsDefined()
  @ValidateNested()
  @Type(() => CreateTripInspectionDto)
  inspection: CreateTripInspectionDto;
```

**File: `src/modules/trips/dto/update-trip.dto.ts`** — replace the contents. `inspection` is omitted from the partial and re-declared with the update shape (results optional):

```ts
import { OmitType, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ValidateIf, ValidateNested } from 'class-validator';
import { UpdateTripInspectionDto } from '../../trip-inspections/dto/update-trip-inspection.dto.js';
import { CreateTripDto } from './create-trip.dto.js';

// skipNullProperties: false → null is rejected for vehicleId, driverId, date, time and passengers.
// tripName/secretCode keep their own @IsOptional(), so null clears them.
export class UpdateTripDto extends PartialType(
  OmitType(CreateTripDto, ['inspection'] as const),
  { skipNullProperties: false },
) {
  /** Change inspectedAt and/or the status and note of some checks. */
  // ValidateIf instead of IsOptional: omitted is fine, null is rejected.
  @ValidateIf((_, value) => value !== undefined)
  @ValidateNested()
  @Type(() => UpdateTripInspectionDto)
  inspection?: UpdateTripInspectionDto;
}
```

**File: `src/modules/trips/dto/trip-response.dto.ts`** — add `import { TripInspectionResponseDto } from '../../trip-inspections/dto/trip-inspection-response.dto.js';`, the field after `passengers`, and its mapping:

```ts
  /** Pre-trip inspection; null only for trips created before it was required. */
  inspection: TripInspectionResponseDto | null;
```

```ts
      inspection: trip.inspection
        ? TripInspectionResponseDto.fromEntity(trip.inspection)
        : null,
```

Update the comment above `fromEntity` to `// TripsService loads passengers and the inspection on every read.`

### 3 — Trips service and module

**File: `src/modules/trips/trips.service.ts`**

- Import `TripInspectionsService` from `../trip-inspections/trip-inspections.service.js` and inject it last in the constructor (`private readonly tripInspectionsService: TripInspectionsService`).
- **Remove** `exists` (Story 09 added it for the removed inspection endpoints; nothing calls it now).
- `findAll`:

```ts
    const [trips, total] = await this.tripsRepository.findPaginated(query);
    await this.attachInspections(trips);
    return toPaginatedResult([trips, total], query);
```

- `findOne`: comment `// Loads the passengers and the inspection too.` and call `await this.attachInspections([trip]);` before `return trip;`.
- `create`: validate the inspection before the transaction and write it inside:

```ts
    const { passengers = [], inspection, ...fields } = dto;
    const preparedInspection =
      await this.tripInspectionsService.prepare(inspection);
    const tripId = await this.dataSource.transaction(async (manager) => {
      const trip = await this.tripsRepository.create(fields, manager);
      await this.passengersRepository.replaceForTrip(
        trip.id,
        passengers,
        manager,
      );
      await this.tripInspectionsService.createForTrip(
        trip.id,
        preparedInspection,
        manager,
      );
      return trip.id;
    });
```

- `update`: destructure `const { passengers, inspection, ...fields } = dto;` and add inside the transaction, after the passengers block:

```ts
      if (inspection !== undefined) {
        await this.tripInspectionsService.updateForTrip(
          trip.id,
          inspection,
          manager,
        );
      }
```

- Add before `ensureVehicleExists`:

```ts
  private async attachInspections(trips: Trip[]): Promise<void> {
    const inspections = await this.tripInspectionsService.findByTripIds(
      trips.map((trip) => trip.id),
    );
    const byTripId = new Map(
      inspections.map((inspection) => [inspection.tripId, inspection]),
    );
    for (const trip of trips) {
      trip.inspection = byTripId.get(trip.id) ?? null;
    }
  }
```

**File: `src/modules/trips/trips.module.ts`** — import `TripInspectionsModule` from `../trip-inspections/trip-inspections.module.js` and add it to `imports` after `DriversModule`.

**File: `src/app.module.ts`** — remove the `TripInspectionsModule` import line and array entry (it is now reached through `TripsModule`). Keep `InspectionChecklistModule` (it has controllers).

### 4 — Plans

- [08-story-trip-management-api.md](08-story-trip-management-api.md) and [../vehicle-inspections/09-story-pre-trip-vehicle-inspection.md](../vehicle-inspections/09-story-pre-trip-vehicle-inspection.md): add a "Partly superseded by Story 10" note under the H1.
- Both feature overviews and `00-index.md` (trips NN `08, 10`).

---

## Edge Cases & Failure Modes

- **`inspection` missing or `null` on POST** → **400** (`IsDefined`). **`inspection: {}`** → **400** (`results` required by `CreateTripInspectionDto`).
- **Nested validation errors** carry the path, e.g. `inspection.results.0.status must be a boolean value` (`ValidateNested` + `@Type`).
- **Missing / unknown / deleted / duplicate checkIds, empty results, >200 results** → **400** from `prepare` or the nested DTO, **before** the transaction: no trip is created.
- **No live checks** → **400** `No inspection checks are configured`: trips cannot be created until `npm run seed` (or the checklist API) provides checks.
- **Vehicle/driver invalid and inspection invalid** in the same request → the vehicle/driver **400** comes first (`create` checks them before `prepare`).
- **DB failure while inserting results** → the whole transaction rolls back: no trip, no passengers, no inspection.
- **PATCH `inspection: null`** → **400** (`ValidateIf` + `ValidateNested` rejects non-objects). **Omitted** → inspection unchanged. **`inspection: {}`** → no inspection change.
- **PATCH with a foreign checkId** (unknown, or added to the checklist after the inspection) → **400** thrown inside the transaction → trip fields and passengers in the same PATCH are rolled back too.
- **PATCH `inspection` on a trip without one** (created before this story) → **400** `Trip <id> has no inspection`. The local DB has none.
- **PATCH that only changes the inspection** → the trip row is re-saved with no changes, so the trip's `updatedAt` stays; the result rows get a new `updated_at`.
- **List**: one extra query loads the page's inspections (`In(tripIds)`), so a page of up to 100 trips returns up to 100 × 16 result rows. Accepted.
- **Removed routes** `/api/trips/:tripId/inspection` → **404** from Nest's router.
- **Circular module import** → if `TripInspectionsModule` still imports `TripsModule`, Nest fails at boot with an undefined-module error. Task 1 removes it.
- **Trip soft delete** keeps the inspection row; GET on the deleted trip is 404, so it is unreachable.

---

## Test Plan

No automated tests (project rule). Manual smoke tests against a running app with a seeded checklist (`BASE=http://localhost:3000/api`). Build `RESULTS` from `GET $BASE/inspection-indicators` (one `{checkId, status}` per check, as in Story 09's Test Plan step 5).

1. **Create with inspection:** Story 08 step 1's body plus `"inspection":{"inspectedAt":"2026-11-15T07:45:00+03:00","results":$RESULTS}` with one failing check → **201**, `passengers` and `inspection` (`passed: false`, `failedCount: 1`, 3 indicators).
2. **Create errors (nothing created):** without `inspection` → **400**; `inspection: null` → **400**; `inspection: {}` → **400**; results missing one check → **400** `Missing results…`; unknown checkId → **400**; duplicate checkId → **400**; `status: "true"` → **400**. After all, `GET $BASE/trips?vehicleId=…` still shows only trips from step 1.
3. **Read:** `GET $BASE/trips/:id` and `GET $BASE/trips?...` → every trip has `inspection` with indicators and checks.
4. **PATCH inspection:** `{"inspection":{"results":[{"checkId":"<failing>","status":true}]}}` → **200**, `passed: true`. `{"inspection":{"inspectedAt":"2026-11-15T08:00:00+03:00"}}` → **200**, time moved. `{"inspection":null}` → **400**.
5. **PATCH rollback:** `{"tripName":"Should not stick","inspection":{"results":[{"checkId":"<random uuid>","status":true}]}}` → **400**; GET shows the old `tripName`.
6. **PATCH without inspection** (`{"tripName":"X"}`) → **200**, inspection unchanged.
7. **Removed routes:** `GET/POST/PATCH/DELETE $BASE/trips/:id/inspection` → **404**.
8. **Snapshot still works:** rename a check, GET the trip → old name in its inspection.
9. **Story 08 regression:** passenger validation, list filters, delete (Story 08 Test Plan steps 3–12), each create now including a valid `inspection`.

---

## Migration / Rollback

- No schema change, no migration. Rollback: revert the commit; Story 09's endpoints come back unchanged.

---

## Verification Steps

1. **Backend builds:** `npm run build` → no errors; `dist/modules/trip-inspections/trip-inspections.controller.js` does **not** exist.
2. **Lint:** `npm run lint` → no errors.
3. **Schema:** `npm run migration:generate -- src/database/migrations/Check` → "No changes in database schema were found".
4. **Boundaries:** `grep -rn "trips" src/modules/trip-inspections --include=*.ts` → only `trip-inspection.entity.ts` (the `Trip` FK mapping) and comments. `grep -rn "trip-inspections/" src/modules/trips` → only the module, service, three DTOs and the type import in `trip.entity.ts`.
5. **Backend runs:** `npm run start:dev` → no `/api/trips/:tripId/inspection` routes mapped; Test Plan steps 1–9 pass.

---

## Done Criteria

**Implemented 2026-10-31.** Verified: build, lint, no schema drift, Test Plan steps 1–9 (39 smoke checks). The code matches the task blocks above except for prettier line-wrapping; `src/` is the source of truth.

- [x] `POST /trips` requires `inspection`; invalid inspection → 400 and nothing created; trip, passengers and inspection are written in one transaction.
- [x] `PATCH /trips/:id` accepts `inspection` (`inspectedAt` and/or `results`); errors roll back the whole PATCH; `null` → 400.
- [x] Every trip response includes `inspection` (or `null` for a trip without one).
- [x] `/trips/:tripId/inspection` endpoints are removed; `TripInspectionsModule` has no controller and does not import `TripsModule`; `TripsModule` imports `TripInspectionsModule`.
- [x] `TripsService.exists` and `TripInspectionsRepository.softDelete` removed (unused).
- [x] No migration; no drift.
- [x] Plans 08 and 09 marked as partly superseded; overviews and index updated.
- [x] `npm run build` and `npm run lint` pass; no test files.

**STOP HERE. Report to the user and wait for confirmation before proceeding to Story 11.**
