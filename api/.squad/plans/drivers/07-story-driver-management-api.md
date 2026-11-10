# Story 07 — Add Drivers module with nationality and assigned vehicle

## Prerequisites

- **Story 04 completed:** [../countries/04-story-countries-reference-data-api.md](../countries/04-story-countries-reference-data-api.md). The `countries` table (`drivers.nationality_id` references it) and the public `CountriesService.exists(id)`.
- **Story 06 completed:** [../vehicles/06-story-vehicle-management-api.md](../vehicles/06-story-vehicle-management-api.md). The `vehicles` table (`drivers.vehicle_id` references it), the public `VehiclesService.exists(id)`, and **the pattern to copy** (a CRUD module with a foreign key and a filtered list query).
- **Status: implemented.** This plan was written after the code, from the intake at [../../stories/drivers/add-drivers-module-with-nationality-and-assigned-vehicle/intake.md](../../stories/drivers/add-drivers-module-with-nationality-and-assigned-vehicle/intake.md). The code below matches `src/`. If they ever differ, **`src/` is the source of truth**.
- Local **PostgreSQL ≥ 13** with earlier migrations applied (including `1793422800000-CreateCountriesTable`) is needed for the runtime verification steps only.

---

## Story Goal

Add a `drivers` module under `src/modules/drivers/`.

1. `POST/GET/GET :id/PATCH/DELETE /api/drivers` manage drivers with `name`, `identityId`, `nationalityId` and `vehicleId`. All four are required on create. `DELETE` is a soft delete.
2. `identityId` is unique among non-deleted drivers (409). `nationalityId` must be an existing country and `vehicleId` an existing vehicle, both non-deleted (400).
3. `GET /api/drivers` takes `ListDriversQueryDto` (`page`, `limit`, `search`, `nationalityId`, `vehicleId`) and returns `{ data, meta }`, newest first. Search matches `name` and `identityId`.

**Not in scope:** driver documents, extra columns, nested nationality/vehicle data in responses, one-driver-per-vehicle, an optional vehicle, cascading soft deletes, `DriversService.exists` (the [trips story](../trips/08-story-trip-management-api.md) adds it), authorization, tests. **Do not** change `src/common/`. Outside `src/modules/drivers/`, touch only `app.module.ts`.

**Hard constraints for the executor** (same as Stories 01–06):

- Controller → Service → `DriversRepository` → `BaseRepository` → TypeORM. **No** DDD constructs, **no** new interfaces.
- ESM: every relative import ends in **`.js`**.
- Controllers return `DriverResponseDto`, never the entity. Mapping happens in the **controller**.
- `DriversModule` imports `CountriesModule` and `VehiclesModule` and calls **only** `CountriesService.exists` / `VehiclesService.exists`. **Never** import another module's repository.

---

## Context — Read These Files First

1. `src/modules/vehicles/` — **the pattern to copy**. `vehicles.repository.ts` (`findPaginated` ~line 22 with the `scope` spread into each search branch), `vehicles.service.ts` (`exists` ~line 43, `ensureCompanyExists` → 400, `update` ~line 66), `dto/list-vehicles-query.dto.ts` (extending `BaseListQueryDto` with an optional uuid filter), `entities/vehicle.entity.ts` (`ManyToOne` + `JoinColumn` with `foreignKeyConstraintName`).
2. `src/modules/countries/countries.service.ts` — `exists(id)` ~line 36; `countries.module.ts` exports `CountriesService`.
3. `src/database/migrations/1793419200000-CreateVehiclesTable.ts` — migration with an inline FK constraint; copy the style.
4. `src/common/repositories/base.repository.ts`, `src/common/dto/base-list-query.dto.ts`, `src/common/utils/pagination.util.ts`, `src/common/utils/escape-like.util.ts`.
5. `src/common/filters/all-exceptions.filter.ts` — `23505` → **409** (~lines 65–73).
6. `src/app.module.ts` — `VehiclesModule` (line 23) and `CountriesModule` (line 24) are registered; `DriversModule` goes after them.

---

## Implementation tasks

### 1 — Entity

**Create file: `src/modules/drivers/entities/driver.entity.ts`**

```ts
import {
  Column,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity.js';
import { Country } from '../../countries/entities/country.entity.js';
import { Vehicle } from '../../vehicles/entities/vehicle.entity.js';

@Entity('drivers')
export class Driver extends BaseEntity {
  @Column({ type: 'varchar', length: 256 })
  name: string;

  @Index('UQ_drivers_identity_id', {
    unique: true,
    where: '"deleted_at" IS NULL',
  })
  @Column({ name: 'identity_id', type: 'varchar', length: 50 })
  identityId: string;

  @Index('IDX_drivers_nationality_id')
  @Column({ name: 'nationality_id', type: 'uuid' })
  nationalityId: string;

  @ManyToOne(() => Country, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'nationality_id',
    foreignKeyConstraintName: 'FK_drivers_nationality_id',
  })
  nationality?: Country;

  @Index('IDX_drivers_vehicle_id')
  @Column({ name: 'vehicle_id', type: 'uuid' })
  vehicleId: string;

  @ManyToOne(() => Vehicle, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'vehicle_id',
    foreignKeyConstraintName: 'FK_drivers_vehicle_id',
  })
  vehicle?: Vehicle;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
```

- `identityId` is a **string**: national IDs and iqama numbers can start with `0`, and 10 digits overflow a Postgres `integer`.

### 2 — Migration

**Create file: `src/database/migrations/1793426400000-CreateDriversTable.ts`** — one hour after `CreateCountriesTable` (`1793422800000`). It must sort **after** both tables it references.

```ts
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDriversTable1793426400000 implements MigrationInterface {
  name = 'CreateDriversTable1793426400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "drivers" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "name" character varying(256) NOT NULL,
        "identity_id" character varying(50) NOT NULL,
        "nationality_id" uuid NOT NULL,
        "vehicle_id" uuid NOT NULL,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_92ab3fb69e566d3eb0cae896047" PRIMARY KEY ("id"),
        CONSTRAINT "FK_drivers_nationality_id" FOREIGN KEY ("nationality_id")
          REFERENCES "countries"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "FK_drivers_vehicle_id" FOREIGN KEY ("vehicle_id")
          REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_drivers_identity_id" ON "drivers" ("identity_id") WHERE "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_drivers_nationality_id" ON "drivers" ("nationality_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_drivers_vehicle_id" ON "drivers" ("vehicle_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_drivers_vehicle_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_drivers_nationality_id"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_drivers_identity_id"`);
    await queryRunner.query(`DROP TABLE "drivers"`);
  }
}
```

`PK_92ab3fb69e566d3eb0cae896047` is `"PK_" + sha1("drivers_id").substring(0, 27)`.

### 3 — DTOs

**Create file: `src/modules/drivers/dto/create-driver.dto.ts`**

```ts
import { Transform } from 'class-transformer';
import { IsString, IsUUID, Length } from 'class-validator';

const Trim = () =>
  Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));

export class CreateDriverDto {
  /** @example "Mohammed Ali" */
  @Trim()
  @IsString()
  @Length(2, 256)
  name: string;

  /**
   * National ID or iqama number. Unique among non-deleted drivers.
   * @example "1010101010"
   */
  @Trim()
  @IsString()
  @Length(1, 50)
  identityId: string;

  /**
   * Id of an existing (non-deleted) country.
   * @example "3f2b8c1e-4a5d-4e6f-9a7b-1c2d3e4f5a6b"
   */
  @IsUUID()
  nationalityId: string;

  /**
   * Id of an existing (non-deleted) vehicle.
   * @example "7a6b5c4d-3e2f-4a1b-8c9d-0e1f2a3b4c5d"
   */
  @IsUUID()
  vehicleId: string;
}
```

**Create file: `src/modules/drivers/dto/update-driver.dto.ts`**

```ts
import { PartialType } from '@nestjs/swagger';
import { CreateDriverDto } from './create-driver.dto.js';

// skipNullProperties: false → null is validated (and rejected) instead of reaching the NOT NULL columns.
export class UpdateDriverDto extends PartialType(CreateDriverDto, {
  skipNullProperties: false,
}) {}
```

**Create file: `src/modules/drivers/dto/list-drivers-query.dto.ts`**

```ts
import { IsOptional, IsUUID } from 'class-validator';
import { BaseListQueryDto } from '../../../common/dto/base-list-query.dto.js';

export class ListDriversQueryDto extends BaseListQueryDto {
  /** Only return drivers of this nationality. */
  @IsOptional()
  @IsUUID()
  nationalityId?: string;

  /** Only return drivers assigned to this vehicle. */
  @IsOptional()
  @IsUUID()
  vehicleId?: string;
}
```

**Create file: `src/modules/drivers/dto/driver-response.dto.ts`**

```ts
import type { Driver } from '../entities/driver.entity.js';

export class DriverResponseDto {
  id: string;
  name: string;
  identityId: string;
  nationalityId: string;
  vehicleId: string;
  createdAt: Date;
  updatedAt: Date;

  static fromEntity(driver: Driver): DriverResponseDto {
    return {
      id: driver.id,
      name: driver.name,
      identityId: driver.identityId,
      nationalityId: driver.nationalityId,
      vehicleId: driver.vehicleId,
      createdAt: driver.createdAt,
      updatedAt: driver.updatedAt,
    };
  }
}
```

### 4 — Repository

**Create file: `src/modules/drivers/drivers.repository.ts`**

```ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  EntityManager,
  ILike,
  Repository,
  type FindOptionsWhere,
} from 'typeorm';
import { BaseRepository } from '../../common/repositories/base.repository.js';
import { escapeLike } from '../../common/utils/escape-like.util.js';
import { toSkipTake } from '../../common/utils/pagination.util.js';
import { ListDriversQueryDto } from './dto/list-drivers-query.dto.js';
import { Driver } from './entities/driver.entity.js';

@Injectable()
export class DriversRepository extends BaseRepository<Driver> {
  constructor(@InjectRepository(Driver) repository: Repository<Driver>) {
    super(repository);
  }

  // Searchable columns: name, identityId. nationalityId/vehicleId narrow every branch.
  findPaginated(query: ListDriversQueryDto): Promise<[Driver[], number]> {
    const scope: FindOptionsWhere<Driver> = {
      ...(query.nationalityId && { nationalityId: query.nationalityId }),
      ...(query.vehicleId && { vehicleId: query.vehicleId }),
    };
    const pattern = query.search
      ? ILike(`%${escapeLike(query.search)}%`)
      : undefined;
    return this.findAndCount({
      where: pattern
        ? [
            { ...scope, name: pattern },
            { ...scope, identityId: pattern },
          ]
        : scope,
      order: { createdAt: 'DESC' },
      ...toSkipTake(query),
    });
  }

  async softDelete(id: string, manager?: EntityManager): Promise<void> {
    await this.repositoryFor(manager).softDelete({ id });
  }
}
```

- `scope` holds only the filters that were sent; it is spread into **every** search branch, so `vehicleId` + `search` means "this vehicle **and** (name **or** identity id matches)".

### 5 — Service

**Create file: `src/modules/drivers/drivers.service.ts`**

```ts
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { DeepPartial } from 'typeorm';
import {
  toPaginatedResult,
  type PaginatedResult,
} from '../../common/utils/pagination.util.js';
import { CountriesService } from '../countries/countries.service.js';
import { VehiclesService } from '../vehicles/vehicles.service.js';
import { CreateDriverDto } from './dto/create-driver.dto.js';
import type { ListDriversQueryDto } from './dto/list-drivers-query.dto.js';
import { UpdateDriverDto } from './dto/update-driver.dto.js';
import { DriversRepository } from './drivers.repository.js';
import { Driver } from './entities/driver.entity.js';

@Injectable()
export class DriversService {
  constructor(
    private readonly driversRepository: DriversRepository,
    private readonly countriesService: CountriesService,
    private readonly vehiclesService: VehiclesService,
  ) {}

  async findAll(query: ListDriversQueryDto): Promise<PaginatedResult<Driver>> {
    return toPaginatedResult(
      await this.driversRepository.findPaginated(query),
      query,
    );
  }

  async findOne(id: string): Promise<Driver> {
    const driver = await this.driversRepository.findById(id);
    if (!driver) {
      throw new NotFoundException(`Driver ${id} not found`);
    }
    return driver;
  }

  async create(dto: CreateDriverDto): Promise<Driver> {
    await this.ensureIdentityIdIsAvailable(dto.identityId);
    await this.ensureNationalityExists(dto.nationalityId);
    await this.ensureVehicleExists(dto.vehicleId);
    return this.driversRepository.create(dto);
  }

  async update(id: string, dto: UpdateDriverDto): Promise<Driver> {
    const driver = await this.findOne(id);

    if (dto.identityId !== undefined && dto.identityId !== driver.identityId) {
      await this.ensureIdentityIdIsAvailable(dto.identityId);
    }
    if (
      dto.nationalityId !== undefined &&
      dto.nationalityId !== driver.nationalityId
    ) {
      await this.ensureNationalityExists(dto.nationalityId);
    }
    if (dto.vehicleId !== undefined && dto.vehicleId !== driver.vehicleId) {
      await this.ensureVehicleExists(dto.vehicleId);
    }

    const changes: DeepPartial<Driver> = Object.fromEntries(
      Object.entries(dto).filter(([, value]) => value !== undefined),
    );
    const saved = await this.driversRepository.update(driver.id, changes);
    if (!saved) {
      throw new NotFoundException(`Driver ${id} not found`);
    }
    return saved;
  }

  async remove(id: string): Promise<void> {
    const driver = await this.findOne(id);
    await this.driversRepository.softDelete(driver.id);
  }

  private async ensureIdentityIdIsAvailable(identityId: string): Promise<void> {
    if (await this.driversRepository.exists({ identityId })) {
      throw new ConflictException('Identity id is already in use');
    }
  }

  private async ensureNationalityExists(nationalityId: string): Promise<void> {
    if (!(await this.countriesService.exists(nationalityId))) {
      throw new BadRequestException(`Country ${nationalityId} does not exist`);
    }
  }

  private async ensureVehicleExists(vehicleId: string): Promise<void> {
    if (!(await this.vehiclesService.exists(vehicleId))) {
      throw new BadRequestException(`Vehicle ${vehicleId} does not exist`);
    }
  }
}
```

### 6 — Controller and module

**Create file: `src/modules/drivers/drivers.controller.ts`**

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
import { CreateDriverDto } from './dto/create-driver.dto.js';
import { DriverResponseDto } from './dto/driver-response.dto.js';
import { ListDriversQueryDto } from './dto/list-drivers-query.dto.js';
import { UpdateDriverDto } from './dto/update-driver.dto.js';
import { DriversService } from './drivers.service.js';

// Entities are mapped to response DTOs here; the service returns entities.
@ApiTags('drivers')
@Controller('drivers')
export class DriversController {
  constructor(private readonly driversService: DriversService) {}

  /** Create a driver with an existing nationality and vehicle. */
  @Post()
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.CONFLICT)
  async create(@Body() dto: CreateDriverDto): Promise<DriverResponseDto> {
    return DriverResponseDto.fromEntity(await this.driversService.create(dto));
  }

  /** List drivers, newest first. Search matches name and identity id. */
  @Get()
  @ApiPaginatedResponse(DriverResponseDto)
  @ApiErrorResponses(HttpStatus.BAD_REQUEST)
  async findAll(
    @Query() query: ListDriversQueryDto,
  ): Promise<PaginatedResult<DriverResponseDto>> {
    const result = await this.driversService.findAll(query);
    return { ...result, data: result.data.map(DriverResponseDto.fromEntity) };
  }

  /** Get a driver by id. */
  @Get(':id')
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND)
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<DriverResponseDto> {
    return DriverResponseDto.fromEntity(await this.driversService.findOne(id));
  }

  /** Update a driver. */
  @Patch(':id')
  @ApiErrorResponses(
    HttpStatus.BAD_REQUEST,
    HttpStatus.NOT_FOUND,
    HttpStatus.CONFLICT,
  )
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDriverDto,
  ): Promise<DriverResponseDto> {
    return DriverResponseDto.fromEntity(
      await this.driversService.update(id, dto),
    );
  }

  /** Soft-delete a driver. */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.driversService.remove(id);
  }
}
```

**Create file: `src/modules/drivers/drivers.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CountriesModule } from '../countries/countries.module.js';
import { VehiclesModule } from '../vehicles/vehicles.module.js';
import { DriversController } from './drivers.controller.js';
import { DriversRepository } from './drivers.repository.js';
import { DriversService } from './drivers.service.js';
import { Driver } from './entities/driver.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Driver]),
    CountriesModule,
    VehiclesModule,
  ],
  controllers: [DriversController],
  providers: [DriversService, DriversRepository],
  exports: [DriversService],
})
export class DriversModule {}
```

**File: `src/app.module.ts`** — import `DriversModule` from `./modules/drivers/drivers.module.js` and add it to `imports` after `CountriesModule`.

Final layout:

```text
src/database/migrations/1793426400000-CreateDriversTable.ts
src/modules/drivers/
├── drivers.module.ts
├── drivers.controller.ts
├── drivers.service.ts
├── drivers.repository.ts
├── dto/
│   ├── create-driver.dto.ts
│   ├── update-driver.dto.ts
│   ├── list-drivers-query.dto.ts
│   └── driver-response.dto.ts
└── entities/
    └── driver.entity.ts
```

---

## Edge Cases & Failure Modes

**Fields**

- **Missing, not a string, or out of range after trimming** (`"name": " a "`, `"identityId": "   "`, a 51-character identity id) → **400** (`create-driver.dto.ts`).
- **`nationalityId` or `vehicleId` not a uuid** → **400** (`@IsUUID`).
- **`identityId` sent as a JSON number** (`1010101010`) → **400** (`@IsString`). Clients send it as a string.
- **`null` in PATCH** (`{"vehicleId": null}`) → **400** (`skipNullProperties: false`). Empty PATCH `{}` → **200**.
- **Unknown field** (`phone`, `nationality`) → **400** (`forbidNonWhitelisted`).

**Rules**

- **Unknown or soft-deleted `nationalityId`** → **400** `Country <id> does not exist` (`ensureNationalityExists`).
- **Unknown or soft-deleted `vehicleId`** → **400** `Vehicle <id> does not exist` (`ensureVehicleExists`).
- **Duplicate `identityId`** → **409** `Identity id is already in use`. PATCH with the driver's **own** identity id → no check, **200**.
- **Two concurrent creates with the same identity id** → `UQ_drivers_identity_id` → `23505` → **409** `Resource already exists`.
- **Two drivers on the same vehicle** → allowed. One-driver-per-vehicle is out of scope.
- **Unknown or soft-deleted id** on GET/PATCH/DELETE → **404** `Driver <id> not found`. **Non-UUID id** → **400**.

**List**

- **Invalid query** (`page=0`, `vehicleId=abc`, `nationalityId=1`) → **400**.
- **Filter by an unknown vehicle or country** → `data: []`, not an error.
- **`search` with `%` or `_`** → matched literally (`escapeLike`).

**Relationships**

- **Country or vehicle soft-deleted while drivers use it** → succeeds; drivers keep the id. `ON DELETE RESTRICT` only blocks **hard** deletes (soft delete is an UPDATE). New assignments to the deleted id are rejected with 400.
- **Migration order** → `CreateDriversTable` fails with `relation "countries" does not exist` if Story 04's migration is missing. Run all migrations in order.

---

## Test Plan

No automated tests: the project forbids test files. Verify with manual smoke tests against a running app (`BASE=http://localhost:3000/api`, `$NID` = a seeded country id, `$VID` = an existing vehicle id).

1. **DTO rules without a DB** (after `npm run build`): same script as Story 06 step 1 with `UpdateDriverDto` from `./dist/modules/drivers/dto/update-driver.dto.js`. `{ vehicleId: null }` → `rejected`; `{ name: '  a ' }` → `rejected`; `{ foo: 1 }` → `rejected`; `{}` → `accepted`.
2. **Create:** `curl -i -H "Content-Type: application/json" -d '{"name":"Mohammed Ali","identityId":"1010101010","nationalityId":"'$NID'","vehicleId":"'$VID'"}' $BASE/drivers` → `201`; save `id` as `$DID`. Repeat → `409`.
3. **Bad references:** random uuid as `nationalityId` → `400` (country); random uuid as `vehicleId` → `400` (vehicle).
4. **Validation:** missing `vehicleId` → `400`; `"identityId":1010101010` (number) → `400`; extra `"phone":"05"` → `400`.
5. **List:** `GET $BASE/drivers` → new driver first. `?search=mohammed` → found; `?search=101010` → found. `?vehicleId=$VID` → found; `?vehicleId=$VID&search=nobody` → empty. `?nationalityId=$NID&vehicleId=$VID` → found.
6. **Get:** `GET $BASE/drivers/$DID` → `200`; `/drivers/abc` → `400`; random uuid → `404`.
7. **Update:** `PATCH $DID {"name":"Mohammed A. Ali"}` → `200`. Own `identityId` → `200`. Another driver's identity id → `409`. `{"nationalityId":null}` → `400`. Move to another existing vehicle → `200`.
8. **Delete:** `DELETE $DID` → `204`; GET/PATCH/DELETE → `404`. Re-create with identity id `1010101010` → `201`.

---

## Migration / Rollback

- Schema: `CreateDriversTable` creates `drivers`, two FKs, three indexes. It is the newest migration, so `npm run migration:revert` undoes it first. **Reverting deletes all drivers.**
- Half-applied state: the migration runs in a transaction, so a failure leaves nothing behind.
- Code rollback: revert the commit. No new dependencies or env vars. Revert the migration **before** the code. The trips story depends on this table; revert trips first if it is applied.

---

## Verification Steps

1. **Backend builds:** `npm run build` (in `trip-management/`) → no errors. `dist/modules/drivers/` and `dist/database/migrations/1793426400000-CreateDriversTable.js` exist.
2. **Lint:** `npm run lint` → no errors.
3. **Boundaries:** `grep -rn "countries.repository\|vehicles.repository" src/modules/drivers` → nothing. `grep -rn "drivers.repository" src --include=*.ts` → only files inside `src/modules/drivers/`.
4. **No test artifacts:** no `*.spec.ts` under `src/`.
5. **Database:** `npm run migration:run` → applied after `CreateCountriesTable`. `npm run migration:generate -- src/database/migrations/Check` → "No changes in database schema were found".
6. **Runs:** `npm run start:dev` → logs the five `Mapped {/api/drivers…}` routes. Swagger at `/api/docs` shows the `drivers` tag. Run Test Plan steps 2–8.
7. **Regression:** `/api/vehicles` and `/api/countries` still respond.

---

## Done Criteria

- [x] `Driver` (table `drivers`) extends `BaseEntity` with `name` (varchar 256), `identityId` (`identity_id` varchar 50), `nationalityId`, `vehicleId` (uuid) and `deletedAt`.
- [x] `FK_drivers_nationality_id` → `countries(id)` and `FK_drivers_vehicle_id` → `vehicles(id)`, both `ON DELETE RESTRICT` and indexed; partial unique `UQ_drivers_identity_id`; migration sorts after countries.
- [ ] `migration:generate` reports no drift (needs a database).
- [x] All four fields required on create, trimmed and length-checked; PATCH accepts any subset and rejects `null`; unknown fields → 400.
- [x] Unknown country or vehicle → 400; duplicate identity id → 409; unknown or soft-deleted id → 404; non-uuid → 400; DELETE soft-deletes and returns 204.
- [x] `GET /api/drivers` returns `{ data, meta }`, newest first, searches `name`/`identityId` with escaped `ILike`, filters by `nationalityId` and `vehicleId`.
- [x] All endpoints return `DriverResponseDto`; `DriversModule` exports only `DriversService` and uses only `CountriesService.exists` / `VehiclesService.exists`.
- [x] ESM preserved (`.js` suffixes); `npm run build` and `npm run lint` pass; no test files.
- [ ] Test Plan steps 2–8 run against a database.

**STOP HERE. Report to the user and wait for confirmation before proceeding to the next story.**
