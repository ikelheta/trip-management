# Story 09 — Add pre-trip vehicle inspection with a configurable checklist of indicators and checks

> **Partly superseded by [Story 10](../trips/10-story-send-pre-trip-inspection-with-trip.md):** the `/trips/:tripId/inspection` endpoints (task 11) and `TripsService.exists` (task 1) were removed; the inspection is now sent with `POST /trips` and edited through `PATCH /trips/:id`. `TripInspectionsService` is an internal service used by `TripsService`. The checklist API and the tables are unchanged. `src/` is the source of truth.

## Prerequisites

- **Story 08 completed:** [../trips/08-story-trip-management-api.md](../trips/08-story-trip-management-api.md). This story references `trips` by foreign key, edits `src/modules/trips/trips.service.ts` (task 1), and copies Story 08's patterns: `Relation<>` for two-way relations, `DataSource.transaction`, `ValidateIf` instead of `IsOptional` for "omitted is fine, null is not", nested DTO arrays with `ArrayUnique`. **Do not start until `npm run build` passes on the Story 08 result and its migrations (`1793430000000`, `1793433600000`) exist.**
- **Story 03 completed:** [../companies/03-story-company-management-api.md](../companies/03-story-company-management-api.md) — `BaseRepository` and the other crud-foundation pieces.
- The **countries** module and seed (implemented without a plan file) are the pattern for Arabic/English names and for an idempotent seed.
- Intake: [../../stories/vehicle-inspections/add-pre-trip-vehicle-inspection-with-configurable-checklist/intake.md](../../stories/vehicle-inspections/add-pre-trip-vehicle-inspection-with-configurable-checklist/intake.md).
- Local **PostgreSQL ≥ 13** with all migrations through Story 08 applied is needed for the runtime verification steps only.

---

## Story Goal

Every trip gets one pre-trip inspection of its vehicle, filled in against a checklist that admins can change.

1. **Checklist (module `inspection-checklist`).** Indicators (groups) and checks, each with `nameAr`, `nameEn`, `sortOrder`, stored in `inspection_indicators` and `inspection_checks`. CRUD under `/api/inspection-indicators` and `/api/inspection-checks`. `GET /api/inspection-indicators` returns the **whole checklist** (indicators with their checks, sorted, not paginated) — this is what a client renders as the inspection form.
2. **Seed.** `npm run seed` inserts the 3 default indicators with their 16 checks (Dashboard Indicators ×6, External Inspection ×5, Safety Requirements ×5). Re-running inserts nothing.
3. **Trip inspection (module `trip-inspections`).** `POST/GET/PATCH/DELETE /api/trips/:tripId/inspection`. One live inspection per trip. On create the client sends `{ status, note }` for **every** live check, exactly once. Each result row copies the indicator/check names and sort orders (snapshot), so later checklist edits do not rewrite history.
4. The response groups results by indicator and adds `passed` / `failedCount` per inspection and `passed` per indicator.

**Not in scope:** inspections without a trip, cross-trip listing/reports, photos, inspector identity, blocking failed trips, restoring deleted checklist rows, authorization, tests. **Do not** change any module except `trips` (one method) and `app.module.ts`, plus the seed files.

**Hard constraints for the executor** (same as Stories 01–08):

- Controller → Service → Repository. **No** DDD constructs, **no** new interfaces.
- `src/modules/trip-inspections/` uses other modules **only** through `TripsModule` / `TripsService.exists` and `InspectionChecklistModule` / `InspectionChecklistService.findActiveChecks` (+ the exported `ActiveInspectionCheck` **type**). Its entities import `Trip` and `InspectionCheck` **only** for `@ManyToOne` mappings.
- ESM: every relative import ends in **`.js`**.
- Constructor-injected classes (`DataSource`, repositories, services) are **value imports**.
- Entities are mapped to response DTOs **in the controller**; services return entities.

---

## Context — Read These Files First

1. [../trips/08-story-trip-management-api.md](../trips/08-story-trip-management-api.md) — task 2 (`Relation<>` and why), task 4 (`ValidateIf` + `ArrayUnique` + `ValidateNested` + `@Type`), task 5 (`repositoryFor(manager)` inside a transaction), task 6 (`DataSource.transaction`). Then read the **implemented** files: `src/modules/trips/trips.service.ts` (`findOne`, where you add `exists`), `src/modules/trips/trips.module.ts` (exports `TripsService`).
2. `src/modules/countries/countries.service.ts` — ~lines 46–64: `update` re-checks a name only when it changed; ~lines 71–81: `ensureNameArIsAvailable` / `ensureNameEnIsAvailable` → **409** `Arabic name is already in use` / `English name is already in use`. Copy these messages for indicators.
3. `src/modules/countries/dto/create-country.dto.ts` — ~lines 4–24: `Trim`, `nameAr` / `nameEn` with `@Length(2, 256)` and JSDoc `@example`.
4. `src/modules/countries/dto/update-country.dto.ts` — ~lines 4–7: `PartialType` from `@nestjs/swagger` with `{ skipNullProperties: false }`.
5. `src/modules/countries/entities/country.entity.ts` — ~lines 6–18: partial unique indexes on `name_ar` / `name_en` `WHERE "deleted_at" IS NULL`.
6. `src/modules/drivers/entities/driver.entity.ts` — ~lines 36–45: FK column + `@ManyToOne(..., { onDelete: 'RESTRICT' })` + named `@JoinColumn`.
7. `src/modules/drivers/drivers.controller.ts` — ~lines 24–80: controller shape, `@ApiErrorResponses`, `ParseUUIDPipe`, `fromEntity` mapping.
8. `src/common/repositories/base.repository.ts` — `create(data, manager?)` (~lines 18–21), `findOne` / `findAll` (~lines 27–33), `update(id, data, manager?)` returns `null` when the row is gone (~lines 39–53), `exists` (~lines 62–64), `repositoryFor` (~lines 70–74). All skip soft-deleted rows.
9. `src/database/seeds/countries.seed.ts` — ~lines 1–28: idempotent seed in one transaction, skips names that exist **including soft-deleted** (`withDeleted: true`). `src/database/seeds/run-seeds.ts` — ~lines 1–11: entry point you extend. `src/database/seeds/data/countries.data.ts` — ~lines 1–7: typed `readonly` seed data.
10. `src/database/migrations/1793426400000-CreateDriversTable.ts` — ~lines 7–39: hand-written migration style. Story 08's migrations end at `1793433600000`; yours start at `1793437200000`.
11. `node_modules/typeorm/query-builder/SelectQueryBuilder.js` — ~lines 1111–1116: unless `withDeleted`, TypeORM adds `<alias>.deletedAt IS NULL` to every **joined** relation that has a delete-date column. That is why `relations: { checks: true }` returns live checks only.
12. `src/common/filters/all-exceptions.filter.ts` — ~lines 65–74: `23505` → **409** `Resource already exists`.
13. `src/app.module.ts` — module list (after Story 08 it contains `TripsModule`).

---

## Implementation tasks

### 1 — `TripsService.exists`

**File: `src/modules/trips/trips.service.ts`** — add right after `findOne`:

```ts
  exists(id: string): Promise<boolean> {
    return this.tripsRepository.exists({ id });
  }
```

Nothing else in `trips/` changes.

### 2 — Checklist entities

**Create file: `src/modules/inspection-checklist/entities/inspection-indicator.entity.ts`**

```ts
import {
  Column,
  DeleteDateColumn,
  Entity,
  Index,
  OneToMany,
  type Relation,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity.js';
import { InspectionCheck } from './inspection-check.entity.js';

@Entity('inspection_indicators')
export class InspectionIndicator extends BaseEntity {
  @Index('UQ_inspection_indicators_name_ar', {
    unique: true,
    where: '"deleted_at" IS NULL',
  })
  @Column({ name: 'name_ar', type: 'varchar', length: 256 })
  nameAr: string;

  @Index('UQ_inspection_indicators_name_en', {
    unique: true,
    where: '"deleted_at" IS NULL',
  })
  @Column({ name: 'name_en', type: 'varchar', length: 256 })
  nameEn: string;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @OneToMany(() => InspectionCheck, (check) => check.indicator)
  checks?: Relation<InspectionCheck[]>;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
```

**Create file: `src/modules/inspection-checklist/entities/inspection-check.entity.ts`**

```ts
import {
  Column,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  type Relation,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity.js';
import { InspectionIndicator } from './inspection-indicator.entity.js';

// Names are unique within their indicator among live checks.
@Entity('inspection_checks')
@Index(
  'UQ_inspection_checks_indicator_id_name_ar',
  ['indicatorId', 'nameAr'],
  { unique: true, where: '"deleted_at" IS NULL' },
)
@Index(
  'UQ_inspection_checks_indicator_id_name_en',
  ['indicatorId', 'nameEn'],
  { unique: true, where: '"deleted_at" IS NULL' },
)
export class InspectionCheck extends BaseEntity {
  @Column({ name: 'indicator_id', type: 'uuid' })
  indicatorId: string;

  @ManyToOne(() => InspectionIndicator, (indicator) => indicator.checks, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'indicator_id',
    foreignKeyConstraintName: 'FK_inspection_checks_indicator_id',
  })
  indicator?: Relation<InspectionIndicator>;

  @Column({ name: 'name_ar', type: 'varchar', length: 256 })
  nameAr: string;

  @Column({ name: 'name_en', type: 'varchar', length: 256 })
  nameEn: string;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
```

The two composite indexes start with `indicator_id`, so they serve "checks of indicator X". **Do not** add a separate `indicator_id` index.

### 3 — Trip inspection entities

**Create file: `src/modules/trip-inspections/entities/trip-inspection.entity.ts`**

```ts
import {
  Column,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  type Relation,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity.js';
import { Trip } from '../../trips/entities/trip.entity.js';
import { TripInspectionResult } from './trip-inspection-result.entity.js';

@Entity('trip_inspections')
export class TripInspection extends BaseEntity {
  // One live inspection per trip; a soft-deleted one does not block a new one.
  @Index('UQ_trip_inspections_trip_id', {
    unique: true,
    where: '"deleted_at" IS NULL',
  })
  @Column({ name: 'trip_id', type: 'uuid' })
  tripId: string;

  @ManyToOne(() => Trip, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'trip_id',
    foreignKeyConstraintName: 'FK_trip_inspections_trip_id',
  })
  trip?: Trip;

  @Column({ name: 'inspected_at', type: 'timestamptz' })
  inspectedAt: Date;

  @OneToMany(() => TripInspectionResult, (result) => result.inspection)
  results?: Relation<TripInspectionResult[]>;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
```

**Create file: `src/modules/trip-inspections/entities/trip-inspection-result.entity.ts`**

```ts
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  type Relation,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity.js';
import { InspectionCheck } from '../../inspection-checklist/entities/inspection-check.entity.js';
import { TripInspection } from './trip-inspection.entity.js';

// One row per check. Names and sort orders are copied at inspection time so
// later checklist edits do not rewrite past inspections.
@Entity('trip_inspection_results')
@Index(
  'UQ_trip_inspection_results_inspection_id_check_id',
  ['inspectionId', 'checkId'],
  { unique: true },
)
export class TripInspectionResult extends BaseEntity {
  @Column({ name: 'inspection_id', type: 'uuid' })
  inspectionId: string;

  @ManyToOne(() => TripInspection, (inspection) => inspection.results, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'inspection_id',
    foreignKeyConstraintName: 'FK_trip_inspection_results_inspection_id',
  })
  inspection?: Relation<TripInspection>;

  @Index('IDX_trip_inspection_results_check_id')
  @Column({ name: 'check_id', type: 'uuid' })
  checkId: string;

  @ManyToOne(() => InspectionCheck, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'check_id',
    foreignKeyConstraintName: 'FK_trip_inspection_results_check_id',
  })
  check?: InspectionCheck;

  // true = good.
  @Column({ type: 'boolean' })
  status: boolean;

  @Column({ type: 'varchar', length: 500, nullable: true })
  note: string | null;

  // Snapshot. No FK on indicator_id: it only groups the results.
  @Column({ name: 'indicator_id', type: 'uuid' })
  indicatorId: string;

  @Column({ name: 'indicator_name_ar', type: 'varchar', length: 256 })
  indicatorNameAr: string;

  @Column({ name: 'indicator_name_en', type: 'varchar', length: 256 })
  indicatorNameEn: string;

  @Column({ name: 'indicator_sort_order', type: 'int' })
  indicatorSortOrder: number;

  @Column({ name: 'check_name_ar', type: 'varchar', length: 256 })
  checkNameAr: string;

  @Column({ name: 'check_name_en', type: 'varchar', length: 256 })
  checkNameEn: string;

  @Column({ name: 'check_sort_order', type: 'int' })
  checkSortOrder: number;
}
```

### 4 — Migrations

Preferred (needs a running DB): after tasks 2–3 and `npm run build`, run `npm run migration:generate -- src/database/migrations/CreateInspections` and compare its SQL with the files below (PK/FK/index names must match). Otherwise create these **four** files by hand. PK names are `"PK_" + sha1("<table>_id").substring(0, 27)` (same formula Stories 02–08 used; computed 2026-10-31).

**Create file: `src/database/migrations/1793437200000-CreateInspectionIndicatorsTable.ts`**

```ts
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInspectionIndicatorsTable1793437200000
  implements MigrationInterface
{
  name = 'CreateInspectionIndicatorsTable1793437200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "inspection_indicators" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "name_ar" character varying(256) NOT NULL,
        "name_en" character varying(256) NOT NULL,
        "sort_order" integer NOT NULL DEFAULT 0,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_4c2fa7080879a3b837bc783ac8e" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_inspection_indicators_name_ar" ON "inspection_indicators" ("name_ar") WHERE "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_inspection_indicators_name_en" ON "inspection_indicators" ("name_en") WHERE "deleted_at" IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."UQ_inspection_indicators_name_en"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."UQ_inspection_indicators_name_ar"`,
    );
    await queryRunner.query(`DROP TABLE "inspection_indicators"`);
  }
}
```

**Create file: `src/database/migrations/1793440800000-CreateInspectionChecksTable.ts`**

```ts
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInspectionChecksTable1793440800000
  implements MigrationInterface
{
  name = 'CreateInspectionChecksTable1793440800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "inspection_checks" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "indicator_id" uuid NOT NULL,
        "name_ar" character varying(256) NOT NULL,
        "name_en" character varying(256) NOT NULL,
        "sort_order" integer NOT NULL DEFAULT 0,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_f0a7703d865e27eddb25390d4e2" PRIMARY KEY ("id"),
        CONSTRAINT "FK_inspection_checks_indicator_id" FOREIGN KEY ("indicator_id")
          REFERENCES "inspection_indicators"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_inspection_checks_indicator_id_name_ar" ON "inspection_checks" ("indicator_id", "name_ar") WHERE "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_inspection_checks_indicator_id_name_en" ON "inspection_checks" ("indicator_id", "name_en") WHERE "deleted_at" IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."UQ_inspection_checks_indicator_id_name_en"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."UQ_inspection_checks_indicator_id_name_ar"`,
    );
    await queryRunner.query(`DROP TABLE "inspection_checks"`);
  }
}
```

**Create file: `src/database/migrations/1793444400000-CreateTripInspectionsTable.ts`**

```ts
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTripInspectionsTable1793444400000
  implements MigrationInterface
{
  name = 'CreateTripInspectionsTable1793444400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "trip_inspections" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "trip_id" uuid NOT NULL,
        "inspected_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_ae569055e24c9c32c28866aa9ca" PRIMARY KEY ("id"),
        CONSTRAINT "FK_trip_inspections_trip_id" FOREIGN KEY ("trip_id")
          REFERENCES "trips"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_trip_inspections_trip_id" ON "trip_inspections" ("trip_id") WHERE "deleted_at" IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."UQ_trip_inspections_trip_id"`);
    await queryRunner.query(`DROP TABLE "trip_inspections"`);
  }
}
```

**Create file: `src/database/migrations/1793448000000-CreateTripInspectionResultsTable.ts`**

```ts
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTripInspectionResultsTable1793448000000
  implements MigrationInterface
{
  name = 'CreateTripInspectionResultsTable1793448000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "trip_inspection_results" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "inspection_id" uuid NOT NULL,
        "check_id" uuid NOT NULL,
        "status" boolean NOT NULL,
        "note" character varying(500),
        "indicator_id" uuid NOT NULL,
        "indicator_name_ar" character varying(256) NOT NULL,
        "indicator_name_en" character varying(256) NOT NULL,
        "indicator_sort_order" integer NOT NULL,
        "check_name_ar" character varying(256) NOT NULL,
        "check_name_en" character varying(256) NOT NULL,
        "check_sort_order" integer NOT NULL,
        CONSTRAINT "PK_7dfe93d27919a7836115d6989ca" PRIMARY KEY ("id"),
        CONSTRAINT "FK_trip_inspection_results_inspection_id" FOREIGN KEY ("inspection_id")
          REFERENCES "trip_inspections"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_trip_inspection_results_check_id" FOREIGN KEY ("check_id")
          REFERENCES "inspection_checks"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_trip_inspection_results_inspection_id_check_id" ON "trip_inspection_results" ("inspection_id", "check_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_trip_inspection_results_check_id" ON "trip_inspection_results" ("check_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_trip_inspection_results_check_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."UQ_trip_inspection_results_inspection_id_check_id"`,
    );
    await queryRunner.query(`DROP TABLE "trip_inspection_results"`);
  }
}
```

### 5 — Checklist DTOs

`sortOrder` uses `ValidateIf` (not `IsOptional`) so it may be omitted but `null` is rejected — the column is `NOT NULL`.

**Create file: `src/modules/inspection-checklist/dto/create-inspection-indicator.dto.ts`**

```ts
import { Transform } from 'class-transformer';
import { IsInt, IsString, Length, Max, Min, ValidateIf } from 'class-validator';

const Trim = () =>
  Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));

export class CreateInspectionIndicatorDto {
  /**
   * Arabic name. Unique among non-deleted indicators.
   * @example "فحص مؤشرات لوحة القيادة"
   */
  @Trim()
  @IsString()
  @Length(2, 256)
  nameAr: string;

  /**
   * English name. Unique among non-deleted indicators.
   * @example "Dashboard Indicators"
   */
  @Trim()
  @IsString()
  @Length(2, 256)
  nameEn: string;

  /**
   * Lower comes first. Defaults to 0.
   * @example 1
   */
  @ValidateIf((_, value) => value !== undefined)
  @IsInt()
  @Min(0)
  @Max(1000)
  sortOrder?: number;
}
```

**Create file: `src/modules/inspection-checklist/dto/update-inspection-indicator.dto.ts`**

```ts
import { PartialType } from '@nestjs/swagger';
import { CreateInspectionIndicatorDto } from './create-inspection-indicator.dto.js';

// skipNullProperties: false → null is validated (and rejected) instead of reaching the NOT NULL columns.
export class UpdateInspectionIndicatorDto extends PartialType(
  CreateInspectionIndicatorDto,
  { skipNullProperties: false },
) {}
```

**Create file: `src/modules/inspection-checklist/dto/create-inspection-check.dto.ts`**

```ts
import { Transform } from 'class-transformer';
import {
  IsInt,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

const Trim = () =>
  Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));

export class CreateInspectionCheckDto {
  /**
   * Id of an existing (non-deleted) indicator.
   * @example "3f2b8c1e-4a5d-4e6f-9a7b-1c2d3e4f5a6b"
   */
  @IsUUID()
  indicatorId: string;

  /**
   * Arabic name. Unique within the indicator.
   * @example "مؤشر الوقود"
   */
  @Trim()
  @IsString()
  @Length(2, 256)
  nameAr: string;

  /**
   * English name. Unique within the indicator.
   * @example "Fuel gauge"
   */
  @Trim()
  @IsString()
  @Length(2, 256)
  nameEn: string;

  /**
   * Lower comes first. Defaults to 0.
   * @example 1
   */
  @ValidateIf((_, value) => value !== undefined)
  @IsInt()
  @Min(0)
  @Max(1000)
  sortOrder?: number;
}
```

**Create file: `src/modules/inspection-checklist/dto/update-inspection-check.dto.ts`**

```ts
import { PartialType } from '@nestjs/swagger';
import { CreateInspectionCheckDto } from './create-inspection-check.dto.js';

// skipNullProperties: false → null is validated (and rejected) instead of reaching the NOT NULL columns.
export class UpdateInspectionCheckDto extends PartialType(
  CreateInspectionCheckDto,
  { skipNullProperties: false },
) {}
```

**Create file: `src/modules/inspection-checklist/dto/inspection-check-response.dto.ts`**

```ts
import type { InspectionCheck } from '../entities/inspection-check.entity.js';

export class InspectionCheckResponseDto {
  id: string;
  indicatorId: string;
  nameAr: string;
  nameEn: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;

  static fromEntity(check: InspectionCheck): InspectionCheckResponseDto {
    return {
      id: check.id,
      indicatorId: check.indicatorId,
      nameAr: check.nameAr,
      nameEn: check.nameEn,
      sortOrder: check.sortOrder,
      createdAt: check.createdAt,
      updatedAt: check.updatedAt,
    };
  }
}
```

**Create file: `src/modules/inspection-checklist/dto/inspection-indicator-response.dto.ts`**

```ts
import type { InspectionIndicator } from '../entities/inspection-indicator.entity.js';
import { InspectionCheckResponseDto } from './inspection-check-response.dto.js';

export class InspectionIndicatorResponseDto {
  id: string;
  nameAr: string;
  nameEn: string;
  sortOrder: number;
  /** Live checks, sorted by sortOrder then nameEn. */
  checks: InspectionCheckResponseDto[];
  createdAt: Date;
  updatedAt: Date;

  // The service always loads checks with the indicator.
  static fromEntity(indicator: InspectionIndicator): InspectionIndicatorResponseDto {
    return {
      id: indicator.id,
      nameAr: indicator.nameAr,
      nameEn: indicator.nameEn,
      sortOrder: indicator.sortOrder,
      checks: (indicator.checks ?? [])
        .map(InspectionCheckResponseDto.fromEntity)
        .sort(
          (a, b) =>
            a.sortOrder - b.sortOrder || a.nameEn.localeCompare(b.nameEn),
        ),
      createdAt: indicator.createdAt,
      updatedAt: indicator.updatedAt,
    };
  }
}
```

### 6 — Checklist repositories and service

**Create file: `src/modules/inspection-checklist/inspection-indicators.repository.ts`**

```ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from '../../common/repositories/base.repository.js';
import { InspectionIndicator } from './entities/inspection-indicator.entity.js';

// Joined checks exclude soft-deleted rows (TypeORM adds deleted_at IS NULL to joins).
@Injectable()
export class InspectionIndicatorsRepository extends BaseRepository<InspectionIndicator> {
  constructor(
    @InjectRepository(InspectionIndicator)
    repository: Repository<InspectionIndicator>,
  ) {
    super(repository);
  }

  findAllWithChecks(): Promise<InspectionIndicator[]> {
    return this.findAll({
      relations: { checks: true },
      order: { sortOrder: 'ASC', nameEn: 'ASC' },
    });
  }

  findByIdWithChecks(id: string): Promise<InspectionIndicator | null> {
    return this.findOne({ where: { id }, relations: { checks: true } });
  }

  async softDelete(id: string): Promise<void> {
    await this.repository.softDelete({ id });
  }
}
```

**Create file: `src/modules/inspection-checklist/inspection-checks.repository.ts`**

```ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from '../../common/repositories/base.repository.js';
import { InspectionCheck } from './entities/inspection-check.entity.js';

@Injectable()
export class InspectionChecksRepository extends BaseRepository<InspectionCheck> {
  constructor(
    @InjectRepository(InspectionCheck) repository: Repository<InspectionCheck>,
  ) {
    super(repository);
  }

  // `indicator` is undefined when the indicator is soft-deleted (join filter).
  findAllWithIndicator(): Promise<InspectionCheck[]> {
    return this.findAll({ relations: { indicator: true } });
  }

  async softDelete(id: string): Promise<void> {
    await this.repository.softDelete({ id });
  }
}
```

**Create file: `src/modules/inspection-checklist/inspection-checklist.service.ts`**

```ts
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Not, type DeepPartial } from 'typeorm';
import { CreateInspectionCheckDto } from './dto/create-inspection-check.dto.js';
import { CreateInspectionIndicatorDto } from './dto/create-inspection-indicator.dto.js';
import { UpdateInspectionCheckDto } from './dto/update-inspection-check.dto.js';
import { UpdateInspectionIndicatorDto } from './dto/update-inspection-indicator.dto.js';
import { InspectionCheck } from './entities/inspection-check.entity.js';
import { InspectionIndicator } from './entities/inspection-indicator.entity.js';
import { InspectionChecksRepository } from './inspection-checks.repository.js';
import { InspectionIndicatorsRepository } from './inspection-indicators.repository.js';

/** A live check whose live indicator is loaded. */
export type ActiveInspectionCheck = InspectionCheck & {
  indicator: InspectionIndicator;
};

@Injectable()
export class InspectionChecklistService {
  constructor(
    private readonly indicatorsRepository: InspectionIndicatorsRepository,
    private readonly checksRepository: InspectionChecksRepository,
  ) {}

  findAllIndicators(): Promise<InspectionIndicator[]> {
    return this.indicatorsRepository.findAllWithChecks();
  }

  // Loads the indicator's live checks too.
  async findIndicator(id: string): Promise<InspectionIndicator> {
    const indicator = await this.indicatorsRepository.findByIdWithChecks(id);
    if (!indicator) {
      throw new NotFoundException(`Inspection indicator ${id} not found`);
    }
    return indicator;
  }

  async createIndicator(
    dto: CreateInspectionIndicatorDto,
  ): Promise<InspectionIndicator> {
    await this.ensureIndicatorNameArIsAvailable(dto.nameAr);
    await this.ensureIndicatorNameEnIsAvailable(dto.nameEn);
    const indicator = await this.indicatorsRepository.create(dto);
    return this.findIndicator(indicator.id);
  }

  async updateIndicator(
    id: string,
    dto: UpdateInspectionIndicatorDto,
  ): Promise<InspectionIndicator> {
    const indicator = await this.findIndicator(id);

    if (dto.nameAr !== undefined && dto.nameAr !== indicator.nameAr) {
      await this.ensureIndicatorNameArIsAvailable(dto.nameAr);
    }
    if (dto.nameEn !== undefined && dto.nameEn !== indicator.nameEn) {
      await this.ensureIndicatorNameEnIsAvailable(dto.nameEn);
    }

    const changes: DeepPartial<InspectionIndicator> = Object.fromEntries(
      Object.entries(dto).filter(([, value]) => value !== undefined),
    );
    if (!(await this.indicatorsRepository.update(indicator.id, changes))) {
      throw new NotFoundException(`Inspection indicator ${id} not found`);
    }
    return this.findIndicator(id);
  }

  async removeIndicator(id: string): Promise<void> {
    const indicator = await this.findIndicator(id);
    if (indicator.checks?.length) {
      throw new ConflictException(
        'Inspection indicator still has checks; delete or move them first',
      );
    }
    await this.indicatorsRepository.softDelete(indicator.id);
  }

  async findCheck(id: string): Promise<InspectionCheck> {
    const check = await this.checksRepository.findById(id);
    if (!check) {
      throw new NotFoundException(`Inspection check ${id} not found`);
    }
    return check;
  }

  async createCheck(dto: CreateInspectionCheckDto): Promise<InspectionCheck> {
    await this.ensureIndicatorExists(dto.indicatorId);
    await this.ensureCheckNamesAreAvailable(
      dto.indicatorId,
      dto.nameAr,
      dto.nameEn,
    );
    return this.checksRepository.create(dto);
  }

  async updateCheck(
    id: string,
    dto: UpdateInspectionCheckDto,
  ): Promise<InspectionCheck> {
    const check = await this.findCheck(id);
    const indicatorId = dto.indicatorId ?? check.indicatorId;

    if (indicatorId !== check.indicatorId) {
      await this.ensureIndicatorExists(indicatorId);
    }
    // The resulting names must be free in the target indicator (moving re-checks them).
    await this.ensureCheckNamesAreAvailable(
      indicatorId,
      dto.nameAr ?? check.nameAr,
      dto.nameEn ?? check.nameEn,
      check.id,
    );

    const changes: DeepPartial<InspectionCheck> = Object.fromEntries(
      Object.entries(dto).filter(([, value]) => value !== undefined),
    );
    const saved = await this.checksRepository.update(check.id, changes);
    if (!saved) {
      throw new NotFoundException(`Inspection check ${id} not found`);
    }
    return saved;
  }

  async removeCheck(id: string): Promise<void> {
    const check = await this.findCheck(id);
    await this.checksRepository.softDelete(check.id);
  }

  /** Every live check with its indicator: the checklist a new inspection must cover. */
  async findActiveChecks(): Promise<ActiveInspectionCheck[]> {
    const checks = await this.checksRepository.findAllWithIndicator();
    // removeIndicator blocks deleting an indicator with live checks; this only
    // guards against rows changed outside the API.
    return checks.filter(
      (check): check is ActiveInspectionCheck => check.indicator !== undefined,
    );
  }

  private async ensureIndicatorExists(indicatorId: string): Promise<void> {
    if (!(await this.indicatorsRepository.exists({ id: indicatorId }))) {
      throw new BadRequestException(
        `Inspection indicator ${indicatorId} does not exist`,
      );
    }
  }

  private async ensureIndicatorNameArIsAvailable(nameAr: string): Promise<void> {
    if (await this.indicatorsRepository.exists({ nameAr })) {
      throw new ConflictException('Arabic name is already in use');
    }
  }

  private async ensureIndicatorNameEnIsAvailable(nameEn: string): Promise<void> {
    if (await this.indicatorsRepository.exists({ nameEn })) {
      throw new ConflictException('English name is already in use');
    }
  }

  private async ensureCheckNamesAreAvailable(
    indicatorId: string,
    nameAr: string,
    nameEn: string,
    exceptId?: string,
  ): Promise<void> {
    const notSelf = exceptId ? { id: Not(exceptId) } : {};
    if (await this.checksRepository.exists({ indicatorId, nameAr, ...notSelf })) {
      throw new ConflictException(
        'Arabic name is already used by another check in this indicator',
      );
    }
    if (await this.checksRepository.exists({ indicatorId, nameEn, ...notSelf })) {
      throw new ConflictException(
        'English name is already used by another check in this indicator',
      );
    }
  }
}
```

### 7 — Checklist controllers and module

**Create file: `src/modules/inspection-checklist/inspection-indicators.controller.ts`**

```ts
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiErrorResponses } from '../../common/decorators/api-error-responses.decorator.js';
import { CreateInspectionIndicatorDto } from './dto/create-inspection-indicator.dto.js';
import { InspectionIndicatorResponseDto } from './dto/inspection-indicator-response.dto.js';
import { UpdateInspectionIndicatorDto } from './dto/update-inspection-indicator.dto.js';
import { InspectionChecklistService } from './inspection-checklist.service.js';

// Entities are mapped to response DTOs here; the service returns entities.
@ApiTags('inspection-checklist')
@Controller('inspection-indicators')
export class InspectionIndicatorsController {
  constructor(private readonly checklistService: InspectionChecklistService) {}

  /** Create an indicator (a group of checks). */
  @Post()
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.CONFLICT)
  async create(
    @Body() dto: CreateInspectionIndicatorDto,
  ): Promise<InspectionIndicatorResponseDto> {
    return InspectionIndicatorResponseDto.fromEntity(
      await this.checklistService.createIndicator(dto),
    );
  }

  /** The whole checklist: every indicator with its checks, sorted. Not paginated. */
  @Get()
  async findAll(): Promise<InspectionIndicatorResponseDto[]> {
    const indicators = await this.checklistService.findAllIndicators();
    return indicators.map(InspectionIndicatorResponseDto.fromEntity);
  }

  /** Get an indicator with its checks. */
  @Get(':id')
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND)
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<InspectionIndicatorResponseDto> {
    return InspectionIndicatorResponseDto.fromEntity(
      await this.checklistService.findIndicator(id),
    );
  }

  /** Update an indicator. */
  @Patch(':id')
  @ApiErrorResponses(
    HttpStatus.BAD_REQUEST,
    HttpStatus.NOT_FOUND,
    HttpStatus.CONFLICT,
  )
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInspectionIndicatorDto,
  ): Promise<InspectionIndicatorResponseDto> {
    return InspectionIndicatorResponseDto.fromEntity(
      await this.checklistService.updateIndicator(id, dto),
    );
  }

  /** Soft-delete an indicator. Fails while it still has checks. */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiErrorResponses(
    HttpStatus.BAD_REQUEST,
    HttpStatus.NOT_FOUND,
    HttpStatus.CONFLICT,
  )
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.checklistService.removeIndicator(id);
  }
}
```

**Create file: `src/modules/inspection-checklist/inspection-checks.controller.ts`**

```ts
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiErrorResponses } from '../../common/decorators/api-error-responses.decorator.js';
import { CreateInspectionCheckDto } from './dto/create-inspection-check.dto.js';
import { InspectionCheckResponseDto } from './dto/inspection-check-response.dto.js';
import { UpdateInspectionCheckDto } from './dto/update-inspection-check.dto.js';
import { InspectionChecklistService } from './inspection-checklist.service.js';

// List checks through GET /inspection-indicators (grouped). Mapping happens here.
@ApiTags('inspection-checklist')
@Controller('inspection-checks')
export class InspectionChecksController {
  constructor(private readonly checklistService: InspectionChecklistService) {}

  /** Create a check in an existing indicator. */
  @Post()
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.CONFLICT)
  async create(
    @Body() dto: CreateInspectionCheckDto,
  ): Promise<InspectionCheckResponseDto> {
    return InspectionCheckResponseDto.fromEntity(
      await this.checklistService.createCheck(dto),
    );
  }

  /** Get a check. */
  @Get(':id')
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND)
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<InspectionCheckResponseDto> {
    return InspectionCheckResponseDto.fromEntity(
      await this.checklistService.findCheck(id),
    );
  }

  /** Update a check, or move it to another indicator. */
  @Patch(':id')
  @ApiErrorResponses(
    HttpStatus.BAD_REQUEST,
    HttpStatus.NOT_FOUND,
    HttpStatus.CONFLICT,
  )
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInspectionCheckDto,
  ): Promise<InspectionCheckResponseDto> {
    return InspectionCheckResponseDto.fromEntity(
      await this.checklistService.updateCheck(id, dto),
    );
  }

  /** Soft-delete a check. Past inspections keep their copy of it. */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.checklistService.removeCheck(id);
  }
}
```

**Create file: `src/modules/inspection-checklist/inspection-checklist.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InspectionCheck } from './entities/inspection-check.entity.js';
import { InspectionIndicator } from './entities/inspection-indicator.entity.js';
import { InspectionChecklistService } from './inspection-checklist.service.js';
import { InspectionChecksController } from './inspection-checks.controller.js';
import { InspectionChecksRepository } from './inspection-checks.repository.js';
import { InspectionIndicatorsController } from './inspection-indicators.controller.js';
import { InspectionIndicatorsRepository } from './inspection-indicators.repository.js';

@Module({
  imports: [TypeOrmModule.forFeature([InspectionIndicator, InspectionCheck])],
  controllers: [InspectionIndicatorsController, InspectionChecksController],
  providers: [
    InspectionChecklistService,
    InspectionIndicatorsRepository,
    InspectionChecksRepository,
  ],
  exports: [InspectionChecklistService],
})
export class InspectionChecklistModule {}
```

### 8 — Seed

**Create file: `src/database/seeds/data/inspection-checklist.data.ts`** — Arabic and English text exactly as below.

```ts
export interface InspectionCheckSeed {
  nameAr: string;
  nameEn: string;
  sortOrder: number;
}

export interface InspectionIndicatorSeed extends InspectionCheckSeed {
  checks: readonly InspectionCheckSeed[];
}

// Default pre-trip checklist: 3 indicators, 16 checks.
export const INSPECTION_CHECKLIST: readonly InspectionIndicatorSeed[] = [
  {
    nameAr: 'فحص مؤشرات لوحة القيادة',
    nameEn: 'Dashboard Indicators',
    sortOrder: 1,
    checks: [
      { nameAr: 'مؤشر الوقود', nameEn: 'Fuel gauge', sortOrder: 1 },
      { nameAr: 'مؤشر الحرارة', nameEn: 'Temperature gauge', sortOrder: 2 },
      { nameAr: 'مؤشر ضغط الزيت', nameEn: 'Oil pressure gauge', sortOrder: 3 },
      { nameAr: 'لمبة فحص المحرك', nameEn: 'Check engine light', sortOrder: 4 },
      { nameAr: 'لمبة ABS', nameEn: 'ABS Light', sortOrder: 5 },
      { nameAr: 'لمبات التحذير', nameEn: 'Warning Light', sortOrder: 6 },
    ],
  },
  {
    nameAr: 'الفحص الخارجي',
    nameEn: 'External Inspection',
    sortOrder: 2,
    checks: [
      {
        nameAr: 'الإطارات وضغط الهواء',
        nameEn: 'Tires and Air pressure',
        sortOrder: 1,
      },
      {
        nameAr: 'الأنوار الأمامية والخلفية',
        nameEn: 'Headlights and Taillights',
        sortOrder: 2,
      },
      { nameAr: 'الإشارات التحذيرية', nameEn: 'Warning Signals', sortOrder: 3 },
      { nameAr: 'الزجاج والمرايا', nameEn: 'Glass and Mirrors', sortOrder: 4 },
      { nameAr: 'عدم وجود تسربات', nameEn: 'No leaks', sortOrder: 5 },
    ],
  },
  {
    nameAr: 'أدوات السلامة',
    nameEn: 'Safety Requirements',
    sortOrder: 3,
    checks: [
      {
        nameAr: 'طفاية حريق سارية الصلاحية',
        nameEn: 'Valid Fire Extinguisher',
        sortOrder: 1,
      },
      { nameAr: 'مثلث تحذيري', nameEn: 'Warning Triangle', sortOrder: 2 },
      { nameAr: 'حقيبة إسعافات أولية', nameEn: 'First Aid Kit', sortOrder: 3 },
      {
        nameAr: 'مطرقة كسر الزجاج',
        nameEn: 'Glass Breaker Hammer',
        sortOrder: 4,
      },
      { nameAr: 'أحزمة الأمان', nameEn: 'Safety Belts', sortOrder: 5 },
    ],
  },
];
```

**Create file: `src/database/seeds/inspection-checklist.seed.ts`**

```ts
import type { DataSource } from 'typeorm';
import { InspectionCheck } from '../../modules/inspection-checklist/entities/inspection-check.entity.js';
import { InspectionIndicator } from '../../modules/inspection-checklist/entities/inspection-indicator.entity.js';
import { INSPECTION_CHECKLIST } from './data/inspection-checklist.data.js';

/**
 * Inserts the default indicators, each with its checks, and returns how many indicators were added.
 * Safe to re-run: an indicator (and its checks) is skipped when its Arabic or English name already
 * exists, including soft-deleted rows, so an admin's changes and deletions are kept.
 */
export function seedInspectionChecklist(dataSource: DataSource): Promise<number> {
  return dataSource.transaction(async (manager) => {
    const indicators = manager.getRepository(InspectionIndicator);
    const checks = manager.getRepository(InspectionCheck);
    const existing = await indicators.find({
      select: { nameAr: true, nameEn: true },
      withDeleted: true,
    });
    const takenAr = new Set(existing.map((indicator) => indicator.nameAr));
    const takenEn = new Set(existing.map((indicator) => indicator.nameEn));

    const missing = INSPECTION_CHECKLIST.filter(
      ({ nameAr, nameEn }) => !takenAr.has(nameAr) && !takenEn.has(nameEn),
    );
    for (const { checks: checkSeeds, ...indicatorSeed } of missing) {
      const indicator = await indicators.save(indicators.create(indicatorSeed));
      await checks.insert(
        checkSeeds.map((check) => ({ ...check, indicatorId: indicator.id })),
      );
    }
    return missing.length;
  });
}
```

**File: `src/database/seeds/run-seeds.ts`** — import `seedInspectionChecklist` from `./inspection-checklist.seed.js` and, inside the `try` after the countries log line (~line 8), add:

```ts
  const indicators = await seedInspectionChecklist(dataSource);
  console.log(`inspection indicators: inserted ${indicators}`);
```

### 9 — Trip inspection DTOs

**Create file: `src/modules/trip-inspections/dto/inspection-result.dto.ts`**

```ts
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  Length,
} from 'class-validator';

const Trim = () =>
  Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));

export class InspectionResultDto {
  /**
   * Id of a live inspection check (see GET /inspection-indicators).
   * @example "9c1d2e3f-4a5b-4c6d-8e7f-0a1b2c3d4e5f"
   */
  @IsUUID()
  checkId: string;

  /**
   * true = good, false = not good.
   * @example true
   */
  @IsBoolean()
  status: boolean;

  /**
   * Optional; omitted or null means no note.
   * @example "Front left tire pressure is low"
   */
  @IsOptional()
  @Trim()
  @IsString()
  @Length(1, 500)
  note?: string | null;
}
```

**Create file: `src/modules/trip-inspections/dto/create-trip-inspection.dto.ts`**

```ts
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsISO8601,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { InspectionResultDto } from './inspection-result.dto.js';

const MAX_RESULTS = 200;

export class CreateTripInspectionDto {
  /**
   * When the inspection was done (ISO 8601, include the offset). Defaults to now.
   * @example "2026-11-15T07:45:00+03:00"
   */
  @ValidateIf((_, value) => value !== undefined)
  @IsISO8601({ strict: true })
  inspectedAt?: string;

  /**
   * Create: one result for every live check. Update: only the checks to change.
   */
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(MAX_RESULTS)
  @ArrayUnique((result?: InspectionResultDto) => result?.checkId, {
    message: 'results must not repeat a checkId',
  })
  @ValidateNested({ each: true })
  @Type(() => InspectionResultDto)
  results: InspectionResultDto[];
}
```

**Create file: `src/modules/trip-inspections/dto/update-trip-inspection.dto.ts`**

```ts
import { PartialType } from '@nestjs/swagger';
import { CreateTripInspectionDto } from './create-trip-inspection.dto.js';

// skipNullProperties: false → null inspectedAt / results are rejected.
export class UpdateTripInspectionDto extends PartialType(
  CreateTripInspectionDto,
  { skipNullProperties: false },
) {}
```

**Create file: `src/modules/trip-inspections/dto/trip-inspection-response.dto.ts`**

```ts
import type { TripInspection } from '../entities/trip-inspection.entity.js';

export class InspectionCheckResultDto {
  checkId: string;
  nameAr: string;
  nameEn: string;
  /** true = good. */
  status: boolean;
  note: string | null;
}

export class InspectionIndicatorResultDto {
  indicatorId: string;
  nameAr: string;
  nameEn: string;
  /** Every check of this indicator is good. */
  passed: boolean;
  checks: InspectionCheckResultDto[];
}

export class TripInspectionResponseDto {
  id: string;
  tripId: string;
  inspectedAt: Date;
  /** Every check is good. */
  passed: boolean;
  failedCount: number;
  /** Grouped and ordered by the snapshot taken at inspection time. */
  indicators: InspectionIndicatorResultDto[];
  createdAt: Date;
  updatedAt: Date;

  // The service always loads results with the inspection.
  static fromEntity(inspection: TripInspection): TripInspectionResponseDto {
    const results = [...(inspection.results ?? [])].sort(
      (a, b) =>
        a.indicatorSortOrder - b.indicatorSortOrder ||
        a.indicatorNameEn.localeCompare(b.indicatorNameEn) ||
        a.checkSortOrder - b.checkSortOrder ||
        a.checkNameEn.localeCompare(b.checkNameEn),
    );

    const indicators = new Map<string, InspectionIndicatorResultDto>();
    for (const result of results) {
      let indicator = indicators.get(result.indicatorId);
      if (!indicator) {
        indicator = {
          indicatorId: result.indicatorId,
          nameAr: result.indicatorNameAr,
          nameEn: result.indicatorNameEn,
          passed: true,
          checks: [],
        };
        indicators.set(result.indicatorId, indicator);
      }
      indicator.passed &&= result.status;
      indicator.checks.push({
        checkId: result.checkId,
        nameAr: result.checkNameAr,
        nameEn: result.checkNameEn,
        status: result.status,
        note: result.note,
      });
    }

    const failedCount = results.filter((result) => !result.status).length;
    return {
      id: inspection.id,
      tripId: inspection.tripId,
      inspectedAt: inspection.inspectedAt,
      passed: failedCount === 0,
      failedCount,
      indicators: [...indicators.values()],
      createdAt: inspection.createdAt,
      updatedAt: inspection.updatedAt,
    };
  }
}
```

A `Map` keeps insertion order, so indicators come out in the sorted order.

### 10 — Trip inspection repositories and service

**Create file: `src/modules/trip-inspections/trip-inspections.repository.ts`**

```ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from '../../common/repositories/base.repository.js';
import { TripInspection } from './entities/trip-inspection.entity.js';

@Injectable()
export class TripInspectionsRepository extends BaseRepository<TripInspection> {
  constructor(
    @InjectRepository(TripInspection) repository: Repository<TripInspection>,
  ) {
    super(repository);
  }

  findByTripIdWithResults(tripId: string): Promise<TripInspection | null> {
    return this.findOne({ where: { tripId }, relations: { results: true } });
  }

  async softDelete(id: string): Promise<void> {
    await this.repository.softDelete({ id });
  }
}
```

**Create file: `src/modules/trip-inspections/trip-inspection-results.repository.ts`**

```ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, EntityManager, Repository } from 'typeorm';
import { BaseRepository } from '../../common/repositories/base.repository.js';
import { TripInspectionResult } from './entities/trip-inspection-result.entity.js';

// Write methods take the inspection's transaction.
@Injectable()
export class TripInspectionResultsRepository extends BaseRepository<TripInspectionResult> {
  constructor(
    @InjectRepository(TripInspectionResult)
    repository: Repository<TripInspectionResult>,
  ) {
    super(repository);
  }

  async createMany(
    results: DeepPartial<TripInspectionResult>[],
    manager: EntityManager,
  ): Promise<void> {
    const repository = this.repositoryFor(manager);
    await repository.save(repository.create(results));
  }

  async updateResult(
    inspectionId: string,
    checkId: string,
    changes: Pick<TripInspectionResult, 'status' | 'note'>,
    manager: EntityManager,
  ): Promise<void> {
    await this.repositoryFor(manager).update({ inspectionId, checkId }, changes);
  }
}
```

**Create file: `src/modules/trip-inspections/trip-inspections.service.ts`**

```ts
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, type DeepPartial } from 'typeorm';
import {
  InspectionChecklistService,
  type ActiveInspectionCheck,
} from '../inspection-checklist/inspection-checklist.service.js';
import { TripsService } from '../trips/trips.service.js';
import { CreateTripInspectionDto } from './dto/create-trip-inspection.dto.js';
import type { InspectionResultDto } from './dto/inspection-result.dto.js';
import { UpdateTripInspectionDto } from './dto/update-trip-inspection.dto.js';
import type { TripInspectionResult } from './entities/trip-inspection-result.entity.js';
import { TripInspection } from './entities/trip-inspection.entity.js';
import { TripInspectionResultsRepository } from './trip-inspection-results.repository.js';
import { TripInspectionsRepository } from './trip-inspections.repository.js';

@Injectable()
export class TripInspectionsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly inspectionsRepository: TripInspectionsRepository,
    private readonly resultsRepository: TripInspectionResultsRepository,
    private readonly tripsService: TripsService,
    private readonly checklistService: InspectionChecklistService,
  ) {}

  // Loads the results too.
  async findOne(tripId: string): Promise<TripInspection> {
    await this.ensureTripExists(tripId);
    const inspection =
      await this.inspectionsRepository.findByTripIdWithResults(tripId);
    if (!inspection) {
      throw new NotFoundException(`Trip ${tripId} has no inspection`);
    }
    return inspection;
  }

  async create(
    tripId: string,
    dto: CreateTripInspectionDto,
  ): Promise<TripInspection> {
    await this.ensureTripExists(tripId);
    if (await this.inspectionsRepository.exists({ tripId })) {
      throw new ConflictException(`Trip ${tripId} already has an inspection`);
    }

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

    await this.dataSource.transaction(async (manager) => {
      const inspection = await this.inspectionsRepository.create(
        {
          tripId,
          inspectedAt: dto.inspectedAt ? new Date(dto.inspectedAt) : new Date(),
        },
        manager,
      );
      // Every check has a result here: unknown and missing were rejected above.
      const rows = checks.flatMap((check) => {
        const result = resultsByCheckId.get(check.id);
        return result ? [toResultRow(inspection.id, check, result)] : [];
      });
      await this.resultsRepository.createMany(rows, manager);
    });
    return this.findOne(tripId);
  }

  async update(
    tripId: string,
    dto: UpdateTripInspectionDto,
  ): Promise<TripInspection> {
    const inspection = await this.findOne(tripId);

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

    await this.dataSource.transaction(async (manager) => {
      if (dto.inspectedAt !== undefined) {
        const saved = await this.inspectionsRepository.update(
          inspection.id,
          { inspectedAt: new Date(dto.inspectedAt) },
          manager,
        );
        if (!saved) {
          throw new NotFoundException(`Trip ${tripId} has no inspection`);
        }
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
    });
    return this.findOne(tripId);
  }

  async remove(tripId: string): Promise<void> {
    const inspection = await this.findOne(tripId);
    await this.inspectionsRepository.softDelete(inspection.id);
  }

  private async ensureTripExists(tripId: string): Promise<void> {
    if (!(await this.tripsService.exists(tripId))) {
      throw new NotFoundException(`Trip ${tripId} not found`);
    }
  }
}

// Copies the names and sort orders so later checklist edits do not change this inspection.
function toResultRow(
  inspectionId: string,
  check: ActiveInspectionCheck,
  result: InspectionResultDto,
): DeepPartial<TripInspectionResult> {
  return {
    inspectionId,
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

- The trip is in the **path**, so an unknown trip is **404**, not 400.
- All checks (trip, existing inspection, coverage) run **before** the transaction.
- `ActiveInspectionCheck` and `InspectionResultDto` are **type-only** imports; `InspectionChecklistService` is a value import in the same statement (`type` modifier on the type only).

### 11 — Trip inspection controller, module, app module

**Create file: `src/modules/trip-inspections/trip-inspections.controller.ts`**

```ts
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiErrorResponses } from '../../common/decorators/api-error-responses.decorator.js';
import { CreateTripInspectionDto } from './dto/create-trip-inspection.dto.js';
import { TripInspectionResponseDto } from './dto/trip-inspection-response.dto.js';
import { UpdateTripInspectionDto } from './dto/update-trip-inspection.dto.js';
import { TripInspectionsService } from './trip-inspections.service.js';

// One inspection per trip, addressed through the trip. Mapping happens here.
@ApiTags('trip-inspections')
@Controller('trips/:tripId/inspection')
export class TripInspectionsController {
  constructor(private readonly inspectionsService: TripInspectionsService) {}

  /** Record the trip's pre-trip inspection: one result for every live check. */
  @Post()
  @ApiErrorResponses(
    HttpStatus.BAD_REQUEST,
    HttpStatus.NOT_FOUND,
    HttpStatus.CONFLICT,
  )
  async create(
    @Param('tripId', ParseUUIDPipe) tripId: string,
    @Body() dto: CreateTripInspectionDto,
  ): Promise<TripInspectionResponseDto> {
    return TripInspectionResponseDto.fromEntity(
      await this.inspectionsService.create(tripId, dto),
    );
  }

  /** Get the trip's inspection, grouped by indicator. */
  @Get()
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND)
  async findOne(
    @Param('tripId', ParseUUIDPipe) tripId: string,
  ): Promise<TripInspectionResponseDto> {
    return TripInspectionResponseDto.fromEntity(
      await this.inspectionsService.findOne(tripId),
    );
  }

  /** Change inspectedAt and/or the status and note of some checks. */
  @Patch()
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND)
  async update(
    @Param('tripId', ParseUUIDPipe) tripId: string,
    @Body() dto: UpdateTripInspectionDto,
  ): Promise<TripInspectionResponseDto> {
    return TripInspectionResponseDto.fromEntity(
      await this.inspectionsService.update(tripId, dto),
    );
  }

  /** Soft-delete the trip's inspection; a new one can then be recorded. */
  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND)
  remove(@Param('tripId', ParseUUIDPipe) tripId: string): Promise<void> {
    return this.inspectionsService.remove(tripId);
  }
}
```

**Create file: `src/modules/trip-inspections/trip-inspections.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InspectionChecklistModule } from '../inspection-checklist/inspection-checklist.module.js';
import { TripsModule } from '../trips/trips.module.js';
import { TripInspectionResult } from './entities/trip-inspection-result.entity.js';
import { TripInspection } from './entities/trip-inspection.entity.js';
import { TripInspectionResultsRepository } from './trip-inspection-results.repository.js';
import { TripInspectionsController } from './trip-inspections.controller.js';
import { TripInspectionsRepository } from './trip-inspections.repository.js';
import { TripInspectionsService } from './trip-inspections.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([TripInspection, TripInspectionResult]),
    TripsModule,
    InspectionChecklistModule,
  ],
  controllers: [TripInspectionsController],
  providers: [
    TripInspectionsService,
    TripInspectionsRepository,
    TripInspectionResultsRepository,
  ],
  exports: [TripInspectionsService],
})
export class TripInspectionsModule {}
```

**File: `src/app.module.ts`** — import `InspectionChecklistModule` (`./modules/inspection-checklist/inspection-checklist.module.js`) and `TripInspectionsModule` (`./modules/trip-inspections/trip-inspections.module.js`), keeping the import lines alphabetical by path. Add both to the `imports` array after `TripsModule`: `InspectionChecklistModule`, then `TripInspectionsModule`.

Final layout:

```text
src/database/migrations/1793437200000-CreateInspectionIndicatorsTable.ts    (new)
src/database/migrations/1793440800000-CreateInspectionChecksTable.ts        (new)
src/database/migrations/1793444400000-CreateTripInspectionsTable.ts         (new)
src/database/migrations/1793448000000-CreateTripInspectionResultsTable.ts   (new)
src/database/seeds/data/inspection-checklist.data.ts                        (new)
src/database/seeds/inspection-checklist.seed.ts                             (new)
src/database/seeds/run-seeds.ts                                             (edited)
src/modules/trips/trips.service.ts                                          (edited: exists)
src/app.module.ts                                                           (edited)
src/modules/inspection-checklist/
├── inspection-checklist.module.ts
├── inspection-checklist.service.ts
├── inspection-indicators.controller.ts
├── inspection-indicators.repository.ts
├── inspection-checks.controller.ts
├── inspection-checks.repository.ts
├── dto/
│   ├── create-inspection-indicator.dto.ts
│   ├── update-inspection-indicator.dto.ts
│   ├── create-inspection-check.dto.ts
│   ├── update-inspection-check.dto.ts
│   ├── inspection-indicator-response.dto.ts
│   └── inspection-check-response.dto.ts
└── entities/
    ├── inspection-indicator.entity.ts
    └── inspection-check.entity.ts
src/modules/trip-inspections/
├── trip-inspections.module.ts
├── trip-inspections.controller.ts
├── trip-inspections.service.ts
├── trip-inspections.repository.ts
├── trip-inspection-results.repository.ts
├── dto/
│   ├── create-trip-inspection.dto.ts
│   ├── update-trip-inspection.dto.ts
│   ├── inspection-result.dto.ts
│   └── trip-inspection-response.dto.ts
└── entities/
    ├── trip-inspection.entity.ts
    └── trip-inspection-result.entity.ts
```

---

## Edge Cases & Failure Modes

**Checklist** (`inspection-checklist.service.ts`, checklist DTOs)

- **Missing / too short / too long `nameAr` or `nameEn`** (after trim) → **400**. **`sortOrder`** `-1`, `1001`, `1.5`, `"1"` → **400**; omitted → `0`; `null` → **400** (`ValidateIf`).
- **Duplicate indicator name** (create, or PATCH to another indicator's name) → **409** `Arabic name is already in use` / `English name is already in use`. PATCH with its own name → no check.
- **Duplicate check name in the same indicator** → **409** `… already used by another check in this indicator`. The same name in a **different** indicator is allowed. Moving a check into an indicator that already has a check with its name → **409**.
- **Concurrent creates with the same name** → partial unique index → `23505` → **409** `Resource already exists`.
- **Soft-deleted names** can be reused (partial indexes; `exists` skips deleted rows).
- **Check with unknown or soft-deleted `indicatorId`** on create or move → **400** `Inspection indicator <id> does not exist`.
- **DELETE an indicator that still has live checks** → **409**. Delete or move its checks first. Checks already soft-deleted do not count (join filter, Context item 11).
- **Unknown or soft-deleted id** on any GET/PATCH/DELETE → **404**; non-uuid → **400**; unknown body fields → **400**.
- **Empty checklist**: `GET /inspection-indicators` → `[]`. An indicator with no checks → `checks: []`.
- **`GET /inspection-indicators` is not paginated** on purpose: the checklist is small (16 rows seeded) and always used whole. If it ever grows past a few hundred checks, add pagination then.

**Seed** (`inspection-checklist.seed.ts`)

- **Re-run** → `inspection indicators: inserted 0`. **Indicator renamed by an admin** (both names changed) → the seed inserts the default again as a new indicator. Accepted; same behaviour as the countries seed.
- **Indicator soft-deleted by an admin** → not re-inserted (`withDeleted: true`).
- **Checks are only inserted with a new indicator.** Adding a check to the seed data later does not add it to an existing indicator; add it through `POST /inspection-checks`.
- **Seed runs before migrations** → fails with `relation "inspection_indicators" does not exist`; run `npm run migration:run` first.

**Trip inspection** (`trip-inspections.service.ts`)

- **Unknown, soft-deleted or non-uuid trip** → **404** `Trip <id> not found` / **400** (`ParseUUIDPipe`).
- **Second inspection for the same trip** → **409** `Trip <id> already has an inspection`. Concurrent creates → partial unique index → **409** `Resource already exists`, the second transaction rolls back.
- **Results missing a live check** → **400** `Missing results for checks: <ids>`. **Unknown or soft-deleted checkId** → **400** `Unknown or deleted checks: <ids>`. **Duplicate checkId** → **400** (`ArrayUnique`). **`results: []`** → **400** (`ArrayNotEmpty`). More than 200 → **400**.
- **No live checks at all** → **400** `No inspection checks are configured` (seed not run, or everything deleted).
- **`status`** missing, `"true"`, `1` → **400** (`IsBoolean`, no implicit conversion). **`note`** `""` or whitespace only → **400** (`Length(1, 500)` after trim); `null` or omitted → no note. A failed check without a note is **allowed** (intake, Extra notes).
- **`inspectedAt`** not ISO 8601 → **400**. A date only (`"2026-11-15"`) is accepted as midnight UTC. A timestamp without offset (`"2026-11-15T07:45:00"`) is parsed in the **server's** timezone — clients should send the offset. Future timestamps are accepted. Omitted → now.
- **Checklist changes while a client fills the form** (check added or deleted between `GET /inspection-indicators` and `POST`) → **400** missing/unknown; the client reloads the checklist and resubmits.
- **PATCH `results` with a checkId not in this inspection** (including checks added to the checklist after the inspection) → **400** `Checks not part of this inspection`. Each PATCH item replaces that check's `status` and `note`; an omitted `note` clears it.
- **PATCH `results: []`** → **400** (`ArrayNotEmpty`). **`results: null` / `inspectedAt: null`** → **400**. **`{}`** → **200**, nothing changes.
- **PATCH that only changes results** → the inspection row is not touched, so its `updatedAt` stays; each changed result row gets a new `updated_at`. Accepted.
- **Inspection soft-deleted between `findOne` and the PATCH writes** → an `inspectedAt` change gets **404** and rolls back; result-only updates write to the deleted inspection's rows (invisible, harmless).
- **Check renamed, re-ordered, moved or soft-deleted after an inspection** → that inspection's response is unchanged (snapshot columns). The FK to `inspection_checks` stays valid because checks are only soft-deleted.
- **Trip soft-deleted** → its inspection is unreachable (404 on the trip). The inspection row is kept. Trips cannot be hard-deleted while an inspection exists (`FK_trip_inspections_trip_id` `RESTRICT`); no endpoint hard-deletes trips.
- **DELETE inspection** → soft delete; results stay (no cascade on soft delete). `GET` → **404**; a new `POST` → **201** (partial unique index).

**Startup / ESM**

- **`ReferenceError: Cannot access '…' before initialization`** at boot → a two-way relation property lacks `Relation<>` (`InspectionIndicator.checks`, `InspectionCheck.indicator`, `TripInspection.results`, `TripInspectionResult.inspection`).
- **`Nest can't resolve dependencies of TripInspectionsService`** → `DataSource` imported as a type, or `TripsModule` / `InspectionChecklistModule` missing from `imports`, or `TripsService` not exported by `TripsModule`.

**Migrations**

- **Order**: indicators → checks → trip_inspections → results (FKs). The timestamps guarantee it, and they must sort after Story 08's `1793433600000`.
- **Drift** → after applying, `npm run migration:generate -- src/database/migrations/Check` must report no changes. If it emits SQL, delete the generated file and align the hand-written migrations with it.

---

## Test Plan

No automated tests: the project forbids test files. Manual smoke tests against a running app (`BASE=http://localhost:3000/api`, bash, `node` for JSON). Use a trip from Story 08's Test Plan (or create one) as `$TRIP`, and a second trip as `$TRIP2`.

1. **Seed:** `npm run seed` → `inspection indicators: inserted 3`. Again → `inserted 0`.
2. **Checklist read:** `GET $BASE/inspection-indicators` → 3 indicators in order Dashboard Indicators, External Inspection, Safety Requirements with 6, 5, 5 checks in the seeded order, Arabic names exactly as in the data file.
3. **Indicator CRUD:** create `{"nameAr":"فحص داخلي","nameEn":"Interior","sortOrder":4}` → **201**, `checks: []`; save as `$IND`. Same `nameEn` again → **409**. `{"nameAr":"x","nameEn":"Interior 2"}` → **400**. PATCH `$IND` `{"sortOrder":null}` → **400**; `{"sortOrder":0}` → **200** and it now lists first.
4. **Check CRUD:** create `{"indicatorId":"$IND","nameAr":"نظافة المقاعد","nameEn":"Seat cleanliness"}` → **201**, `sortOrder: 0`; save as `$CHK`. Same `nameEn` in `$IND` → **409**; same `nameEn` in the Dashboard indicator → **201** (then delete it). Random uuid as `indicatorId` → **400**. `DELETE $BASE/inspection-indicators/$IND` → **409** (has `$CHK`).
5. **Build results:** `RESULTS=$(curl -s $BASE/inspection-indicators | node -pe "JSON.stringify(JSON.parse(require('fs').readFileSync(0)).flatMap(i => i.checks.map((c, n) => ({ checkId: c.id, status: !(i.nameEn === 'External Inspection' && n === 0), ...(n === 0 && i.nameEn === 'External Inspection' ? { note: 'Front left tire pressure low' } : {}) }))))")` — 17 results (16 + `$CHK`), one failing.
6. **Create inspection:** `curl -i -H "Content-Type: application/json" -d "{\"inspectedAt\":\"2026-11-15T07:45:00+03:00\",\"results\":$RESULTS}" $BASE/trips/$TRIP/inspection` → **201**, `passed: false`, `failedCount: 1`, 4 indicators (Interior first, `sortOrder` 0), External Inspection `passed: false` with the note on "Tires and Air pressure".
7. **Create errors:** same POST again → **409**. On `$TRIP2`: results without the last item → **400** `Missing results for checks: …`; plus a random uuid item → **400** `Unknown or deleted checks: …`; first item duplicated → **400**; `results: []` → **400**; one `status: "true"` → **400**; extra `"foo":1` in an item → **400**. Random trip uuid → **404**; `trips/abc/inspection` → **400**.
8. **Get:** `GET $BASE/trips/$TRIP/inspection` → same body as step 6. `GET $BASE/trips/$TRIP2/inspection` → **404** `Trip … has no inspection`.
9. **Update:** PATCH `$TRIP` `{"results":[{"checkId":"<tires check id>","status":true}]}` → **200**, `passed: true`, `failedCount: 0`, tires note now `null`. `{"inspectedAt":"2026-11-15T08:00:00+03:00"}` → **200**. `{"results":[{"checkId":"<random uuid>","status":true}]}` → **400**. `{"results":null}` → **400**. `{}` → **200**.
10. **Snapshot:** PATCH `$CHK` `{"nameEn":"Seats clean"}`, then `DELETE $BASE/inspection-checks/$CHK` → **204**. `GET $BASE/trips/$TRIP/inspection` → still shows "Seat cleanliness" under Interior. `GET $BASE/inspection-indicators` → Interior has `checks: []`; now `DELETE $BASE/inspection-indicators/$IND` → **204**.
11. **New checklist applies to new inspections only:** POST on `$TRIP2` with the step-5 `$RESULTS` (still contains `$CHK`) → **400** `Unknown or deleted checks: <CHK>`. Rebuild `$RESULTS` (16 items) → **201**, 3 indicators.
12. **Delete:** `curl -i -X DELETE $BASE/trips/$TRIP/inspection` → **204**; GET → **404**; POST again with a fresh 16-item `$RESULTS` → **201**.
13. **Empty checklist guard** (optional, on a scratch DB): soft-delete all checks, POST an inspection → **400** `No inspection checks are configured`.

---

## Migration / Rollback

- Schema: four new tables (`inspection_indicators`, `inspection_checks`, `trip_inspections`, `trip_inspection_results`) with the indexes and FKs above. `npm run migration:revert` **four times** undoes them in reverse order. **Reverting deletes the checklist and all inspections.** Re-applying requires `npm run seed` again.
- Half-applied state: each migration runs in its own transaction, so a failed `up` leaves nothing behind. With only the checklist tables applied the app boots, but inspection endpoints fail with `relation "trip_inspections" does not exist`; run `migration:run` again.
- Code rollback: revert the commit (also reverts `TripsService.exists` and the seed changes). No new dependencies or env vars. Revert the migrations **before** the code.

---

## Verification Steps

1. **Backend builds:** in the repo root (`trip-management/`), `npm run build` → no errors. `dist/modules/inspection-checklist/`, `dist/modules/trip-inspections/`, `dist/database/seeds/inspection-checklist.seed.js` and the four migrations' `.js` exist.
2. **Lint:** `npm run lint` → no errors.
3. **Boundaries:** `grep -rn "trips.repository\|inspection-checks.repository\|inspection-indicators.repository" src/modules/trip-inspections` → no output. `grep -rln "modules/inspection-checklist\|modules/trip-inspections" src --include=*.ts` → only files inside those two modules, `src/app.module.ts`, `src/database/seeds/inspection-checklist.seed.ts`. The only change in `src/modules/trips/` is `TripsService.exists`.
4. **No test artifacts:** `nest-cli.json` still has `"generateOptions": { "spec": false }`; no `*.spec.ts` under `src/`.
5. **Database:** `npm run migration:show` → four new migrations pending. `npm run migration:run` → applied. `npm run migration:generate -- src/database/migrations/Check` → "No changes in database schema were found". `npm run seed` → `inspection indicators: inserted 3`.
6. **Backend runs:** `npm run start:dev` → no `ReferenceError`; logs map `/api/inspection-indicators` (POST, GET, GET :id, PATCH :id, DELETE :id), `/api/inspection-checks` (POST, GET :id, PATCH :id, DELETE :id) and `/api/trips/:tripId/inspection` (POST, GET, PATCH, DELETE). `/api/docs-json` contains `CreateTripInspectionDto`, `InspectionResultDto`, `TripInspectionResponseDto` with nested `indicators[].checks[]`. Run Test Plan steps 1–12.
7. **Regression:** `/api/health`; `/api/trips` create/get/list/patch/delete from Story 08's Test Plan steps 1, 6, 7, 8 still pass; `npm run seed` still reports countries. `npm run migration:revert` four times, then `npm run migration:run` → all succeed.

---

## Done Criteria

**Implemented 2026-10-31.** Verified: build, lint, migrations with no drift, seed run twice (3 then 0), Test Plan steps 1–12, revert/re-run. The code matches the task blocks above except for prettier line-wrapping; `src/` is the source of truth.

- [x] `InspectionIndicator` (`inspection_indicators`) and `InspectionCheck` (`inspection_checks`) entities with `nameAr`, `nameEn`, `sortOrder`, `deletedAt`; partial unique names (global for indicators, per indicator for checks); check → indicator FK `RESTRICT`; two-way relation with `Relation<>`.
- [x] `TripInspection` (`trip_inspections`) with `tripId` (FK `RESTRICT`, partial unique), `inspectedAt`, `deletedAt`; `TripInspectionResult` (`trip_inspection_results`) with `status`, `note`, FK to inspection (`CASCADE`) and check (`RESTRICT`), snapshot columns, unique `(inspection_id, check_id)`.
- [x] Four migrations exist; `synchronize` stays `false`; no drift.
- [x] `npm run seed` inserts the 3 indicators and 16 checks (Arabic + English exactly as in the intake) once; re-runs insert nothing; admin-deleted indicators are not restored.
- [x] Checklist CRUD works with the validation above; duplicate names → 409; unknown indicator on check create/move → 400; deleting an indicator with live checks → 409; `GET /inspection-indicators` returns the sorted full checklist.
- [x] Trip inspection: unknown trip → 404; second live inspection → 409; create requires exactly one result per live check (missing/unknown/duplicate → 400); no checks configured → 400; written in one transaction.
- [x] PATCH changes `inspectedAt` and/or replaces status + note of the inspection's own checks; foreign checkIds → 400.
- [x] Response groups by indicator using snapshot names/order, with `passed`, `failedCount` and per-indicator `passed`; checklist edits after the fact do not change it.
- [x] DELETE soft-deletes; GET → 404 afterwards; a new inspection can be created.
- [x] `TripsService.exists` added; `TripInspectionsModule` uses only `TripsService.exists` and `InspectionChecklistService.findActiveChecks` from other modules.
- [x] ESM preserved (`.js` suffixes); `npm run build` and `npm run lint` pass; no test files.

**STOP HERE. Report to the user and wait for confirmation before proceeding to Story 10.**
