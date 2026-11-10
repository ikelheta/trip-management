# Story 08 — Add Trips module with passengers to schedule vehicle and driver trips

> **Partly superseded by [Story 10](10-story-send-pre-trip-inspection-with-trip.md):** `POST /trips` now requires an `inspection`, `PATCH /trips/:id` accepts one, and every trip response includes it. `src/` is the source of truth.

## Prerequisites

- **Story 01 completed:** [../project-structure/01-story-restructure-project-as-clean-modular-monolith-no-ddd-no-test-files.md](../project-structure/01-story-restructure-project-as-clean-modular-monolith-no-ddd-no-test-files.md). Config, `DatabaseModule`, `AllExceptionsFilter` (23505 → 409), global `ValidationPipe`.
- **Story 03 completed:** [../companies/03-story-company-management-api.md](../companies/03-story-company-management-api.md). It created the crud-foundation pieces this story uses: `BaseRepository`, `BaseListQueryDto`, `toSkipTake` / `toPaginatedResult`, `escapeLike`.
- **Stories 04, 06 and 07 completed:** [countries](../countries/04-story-countries-reference-data-api.md), [vehicles](../vehicles/06-story-vehicle-management-api.md), [drivers](../drivers/07-story-driver-management-api.md) (implemented before their plans were written). They are the pattern to copy and the source of truth: `src/modules/vehicles/`, `src/modules/drivers/`. Trips reference `vehicles` and `drivers` by foreign key.
- Intake: [../../stories/trips/add-trips-module-with-passengers-to-schedule-vehicle-and-driver-trips/intake.md](../../stories/trips/add-trips-module-with-passengers-to-schedule-vehicle-and-driver-trips/intake.md).
- Local **PostgreSQL ≥ 13** with all existing migrations applied (latest: `1793426400000-CreateDriversTable`) and countries seeded (`npm run seed`) is needed for the runtime verification steps only.
- **Do not start until `npm run build` passes on the current `src/`.**

---

## Story Goal

Add a `trips` module under `src/modules/trips/`. A trip is one vehicle + one driver on a date and time, with a list of passengers.

1. `POST/GET/GET :id/PATCH/DELETE /api/trips` manage trips: `tripName` (optional), `secretCode` (optional), `vehicleId`, `driverId`, `date`, `time` (required). `DELETE` is a soft delete.
2. `vehicleId` and `driverId` must point to existing, non-deleted rows (400 otherwise). Both are real foreign keys (`ON DELETE RESTRICT`).
3. Passengers (`name`, `identityNumber`, `docType`, `nationality`) live in a `passengers` table, one trip → many passengers. They are managed **nested in the trip body**:
   1. `POST` takes an optional `passengers` array.
   2. `PATCH` with `passengers` **replaces the whole list** (`[]` clears it); omitting it leaves the list unchanged.
   3. The trip row and its passenger rows are written in **one transaction**.
4. Every trip response includes its passengers. `GET /api/trips` is paginated and filters by `vehicleId`, `driverId`, `dateFrom`, `dateTo`, with `search` on `tripName`.

**Not in scope:** separate passenger endpoints, double-booking checks, vehicle capacity, company/tenant scoping, search by passenger, trip status, authorization, tests. **Do not** change `vehicles`, `companies`, `countries` or `files`. The **only** change outside `src/modules/trips/` is a new `exists` method on `DriversService` and one line in `app.module.ts`.

**Hard constraints for the executor** (same as Stories 01–07):

- Controller → Service → Repository. **No** DDD constructs, **no** new interfaces.
- `src/modules/trips/` uses other modules **only** through `VehiclesModule` / `VehiclesService.exists` and `DriversModule` / `DriversService.exists`. The entities import `Vehicle` and `Driver` **only** for the `@ManyToOne` mapping, exactly as `driver.entity.ts` imports `Vehicle`.
- ESM: every relative import ends in **`.js`**.
- Constructor-injected classes (`DataSource`, repositories, services) are **value imports**.
- Entities are mapped to response DTOs **in the controller**; the service returns entities.

---

## Context — Read These Files First

1. `src/modules/drivers/drivers.service.ts` — **the service pattern to copy.** `findOne` (~lines 35–41) throws `NotFoundException`; `create` (~lines 43–48) checks references first; `update` (~lines 50–74) only re-checks a reference when it changed and drops `undefined` with `Object.fromEntries` (~lines 66–68); `ensureVehicleExists` (~lines 93–97) is the 400 message format. **There is no `exists` method** — task 1 adds one.
2. `src/modules/vehicles/vehicles.service.ts` — ~lines 43–45: `exists(id)`. Copy it verbatim into `DriversService`.
3. `src/modules/drivers/drivers.repository.ts` — ~lines 15–45: `extends BaseRepository<Driver>`, `findPaginated` builds a `FindOptionsWhere` scope with conditional spreads (~lines 23–26), uses `ILike` + `escapeLike` + `toSkipTake`; `softDelete(id, manager?)` (~lines 42–44).
4. `src/modules/drivers/entities/driver.entity.ts` — ~lines 36–45: the FK column + `@ManyToOne(..., { onDelete: 'RESTRICT' })` + `@JoinColumn({ name, foreignKeyConstraintName })` pattern; ~lines 47–48: `@DeleteDateColumn`.
5. `src/modules/drivers/drivers.controller.ts` — ~lines 24–80: `@ApiTags`, `@ApiErrorResponses`, `@ApiPaginatedResponse`, `ParseUUIDPipe`, `DriverResponseDto.fromEntity` mapping, `{ ...result, data: result.data.map(...) }` for lists (~line 45).
6. `src/modules/drivers/dto/create-driver.dto.ts` — ~lines 4–5: the local `Trim` helper; ~lines 14–21: JSDoc with `@example` (the Swagger plugin has `introspectComments: true` in `nest-cli.json`, so JSDoc becomes the API docs).
7. `src/modules/drivers/dto/driver-response.dto.ts` and `dto/list-drivers-query.dto.ts` — response DTO with `static fromEntity`; list query `extends BaseListQueryDto` with optional `@IsUUID()` filters.
8. `src/modules/countries/dto/update-country.dto.ts` — ~lines 4–7: `PartialType` from **`@nestjs/swagger`** with `{ skipNullProperties: false }`, so `null` is validated instead of reaching `NOT NULL` columns.
9. `src/common/repositories/base.repository.ts` — `create(data, manager?)` (~lines 18–21), `update(id, data, manager?)` returns `null` when the row is gone (~lines 39–53), `exists(where)` (~lines 62–64), `protected repositoryFor(manager?)` (~lines 70–74). All `find*` / `exists` calls skip soft-deleted rows.
10. `src/common/dto/base-list-query.dto.ts` (~lines 14–42) and `src/common/utils/pagination.util.ts` (~lines 16–31) — `page`/`limit`/`search` and `{ data, meta }`.
11. `src/database/migrations/1793426400000-CreateDriversTable.ts` — ~lines 7–39: hand-written migration style with named FKs and indexes. Your timestamps must be larger.
12. `src/database/database.options.ts` — line 21: entities are loaded by glob (`**/*.entity.js`). New entities need no registration besides `TypeOrmModule.forFeature`. `DatabaseModule` uses the default (unnamed) data source, so `DataSource` is injectable by class.
13. `src/main.ts` — ~lines 12–19: `whitelist`, `forbidNonWhitelisted`, `transform`, `exposeUnsetFields: false` (omitted fields stay `undefined`, not present).
14. `src/common/filters/all-exceptions.filter.ts` — ~lines 65–74: Postgres `23505` → **409** `Resource already exists`.
15. `src/app.module.ts` — ~lines 15–26: module list. Add `TripsModule` after `DriversModule`.

---

## Implementation tasks

### 1 — `DriversService.exists`

**File: `src/modules/drivers/drivers.service.ts`** — add right after `findOne` (after ~line 41), identical to `VehiclesService.exists`:

```ts
  exists(id: string): Promise<boolean> {
    return this.driversRepository.exists({ id });
  }
```

`DriversModule` already exports `DriversService` (`drivers.module.ts` ~line 18). Nothing else in `drivers/` changes.

### 2 — Entities

Trip ↔ Passenger is the **first two-way relation** in the project. With ESM, `trip.entity.ts` and `passenger.entity.ts` import each other; wrap the relation property types in TypeORM's **`Relation<>`** so `emitDecoratorMetadata` does not reference the other class before it is initialized (otherwise: `ReferenceError: Cannot access 'Trip' before initialization` at startup).

**Create file: `src/modules/trips/entities/trip.entity.ts`**

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
import { Driver } from '../../drivers/entities/driver.entity.js';
import { Vehicle } from '../../vehicles/entities/vehicle.entity.js';
import { Passenger } from './passenger.entity.js';

@Entity('trips')
export class Trip extends BaseEntity {
  @Column({ name: 'trip_name', type: 'varchar', length: 256, nullable: true })
  tripName: string | null;

  @Column({ name: 'secret_code', type: 'varchar', length: 50, nullable: true })
  secretCode: string | null;

  @Index('IDX_trips_vehicle_id')
  @Column({ name: 'vehicle_id', type: 'uuid' })
  vehicleId: string;

  @ManyToOne(() => Vehicle, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'vehicle_id',
    foreignKeyConstraintName: 'FK_trips_vehicle_id',
  })
  vehicle?: Vehicle;

  @Index('IDX_trips_driver_id')
  @Column({ name: 'driver_id', type: 'uuid' })
  driverId: string;

  @ManyToOne(() => Driver, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'driver_id',
    foreignKeyConstraintName: 'FK_trips_driver_id',
  })
  driver?: Driver;

  // "YYYY-MM-DD": TypeORM hydrates date columns as strings.
  @Index('IDX_trips_date')
  @Column({ type: 'date' })
  date: string;

  // Postgres returns "HH:mm:ss".
  @Column({ type: 'time' })
  time: string;

  @OneToMany(() => Passenger, (passenger) => passenger.trip)
  passengers?: Relation<Passenger[]>;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
```

**Create file: `src/modules/trips/entities/passenger.entity.ts`**

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
import { Trip } from './trip.entity.js';

// Passengers exist only through their trip: no soft delete, replaced as a list.
@Entity('passengers')
@Index(
  'UQ_passengers_trip_id_identity_number',
  ['tripId', 'identityNumber'],
  { unique: true },
)
export class Passenger extends BaseEntity {
  @Column({ name: 'trip_id', type: 'uuid' })
  tripId: string;

  @ManyToOne(() => Trip, (trip) => trip.passengers, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'trip_id',
    foreignKeyConstraintName: 'FK_passengers_trip_id',
  })
  trip?: Relation<Trip>;

  @Column({ type: 'varchar', length: 256 })
  name: string;

  // Digits only, kept as text so leading zeros survive.
  @Column({ name: 'identity_number', type: 'varchar', length: 50 })
  identityNumber: string;

  @Column({ name: 'doc_type', type: 'varchar', length: 50 })
  docType: string;

  @Column({ type: 'varchar', length: 256 })
  nationality: string;
}
```

- The unique index starts with `trip_id`, so it also serves "passengers of trip X" lookups. **Do not** add a separate `trip_id` index.
- The index is **not** partial: passengers have no `deleted_at`.
- `ON DELETE CASCADE` only fires on a **hard** delete of a trip. Soft-deleting a trip leaves its passengers in place.

### 3 — Migrations

Preferred (needs a running DB): after task 2 and `npm run build`, run `npm run migration:generate -- src/database/migrations/CreateTripsAndPassengers`, then compare its SQL with the hand-written files below (names of PKs, FKs and indexes must match).

If no DB is available, create **two** files by hand.

**Create file: `src/database/migrations/1793430000000-CreateTripsTable.ts`**

```ts
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTripsTable1793430000000 implements MigrationInterface {
  name = 'CreateTripsTable1793430000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "trips" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "trip_name" character varying(256),
        "secret_code" character varying(50),
        "vehicle_id" uuid NOT NULL,
        "driver_id" uuid NOT NULL,
        "date" date NOT NULL,
        "time" TIME NOT NULL,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_f71c231dee9c05a9522f9e840f5" PRIMARY KEY ("id"),
        CONSTRAINT "FK_trips_vehicle_id" FOREIGN KEY ("vehicle_id")
          REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "FK_trips_driver_id" FOREIGN KEY ("driver_id")
          REFERENCES "drivers"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_trips_vehicle_id" ON "trips" ("vehicle_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_trips_driver_id" ON "trips" ("driver_id")`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_trips_date" ON "trips" ("date")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_trips_date"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_trips_driver_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_trips_vehicle_id"`);
    await queryRunner.query(`DROP TABLE "trips"`);
  }
}
```

**Create file: `src/database/migrations/1793433600000-CreatePassengersTable.ts`**

```ts
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePassengersTable1793433600000 implements MigrationInterface {
  name = 'CreatePassengersTable1793433600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "passengers" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "trip_id" uuid NOT NULL,
        "name" character varying(256) NOT NULL,
        "identity_number" character varying(50) NOT NULL,
        "doc_type" character varying(50) NOT NULL,
        "nationality" character varying(256) NOT NULL,
        CONSTRAINT "PK_9863c72acd866e4529f65c6c98c" PRIMARY KEY ("id"),
        CONSTRAINT "FK_passengers_trip_id" FOREIGN KEY ("trip_id")
          REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_passengers_trip_id_identity_number" ON "passengers" ("trip_id", "identity_number")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."UQ_passengers_trip_id_identity_number"`,
    );
    await queryRunner.query(`DROP TABLE "passengers"`);
  }
}
```

PK names are `"PK_" + sha1("<table>_id").substring(0, 27)` (TypeORM `DefaultNamingStrategy.primaryKeyName`). Verified 2026-10-31: the formula gives `PK_92ab3fb69e566d3eb0cae896047` for `drivers`, matching `1793426400000-CreateDriversTable.ts` line 17; for `trips` it gives `PK_f71c231dee9c05a9522f9e840f5`, for `passengers` `PK_9863c72acd866e4529f65c6c98c`.

### 4 — DTOs

**Create file: `src/modules/trips/dto/create-passenger.dto.ts`**

```ts
import { Transform } from 'class-transformer';
import { IsString, Length, Matches } from 'class-validator';

const Trim = () =>
  Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));

export class CreatePassengerDto {
  /** @example "Sara Ahmed" */
  @Trim()
  @IsString()
  @Length(2, 256)
  name: string;

  /**
   * Digits only, sent as a string so leading zeros survive. Unique within a trip.
   * @example "1010101010"
   */
  @Trim()
  @IsString()
  @Matches(/^\d{1,50}$/, {
    message: 'identityNumber must contain 1-50 digits only',
  })
  identityNumber: string;

  /** @example "passport" */
  @Trim()
  @IsString()
  @Length(1, 50)
  docType: string;

  /** @example "Saudi Arabia" */
  @Trim()
  @IsString()
  @Length(2, 256)
  nationality: string;
}
```

**Create file: `src/modules/trips/dto/create-trip.dto.ts`**

```ts
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { CreatePassengerDto } from './create-passenger.dto.js';

const Trim = () =>
  Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));

export const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;
const MAX_PASSENGERS = 100;

export class CreateTripDto {
  /** @example "Riyadh to Jeddah — morning" */
  @IsOptional()
  @Trim()
  @IsString()
  @Length(2, 256)
  tripName?: string | null;

  /** @example "A7K29Q" */
  @IsOptional()
  @Trim()
  @IsString()
  @Length(1, 50)
  secretCode?: string | null;

  /**
   * Id of an existing (non-deleted) vehicle.
   * @example "7a6b5c4d-3e2f-4a1b-8c9d-0e1f2a3b4c5d"
   */
  @IsUUID()
  vehicleId: string;

  /**
   * Id of an existing (non-deleted) driver.
   * @example "1b2c3d4e-5f6a-4b7c-8d9e-0f1a2b3c4d5e"
   */
  @IsUUID()
  driverId: string;

  /**
   * Trip date, "YYYY-MM-DD".
   * @example "2026-11-15"
   */
  @IsString()
  @Matches(DATE_PATTERN, { message: 'date must be in YYYY-MM-DD format' })
  @IsISO8601({ strict: true }, { message: 'date must be a valid date' })
  date: string;

  /**
   * 24h "HH:mm" or "HH:mm:ss". Responses always use "HH:mm:ss".
   * @example "08:30"
   */
  @IsString()
  @Matches(TIME_PATTERN, {
    message: 'time must be in HH:mm or HH:mm:ss format (24h)',
  })
  time: string;

  /**
   * Omit for none. On update, this list replaces all existing passengers; [] clears them.
   */
  // ValidateIf instead of IsOptional: omitted is fine, null is rejected.
  @ValidateIf((_, value) => value !== undefined)
  @IsArray()
  @ArrayMaxSize(MAX_PASSENGERS)
  @ArrayUnique(
    (passenger?: CreatePassengerDto) => passenger?.identityNumber,
    { message: 'passengers must not repeat an identityNumber' },
  )
  @ValidateNested({ each: true })
  @Type(() => CreatePassengerDto)
  passengers?: CreatePassengerDto[];
}
```

- `tripName` / `secretCode` carry their **own** `@IsOptional()`, which accepts `null`. That is what lets PATCH clear them.
- `Matches` checks the shape; `IsISO8601({ strict: true })` rejects impossible dates (`2026-02-30`). Both are needed: `IsISO8601` alone also accepts full timestamps.
- `ValidateNested` + `@Type` make `forbidNonWhitelisted` apply **inside** each passenger too.

**Create file: `src/modules/trips/dto/update-trip.dto.ts`**

```ts
import { PartialType } from '@nestjs/swagger';
import { CreateTripDto } from './create-trip.dto.js';

// skipNullProperties: false → null is rejected for vehicleId, driverId, date, time and passengers.
// tripName/secretCode keep their own @IsOptional(), so null clears them.
export class UpdateTripDto extends PartialType(CreateTripDto, {
  skipNullProperties: false,
}) {}
```

**Create file: `src/modules/trips/dto/list-trips-query.dto.ts`**

```ts
import { IsISO8601, IsOptional, IsUUID, Matches } from 'class-validator';
import { BaseListQueryDto } from '../../../common/dto/base-list-query.dto.js';
import { DATE_PATTERN } from './create-trip.dto.js';

export class ListTripsQueryDto extends BaseListQueryDto {
  /** Only return trips that use this vehicle. */
  @IsOptional()
  @IsUUID()
  vehicleId?: string;

  /** Only return trips driven by this driver. */
  @IsOptional()
  @IsUUID()
  driverId?: string;

  /** Only return trips on or after this date, "YYYY-MM-DD". */
  @IsOptional()
  @Matches(DATE_PATTERN, { message: 'dateFrom must be in YYYY-MM-DD format' })
  @IsISO8601({ strict: true }, { message: 'dateFrom must be a valid date' })
  dateFrom?: string;

  /** Only return trips on or before this date, "YYYY-MM-DD". */
  @IsOptional()
  @Matches(DATE_PATTERN, { message: 'dateTo must be in YYYY-MM-DD format' })
  @IsISO8601({ strict: true }, { message: 'dateTo must be a valid date' })
  dateTo?: string;
}
```

**Create file: `src/modules/trips/dto/passenger-response.dto.ts`**

```ts
import type { Passenger } from '../entities/passenger.entity.js';

export class PassengerResponseDto {
  id: string;
  name: string;
  identityNumber: string;
  docType: string;
  nationality: string;

  static fromEntity(passenger: Passenger): PassengerResponseDto {
    return {
      id: passenger.id,
      name: passenger.name,
      identityNumber: passenger.identityNumber,
      docType: passenger.docType,
      nationality: passenger.nationality,
    };
  }
}
```

**Create file: `src/modules/trips/dto/trip-response.dto.ts`**

```ts
import type { Trip } from '../entities/trip.entity.js';
import { PassengerResponseDto } from './passenger-response.dto.js';

export class TripResponseDto {
  id: string;
  tripName: string | null;
  secretCode: string | null;
  vehicleId: string;
  driverId: string;
  /** @example "2026-11-15" */
  date: string;
  /** @example "08:30:00" */
  time: string;
  /** Sorted by name. */
  passengers: PassengerResponseDto[];
  createdAt: Date;
  updatedAt: Date;

  // TripsRepository loads passengers on every read.
  static fromEntity(trip: Trip): TripResponseDto {
    return {
      id: trip.id,
      tripName: trip.tripName,
      secretCode: trip.secretCode,
      vehicleId: trip.vehicleId,
      driverId: trip.driverId,
      date: trip.date,
      time: trip.time,
      passengers: (trip.passengers ?? [])
        .map(PassengerResponseDto.fromEntity)
        .sort((a, b) => a.name.localeCompare(b.name)),
      createdAt: trip.createdAt,
      updatedAt: trip.updatedAt,
    };
  }
}
```

Passengers are sorted **here**, not with a relation `order` in the query: ordering by a joined column together with `skip`/`take` is fragile in TypeORM.

### 5 — Repositories

**Create file: `src/modules/trips/trips.repository.ts`**

```ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  EntityManager,
  ILike,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
  type FindOptionsWhere,
} from 'typeorm';
import { BaseRepository } from '../../common/repositories/base.repository.js';
import { escapeLike } from '../../common/utils/escape-like.util.js';
import { toSkipTake } from '../../common/utils/pagination.util.js';
import { ListTripsQueryDto } from './dto/list-trips-query.dto.js';
import { Trip } from './entities/trip.entity.js';

@Injectable()
export class TripsRepository extends BaseRepository<Trip> {
  constructor(@InjectRepository(Trip) repository: Repository<Trip>) {
    super(repository);
  }

  findByIdWithPassengers(id: string): Promise<Trip | null> {
    return this.repository.findOne({
      where: { id },
      relations: { passengers: true },
    });
  }

  // Searchable column: tripName. vehicleId/driverId/date range narrow the result.
  findPaginated(query: ListTripsQueryDto): Promise<[Trip[], number]> {
    const dateRange = toDateRange(query.dateFrom, query.dateTo);
    const where: FindOptionsWhere<Trip> = {
      ...(query.vehicleId && { vehicleId: query.vehicleId }),
      ...(query.driverId && { driverId: query.driverId }),
      ...(dateRange && { date: dateRange }),
      ...(query.search && {
        tripName: ILike(`%${escapeLike(query.search)}%`),
      }),
    };
    return this.findAndCount({
      where,
      relations: { passengers: true },
      order: { date: 'DESC', time: 'DESC', createdAt: 'DESC' },
      ...toSkipTake(query),
    });
  }

  async softDelete(id: string, manager?: EntityManager): Promise<void> {
    await this.repositoryFor(manager).softDelete({ id });
  }
}

// Both bounds inclusive; "YYYY-MM-DD" strings compare correctly against a date column.
function toDateRange(from?: string, to?: string) {
  if (from && to) {
    return Between(from, to);
  }
  if (from) {
    return MoreThanOrEqual(from);
  }
  return to ? LessThanOrEqual(to) : undefined;
}
```

**Create file: `src/modules/trips/passengers.repository.ts`**

```ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { BaseRepository } from '../../common/repositories/base.repository.js';
import type { CreatePassengerDto } from './dto/create-passenger.dto.js';
import { Passenger } from './entities/passenger.entity.js';

@Injectable()
export class PassengersRepository extends BaseRepository<Passenger> {
  constructor(
    @InjectRepository(Passenger) repository: Repository<Passenger>,
  ) {
    super(repository);
  }

  // Always called inside the trip's transaction, so the list is swapped atomically.
  async replaceForTrip(
    tripId: string,
    passengers: CreatePassengerDto[],
    manager: EntityManager,
  ): Promise<void> {
    const repository = this.repositoryFor(manager);
    await repository.delete({ tripId });
    if (passengers.length > 0) {
      await repository.save(
        passengers.map((passenger) =>
          repository.create({ ...passenger, tripId }),
        ),
      );
    }
  }
}
```

The delete runs before the insert, so re-sending the same `identityNumber`s does not hit the unique index.

### 6 — Service

**Create file: `src/modules/trips/trips.service.ts`**

```ts
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, type DeepPartial } from 'typeorm';
import {
  toPaginatedResult,
  type PaginatedResult,
} from '../../common/utils/pagination.util.js';
import { DriversService } from '../drivers/drivers.service.js';
import { VehiclesService } from '../vehicles/vehicles.service.js';
import { CreateTripDto } from './dto/create-trip.dto.js';
import type { ListTripsQueryDto } from './dto/list-trips-query.dto.js';
import { UpdateTripDto } from './dto/update-trip.dto.js';
import { Trip } from './entities/trip.entity.js';
import { PassengersRepository } from './passengers.repository.js';
import { TripsRepository } from './trips.repository.js';

@Injectable()
export class TripsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly tripsRepository: TripsRepository,
    private readonly passengersRepository: PassengersRepository,
    private readonly vehiclesService: VehiclesService,
    private readonly driversService: DriversService,
  ) {}

  async findAll(query: ListTripsQueryDto): Promise<PaginatedResult<Trip>> {
    if (query.dateFrom && query.dateTo && query.dateFrom > query.dateTo) {
      throw new BadRequestException('dateFrom must be on or before dateTo');
    }
    return toPaginatedResult(
      await this.tripsRepository.findPaginated(query),
      query,
    );
  }

  // Loads the passengers too.
  async findOne(id: string): Promise<Trip> {
    const trip = await this.tripsRepository.findByIdWithPassengers(id);
    if (!trip) {
      throw new NotFoundException(`Trip ${id} not found`);
    }
    return trip;
  }

  async create(dto: CreateTripDto): Promise<Trip> {
    await this.ensureVehicleExists(dto.vehicleId);
    await this.ensureDriverExists(dto.driverId);

    const { passengers = [], ...fields } = dto;
    const tripId = await this.dataSource.transaction(async (manager) => {
      const trip = await this.tripsRepository.create(fields, manager);
      await this.passengersRepository.replaceForTrip(
        trip.id,
        passengers,
        manager,
      );
      return trip.id;
    });
    return this.findOne(tripId);
  }

  async update(id: string, dto: UpdateTripDto): Promise<Trip> {
    const trip = await this.findOne(id);

    if (dto.vehicleId !== undefined && dto.vehicleId !== trip.vehicleId) {
      await this.ensureVehicleExists(dto.vehicleId);
    }
    if (dto.driverId !== undefined && dto.driverId !== trip.driverId) {
      await this.ensureDriverExists(dto.driverId);
    }

    const { passengers, ...fields } = dto;
    const changes: DeepPartial<Trip> = Object.fromEntries(
      Object.entries(fields).filter(([, value]) => value !== undefined),
    );
    await this.dataSource.transaction(async (manager) => {
      if (!(await this.tripsRepository.update(trip.id, changes, manager))) {
        throw new NotFoundException(`Trip ${id} not found`);
      }
      if (passengers !== undefined) {
        await this.passengersRepository.replaceForTrip(
          trip.id,
          passengers,
          manager,
        );
      }
    });
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    if (!(await this.tripsRepository.exists({ id }))) {
      throw new NotFoundException(`Trip ${id} not found`);
    }
    await this.tripsRepository.softDelete(id);
  }

  private async ensureVehicleExists(vehicleId: string): Promise<void> {
    if (!(await this.vehiclesService.exists(vehicleId))) {
      throw new BadRequestException(`Vehicle ${vehicleId} does not exist`);
    }
  }

  private async ensureDriverExists(driverId: string): Promise<void> {
    if (!(await this.driversService.exists(driverId))) {
      throw new BadRequestException(`Driver ${driverId} does not exist`);
    }
  }
}
```

- All reference checks run **before** the transaction, so a 400 never opens one.
- Any error inside `dataSource.transaction` (including the `NotFoundException`) rolls back both the trip and the passenger writes.
- The service returns entities; mapping to `TripResponseDto` happens in the controller.

### 7 — Controller, module, app module

**Create file: `src/modules/trips/trips.controller.ts`** — HTTP only.

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
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiErrorResponses } from '../../common/decorators/api-error-responses.decorator.js';
import { ApiPaginatedResponse } from '../../common/decorators/api-paginated-response.decorator.js';
import type { PaginatedResult } from '../../common/utils/pagination.util.js';
import { CreateTripDto } from './dto/create-trip.dto.js';
import { ListTripsQueryDto } from './dto/list-trips-query.dto.js';
import { TripResponseDto } from './dto/trip-response.dto.js';
import { UpdateTripDto } from './dto/update-trip.dto.js';
import { TripsService } from './trips.service.js';

// Entities are mapped to response DTOs here; the service returns entities.
@ApiTags('trips')
@Controller('trips')
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  /** Create a trip with an existing vehicle and driver, and its passengers. */
  @Post()
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.CONFLICT)
  async create(@Body() dto: CreateTripDto): Promise<TripResponseDto> {
    return TripResponseDto.fromEntity(await this.tripsService.create(dto));
  }

  /** List trips, latest date and time first. Search matches the trip name. */
  @Get()
  @ApiPaginatedResponse(TripResponseDto)
  @ApiErrorResponses(HttpStatus.BAD_REQUEST)
  async findAll(
    @Query() query: ListTripsQueryDto,
  ): Promise<PaginatedResult<TripResponseDto>> {
    const result = await this.tripsService.findAll(query);
    return { ...result, data: result.data.map(TripResponseDto.fromEntity) };
  }

  /** Get a trip with its passengers. */
  @Get(':id')
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND)
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TripResponseDto> {
    return TripResponseDto.fromEntity(await this.tripsService.findOne(id));
  }

  /** Update a trip. Sending passengers replaces the whole list. */
  @Patch(':id')
  @ApiErrorResponses(
    HttpStatus.BAD_REQUEST,
    HttpStatus.NOT_FOUND,
    HttpStatus.CONFLICT,
  )
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTripDto,
  ): Promise<TripResponseDto> {
    return TripResponseDto.fromEntity(await this.tripsService.update(id, dto));
  }

  /** Soft-delete a trip. */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.tripsService.remove(id);
  }
}
```

**Create file: `src/modules/trips/trips.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DriversModule } from '../drivers/drivers.module.js';
import { VehiclesModule } from '../vehicles/vehicles.module.js';
import { Passenger } from './entities/passenger.entity.js';
import { Trip } from './entities/trip.entity.js';
import { PassengersRepository } from './passengers.repository.js';
import { TripsController } from './trips.controller.js';
import { TripsRepository } from './trips.repository.js';
import { TripsService } from './trips.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Trip, Passenger]),
    VehiclesModule,
    DriversModule,
  ],
  controllers: [TripsController],
  providers: [TripsService, TripsRepository, PassengersRepository],
  exports: [TripsService],
})
export class TripsModule {}
```

**File: `src/app.module.ts`** — add `import { TripsModule } from './modules/trips/trips.module.js';` between the `HealthModule` and `UsersModule` import lines (the imports are alphabetical), and add `TripsModule` to the `imports` array after `DriversModule`.

Final layout:

```text
src/database/migrations/1793430000000-CreateTripsTable.ts        (new)
src/database/migrations/1793433600000-CreatePassengersTable.ts   (new)
src/modules/drivers/drivers.service.ts                           (edited: exists)
src/app.module.ts                                                (edited)
src/modules/trips/
├── trips.module.ts
├── trips.controller.ts
├── trips.service.ts
├── trips.repository.ts
├── passengers.repository.ts
├── dto/
│   ├── create-trip.dto.ts
│   ├── update-trip.dto.ts
│   ├── create-passenger.dto.ts
│   ├── list-trips-query.dto.ts
│   ├── trip-response.dto.ts
│   └── passenger-response.dto.ts
└── entities/
    ├── trip.entity.ts
    └── passenger.entity.ts
```

---

## Edge Cases & Failure Modes

**Trip fields** (`create-trip.dto.ts`, `update-trip.dto.ts`)

- **Missing `vehicleId`, `driverId`, `date` or `time` on create** → **400**.
- **`date` not `YYYY-MM-DD`** (`"15/11/2026"`, `"2026-11-15T08:00:00Z"`) → **400** (`Matches`). **Impossible date** (`"2026-02-30"`, `"2026-13-01"`) → **400** (`IsISO8601 strict`).
- **`time`** `"8:30"`, `"24:00"`, `"08:60"`, `"08:30 PM"` → **400**. `"08:30"` is stored and returned as `"08:30:00"`; clients must not expect the exact string back.
- **Past dates** are accepted (historical trips). No timezone handling: `date` + `time` are local wall-clock values with no zone.
- **`tripName` `" a "`** (1 char after trim) → **400**. `tripName: null` / `secretCode: null` → stored `NULL` (create) or cleared (PATCH). Omitted on PATCH → unchanged.
- **`null` for `vehicleId`, `driverId`, `date`, `time` on PATCH** → **400** (`skipNullProperties: false`). Empty PATCH `{}` → **200**, nothing changes.
- **Unknown field** at top level (`id`, `deletedAt`, `foo`) or inside a passenger (`passengers[0].age`) → **400** (`forbidNonWhitelisted` + `ValidateNested`).
- **`secretCode` is returned in every response** and is not unique. Hiding it is an auth-story decision.

**References** (`trips.service.ts` `ensureVehicleExists` / `ensureDriverExists`)

- **Unknown or soft-deleted `vehicleId` / `driverId`** → **400** `Vehicle <id> does not exist` / `Driver <id> does not exist`. Malformed uuid → **400** from `@IsUUID()`.
- **PATCH that does not change `vehicleId`/`driverId`** → not re-checked. A trip whose vehicle or driver was soft-deleted later still loads and can be edited; moving it to another **deleted** vehicle/driver → **400**.
- **Vehicle or driver soft-deleted after trips reference them** → allowed (soft delete does not trigger `RESTRICT`). A **hard** delete of a referenced vehicle/driver fails with a FK error (`23503` → **500** through the filter). No endpoint hard-deletes vehicles or drivers today.
- **Driver not assigned to the vehicle** (`drivers.vehicle_id` ≠ trip `vehicleId`) → accepted on purpose (intake, Extra notes).
- **Same vehicle or driver on two trips at the same date/time** → accepted (double-booking is out of scope).

**Passengers** (`create-passenger.dto.ts`, `passengers.repository.ts`)

- **`passengers` omitted on create** → trip with `passengers: []`. **`passengers: null`** on create or PATCH → **400** (`ValidateIf` + `IsArray`). **`passengers: []` on PATCH** → all passengers removed.
- **More than 100 passengers** → **400** (`ArrayMaxSize`).
- **`identityNumber`** `"12A45"`, `" "`, `1234567890` (JSON number) → **400** (`IsString` / `Matches`). `"0012345"` keeps its leading zeros.
- **Same `identityNumber` twice in one request** → **400** `passengers must not repeat an identityNumber` (`ArrayUnique`). Two passengers that are both missing `identityNumber` also trigger this message next to the "required" errors; still 400.
- **Two concurrent PATCHes on the same trip's passengers** → each runs delete + insert in its own transaction. If both insert the same `identityNumber`, the second hits `UQ_passengers_trip_id_identity_number` → `23505` → **409** `Resource already exists` and its transaction rolls back. Otherwise last writer wins.
- **Same person on two different trips** → allowed (the unique index is per trip).
- **PATCH that only changes passengers** → the trip row is not modified, so the trip's `updatedAt` does **not** change. Accepted.
- **Passenger insert fails mid-way** (DB error) → the whole transaction rolls back: no trip on create; old trip fields and old passenger list kept on update.
- **Passenger order** in responses is by `name` (`TripResponseDto.fromEntity`), not insertion order.

**Read / list / delete** (`trips.repository.ts`, `trips.service.ts`)

- **Unknown or soft-deleted id** on GET, PATCH, DELETE → **404** `Trip <id> not found`. **Non-uuid id** → **400** (`ParseUUIDPipe`).
- **Trip deleted between `findOne` and the save in `update`** → `BaseRepository.update` returns `null` → **404** inside the transaction, nothing written.
- **`dateFrom` after `dateTo`** → **400** `dateFrom must be on or before dateTo` (`TripsService.findAll`). Equal dates → trips on that day.
- **`search`** matches only `tripName`, case-insensitive, with `%`/`_` escaped. Trips with `tripName: null` never match a search.
- **List with passengers + pagination**: `findAndCount` with `relations` and `skip`/`take` makes TypeORM select the page's trip ids first, so `limit` counts trips, not passenger rows. `meta.total` counts trips.
- **Soft-deleting a trip** keeps its passengers; they are invisible because the trip is. A restored trip gets them back.

**Startup / ESM**

- **`ReferenceError: Cannot access 'Trip' before initialization`** at boot → a relation property is typed without `Relation<>`. Both `Trip.passengers` and `Passenger.trip` must use it (task 2).
- **`Nest can't resolve dependencies of the TripsService (DataSource, …)`** → `DataSource` was imported with `import type`. It must be a value import from `typeorm`.

**Migrations**

- **Order matters**: `CreateTripsTable` must run before `CreatePassengersTable` (FK). The timestamps guarantee it.
- **Hand-written migration drift** → after applying, run `npm run migration:generate -- src/database/migrations/Check`. It must report **no changes**. If it emits SQL (e.g. `time` vs `TIME`, index or PK names), delete the generated file and align the hand-written migration with what it shows.

---

## Test Plan

No automated tests: the project forbids test files. Verify with manual smoke tests against a running app (`BASE=http://localhost:3000/api`, bash). Set up references first:

```bash
COMPANY_ID=$(curl -s -H "Content-Type: application/json" -d '{"name":"Trip Test Co","registrationNumber":"CR-TRIP-1","city":"Riyadh","address":"King Fahd Rd","whatsAppNumber":"+966500000000","phoneNumber":"+966110000000"}' $BASE/companies | node -pe "JSON.parse(require('fs').readFileSync(0)).id")
VEHICLE_ID=$(curl -s -H "Content-Type: application/json" -d "{\"plateNumber\":\"TRP 0001\",\"model\":\"Toyota Hiace 2024\",\"type\":\"Bus\",\"companyId\":\"$COMPANY_ID\"}" $BASE/vehicles | node -pe "JSON.parse(require('fs').readFileSync(0)).id")
COUNTRY_ID=$(curl -s "$BASE/countries?limit=1" | node -pe "JSON.parse(require('fs').readFileSync(0)).data[0].id")
DRIVER_ID=$(curl -s -H "Content-Type: application/json" -d "{\"name\":\"Mohammed Ali\",\"identityId\":\"9900000001\",\"nationalityId\":\"$COUNTRY_ID\",\"vehicleId\":\"$VEHICLE_ID\"}" $BASE/drivers | node -pe "JSON.parse(require('fs').readFileSync(0)).id")
P1='{"name":"Sara Ahmed","identityNumber":"0123456789","docType":"passport","nationality":"Saudi Arabia"}'
P2='{"name":"Omar Khaled","identityNumber":"2234567890","docType":"iqama","nationality":"Egypt"}'
```

1. **Create with passengers:** `curl -i -H "Content-Type: application/json" -d "{\"tripName\":\"Morning run\",\"vehicleId\":\"$VEHICLE_ID\",\"driverId\":\"$DRIVER_ID\",\"date\":\"2026-11-15\",\"time\":\"08:30\",\"passengers\":[$P1,$P2]}" $BASE/trips` → **201**, `time: "08:30:00"`, `secretCode: null`, two passengers sorted by name (Omar, Sara), `identityNumber: "0123456789"` (leading zero kept). Save `id` as `$TRIP`.
2. **Create without passengers / optional fields:** body with only `vehicleId`, `driverId`, `date: "2026-11-16"`, `time: "17:00:00"` → **201**, `tripName: null`, `passengers: []`. Save as `$TRIP2`.
3. **Trip validation** (each → **400**): missing `date`; `date: "2026-02-30"`; `date: "2026-11-15T08:00:00Z"`; `time: "24:00"`; `time: "8:30"`; `tripName: " a "`; extra `"foo":1`; `vehicleId: "abc"`.
4. **Passenger validation** (each → **400**): `passengers: null`; passenger missing `docType`; `identityNumber: "12A45"`; `identityNumber: 1234567890` (number); passenger with extra `"age":30`; `[$P1,$P1]` (duplicate identityNumber); 101 passengers (`node -e` to build the body).
5. **References:** random uuid as `vehicleId` → **400** `Vehicle … does not exist`; as `driverId` → **400** `Driver … does not exist`.
6. **Get:** `GET $BASE/trips/$TRIP` → **200** with both passengers. `GET $BASE/trips/abc` → **400**; random uuid → **404**.
7. **List:** `GET $BASE/trips` → `{ data, meta }`, `$TRIP2` (16th) before `$TRIP` (15th), each with `passengers`. `?dateFrom=2026-11-16` → only `$TRIP2`. `?dateTo=2026-11-15` → only `$TRIP`. `?dateFrom=2026-11-16&dateTo=2026-11-15` → **400**. `?search=morn` → only `$TRIP`. `?vehicleId=$VEHICLE_ID&driverId=$DRIVER_ID` → both. `?dateFrom=2026-02-30` → **400**. `?limit=1` → one trip, `meta.total` ≥ 2.
8. **Update fields only:** `PATCH $TRIP` `{"tripName":"Evening run","time":"18:15"}` → **200**, `time: "18:15:00"`, passengers unchanged (same ids). `{"secretCode":"A7K29Q"}` → set; `{"secretCode":null}` → cleared. `{"date":null}` → **400**. `{}` → **200**.
9. **Replace passengers:** `PATCH $TRIP` `{"passengers":[$P1]}` → **200**, one passenger (new id). `{"passengers":[]}` → `passengers: []`. `{"passengers":null}` → **400**.
10. **Atomic rollback:** `PATCH $TRIP` `{"tripName":"Should not stick","passengers":[$P1,{"name":"Bad","identityNumber":"x","docType":"id","nationality":"SA"}]}` → **400** (validation, before any write); `GET` shows the previous name. (A DB-level failure path is covered by the transaction; it cannot be triggered from the API without a race.)
11. **Change vehicle/driver:** create a second vehicle; `PATCH $TRIP` `{"vehicleId":"<new>"}` → **200**. Soft-delete that vehicle (`DELETE $BASE/vehicles/<new>`), then `PATCH $TRIP` `{"tripName":"Still editable"}` → **200**; `PATCH $TRIP2` `{"vehicleId":"<new>"}` → **400**.
12. **Delete:** `curl -i -X DELETE $BASE/trips/$TRIP` → **204**; GET/PATCH/DELETE → **404**; list excludes it. In `psql`: `SELECT count(*) FROM passengers WHERE trip_id = '<TRIP>'` → rows still present.

Clean up the test company, vehicles, driver and trips afterwards (soft deletes are fine).

---

## Migration / Rollback

- Schema: `CreateTripsTable` creates `trips` with FKs to `vehicles` and `drivers` and three indexes; `CreatePassengersTable` creates `passengers` with a cascading FK to `trips` and the unique `(trip_id, identity_number)` index. `npm run migration:revert` **twice** undoes both (passengers first). **Reverting deletes all trips and passengers.**
- Half-applied state: PostgreSQL runs each TypeORM migration in a transaction, so a failed `up` leaves nothing behind. If only `CreateTripsTable` applied, the app boots but every passenger query fails (`relation "passengers" does not exist`); run `migration:run` again.
- Code rollback: revert the commit. No new dependencies or env vars. Revert the migrations **before** the code, or the remaining tables are orphaned (harmless, but `migration:generate` would then emit `DROP TABLE` for them).

---

## Verification Steps

1. **Backend builds:** in the repo root (`trip-management/`), `npm run build` → no errors. `dist/modules/trips/entities/trip.entity.js`, `dist/modules/trips/entities/passenger.entity.js` and both migrations' `.js` exist.
2. **Lint:** `npm run lint` → no errors.
3. **Boundaries:** `grep -rn "vehicles.repository\|drivers.repository\|companies\|countries" src/modules/trips` → no output. `grep -rln "modules/trips" src --include=*.ts` → only `src/app.module.ts`. `git diff --stat src/modules/drivers` (or a manual diff) → only `drivers.service.ts`, only the `exists` method added.
4. **No test artifacts:** `nest-cli.json` still has `"generateOptions": { "spec": false }`; no `*.spec.ts` under `src/`.
5. **Database:** `npm run migration:show` → both new migrations pending. `npm run migration:run` → applied. `npm run migration:generate -- src/database/migrations/Check` → "No changes in database schema were found".
6. **Backend runs:** `npm run start:dev` → no `ReferenceError` at boot; logs `Mapped {/api/trips, POST}`, `{/api/trips, GET}`, `{/api/trips/:id, GET}`, `{/api/trips/:id, PATCH}`, `{/api/trips/:id, DELETE}`. `GET /api/docs-json` contains `CreateTripDto`, `CreatePassengerDto` and `TripResponseDto` with a `passengers` array. Run Test Plan steps 1–12.
7. **Regression:** `/api/health`, and list/get on `/api/companies`, `/api/vehicles`, `/api/countries`, `/api/drivers` still return **200**. Creating/updating a driver still works (task 1 only added a method). `npm run migration:revert` twice, then `npm run migration:run` → all succeed.

---

## Done Criteria

**Implemented 2026-10-31.** Verified: build, lint, migrations with no drift, Test Plan steps 1–12, revert/re-run. The code matches the task blocks above except for prettier line-wrapping; `src/` is the source of truth.

- [x] `Trip` (table `trips`) extends `BaseEntity` with `tripName` (nullable `varchar(256)`), `secretCode` (nullable `varchar(50)`), `vehicleId` / `driverId` (uuid, FK `RESTRICT`, indexed), `date` (`date`, indexed), `time` (`time`), `deletedAt`; `@OneToMany` to passengers.
- [x] `Passenger` (table `passengers`) extends `BaseEntity` with `tripId` (FK `CASCADE`), `name`, `identityNumber`, `docType`, `nationality`; `@ManyToOne` to trip; unique `(trip_id, identity_number)`. Relation types use `Relation<>`.
- [x] Both migrations exist; `synchronize` stays `false`; no drift.
- [x] Create requires `vehicleId`, `driverId`, `date` (`YYYY-MM-DD`, real date), `time` (`HH:mm[:ss]`); `tripName` / `secretCode` optional and nullable; PATCH accepts any subset, rejects `null` for required fields and `passengers`; unknown fields (incl. inside passengers) → 400.
- [x] Passengers: required fields and lengths enforced, `identityNumber` digits-only string, no duplicate `identityNumber` per request, max 100 → otherwise 400.
- [x] Unknown or soft-deleted vehicle/driver → 400.
- [x] Trip and passenger writes happen in one transaction; PATCH with `passengers` replaces the list, without it leaves it unchanged.
- [x] Every trip response includes `passengers` sorted by name; `GET /api/trips` is paginated, filters by `vehicleId`, `driverId`, `dateFrom`, `dateTo`, searches `tripName`, orders by date/time desc; `dateFrom > dateTo` → 400.
- [x] Unknown or soft-deleted trip id → 404; non-uuid → 400; DELETE soft-deletes and returns 204.
- [x] `DriversService.exists(id)` added; `TripsModule` uses only `VehiclesService.exists` and `DriversService.exists` from other modules.
- [x] ESM preserved (`.js` suffixes); `npm run build` and `npm run lint` pass; no test files.

**STOP HERE. Report to the user and wait for confirmation before proceeding to Story 09.**
