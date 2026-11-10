# Story 06 — Add Vehicles module to register company vehicles with unique plate numbers

## Prerequisites

- **Story 01 completed:** [../project-structure/01-story-restructure-project-as-clean-modular-monolith-no-ddd-no-test-files.md](../project-structure/01-story-restructure-project-as-clean-modular-monolith-no-ddd-no-test-files.md). Config, `DatabaseModule`, `AllExceptionsFilter`, global `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform`).
- **Story 03 completed:** [../companies/03-story-company-management-api.md](../companies/03-story-company-management-api.md). It created the crud-foundation pieces this story reuses (`BaseRepository`, `BaseListQueryDto`, `PaginatedResult`/`toSkipTake`/`toPaginatedResult`, `escapeLike`) and the `companies` table that `vehicles.company_id` references. **Do not recreate them.**
- **Status: implemented.** This plan was written after the code, from the intake at [../../stories/vehicles/add-vehicles-module-to-register-company-vehicles-with-unique-plate-numbers/intake.md](../../stories/vehicles/add-vehicles-module-to-register-company-vehicles-with-unique-plate-numbers/intake.md). The code below matches `src/`. If they ever differ, **`src/` is the source of truth**.
- **Execution order note:** `NN` 06 continues the global sequence, but the vehicles migration (`1793419200000`) runs **before** countries (`1793422800000`, Story 04) and drivers (`1793426400000`, Story 07).
- Local **PostgreSQL ≥ 13** with earlier migrations applied is needed for the runtime verification steps only.

---

## Story Goal

Add a `vehicles` module under `src/modules/vehicles/`.

1. `POST/GET/GET :id/PATCH/DELETE /api/vehicles` manage vehicles with `plateNumber`, `model`, `type` and `companyId`. All four are required on create. `DELETE` is a soft delete.
2. `plateNumber` is unique among non-deleted vehicles (409). `companyId` must be an existing, non-deleted company (400).
3. `GET /api/vehicles` takes `ListVehiclesQueryDto` (`page`, `limit`, `search`, `companyId`) and returns `{ data, meta }`, newest first. Search matches `plateNumber`, `model` and `type`.
4. `VehiclesService.exists(id)` lets other modules (drivers, trips) check a vehicle id. `CompaniesService.exists(id)` is added for the company check.

**Not in scope:** vehicle documents, extra columns, plate normalization, blocking/cascading on company soft delete, nested company data in responses, authorization, tests. **Do not** change `src/common/`. Outside `src/modules/vehicles/`, touch only `companies.service.ts` (add `exists`) and `app.module.ts`.

**Hard constraints for the executor** (same as Stories 01–04):

- Controller → Service → `VehiclesRepository` → `BaseRepository` → TypeORM. **No** DDD constructs, **no** new interfaces, **no** generic base service.
- ESM: every relative import ends in **`.js`**.
- Constructor-injected classes are **value imports**.
- Controllers return `VehicleResponseDto` (or `PaginatedResult<VehicleResponseDto>`), never the entity. Mapping happens in the **controller**.
- A module never imports another module's repository; it imports the module and calls its **service** (`CompaniesService.exists`).

---

## Context — Read These Files First

1. `src/modules/companies/` — **the pattern to copy**. `companies.repository.ts` (`findPaginated` ~line 17, `softDelete` ~line 34), `companies.service.ts` (`findOne` → 404, `update` drops `undefined` with `Object.fromEntries` ~line 90), `companies.controller.ts` (decorators, mapping), `dto/update-company.dto.ts` (`skipNullProperties: false`).
2. `src/modules/countries/countries.service.ts` — `exists(id)` ~line 36, the one-line public existence check this story copies into `CompaniesService` and `VehiclesService`.
3. `src/common/repositories/base.repository.ts` — `create`, `findById`, `findAndCount`, `update` (returns `null` when missing), `exists`, protected `repositoryFor(manager)`.
4. `src/common/dto/base-list-query.dto.ts`, `src/common/utils/pagination.util.ts`, `src/common/utils/escape-like.util.ts`.
5. `src/common/decorators/api-error-responses.decorator.ts`, `api-paginated-response.decorator.ts` — Swagger decorators used by every controller.
6. `src/database/migrations/1793415600000-CreateCompaniesTable.ts` — hand-written migration style.
7. `src/common/filters/all-exceptions.filter.ts` — `PG_UNIQUE_VIOLATION` (`23505`, line 18) → **409** `Resource already exists` (~lines 65–73).

---

## Implementation tasks

### 1 — Entity

**Create file: `src/modules/vehicles/entities/vehicle.entity.ts`**

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
import { Company } from '../../companies/entities/company.entity.js';

@Entity('vehicles')
export class Vehicle extends BaseEntity {
  @Index('UQ_vehicles_plate_number', {
    unique: true,
    where: '"deleted_at" IS NULL',
  })
  @Column({ name: 'plate_number', type: 'varchar', length: 50 })
  plateNumber: string;

  @Column({ type: 'varchar', length: 256 })
  model: string;

  @Column({ type: 'varchar', length: 256 })
  type: string;

  @Index('IDX_vehicles_company_id')
  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @ManyToOne(() => Company, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'company_id',
    foreignKeyConstraintName: 'FK_vehicles_company_id',
  })
  company?: Company;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
```

- `companyId` is a plain column **and** the join column of the `company` relation, so services and DTOs work with the id and never load the company.
- `company` is optional (`?`) and never selected; it only exists so TypeORM knows the FK (name, target, `RESTRICT`).

### 2 — Migration

**Create file: `src/database/migrations/1793419200000-CreateVehiclesTable.ts`** — one hour after `CreateCompaniesTable` (`1793415600000`).

```ts
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateVehiclesTable1793419200000 implements MigrationInterface {
  name = 'CreateVehiclesTable1793419200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "vehicles" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "plate_number" character varying(50) NOT NULL,
        "model" character varying(256) NOT NULL,
        "type" character varying(256) NOT NULL,
        "company_id" uuid NOT NULL,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_18d8646b59304dce4af3a9e35b6" PRIMARY KEY ("id"),
        CONSTRAINT "FK_vehicles_company_id" FOREIGN KEY ("company_id")
          REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_vehicles_plate_number" ON "vehicles" ("plate_number") WHERE "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_vehicles_company_id" ON "vehicles" ("company_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_vehicles_company_id"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_vehicles_plate_number"`);
    await queryRunner.query(`DROP TABLE "vehicles"`);
  }
}
```

`PK_18d8646b59304dce4af3a9e35b6` is `"PK_" + sha1("vehicles_id").substring(0, 27)` (TypeORM `DefaultNamingStrategy.primaryKeyName`), so `migration:generate` sees no drift.

### 3 — DTOs

**Create file: `src/modules/vehicles/dto/create-vehicle.dto.ts`**

```ts
import { Transform } from 'class-transformer';
import { IsString, IsUUID, Length } from 'class-validator';

const Trim = () =>
  Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));

export class CreateVehicleDto {
  /**
   * Unique among non-deleted vehicles.
   * @example "ABC 1234"
   */
  @Trim()
  @IsString()
  @Length(1, 50)
  plateNumber: string;

  /** @example "Toyota Hiace 2024" */
  @Trim()
  @IsString()
  @Length(1, 256)
  model: string;

  /** @example "Bus" */
  @Trim()
  @IsString()
  @Length(1, 256)
  type: string;

  /**
   * Id of an existing (non-deleted) company.
   * @example "3f2b8c1e-4a5d-4e6f-9a7b-1c2d3e4f5a6b"
   */
  @IsUUID()
  companyId: string;
}
```

**Create file: `src/modules/vehicles/dto/update-vehicle.dto.ts`**

```ts
import { PartialType } from '@nestjs/swagger';
import { CreateVehicleDto } from './create-vehicle.dto.js';

// skipNullProperties: false → null is validated (and rejected) instead of reaching the NOT NULL columns.
export class UpdateVehicleDto extends PartialType(CreateVehicleDto, {
  skipNullProperties: false,
}) {}
```

Without the option, `{"plateNumber": null}` skips validation, survives the `!== undefined` filter in the service, and fails at the DB with a NOT NULL violation → **500**.

**Create file: `src/modules/vehicles/dto/list-vehicles-query.dto.ts`**

```ts
import { IsOptional, IsUUID } from 'class-validator';
import { BaseListQueryDto } from '../../../common/dto/base-list-query.dto.js';

export class ListVehiclesQueryDto extends BaseListQueryDto {
  /** Only return vehicles of this company. */
  @IsOptional()
  @IsUUID()
  companyId?: string;
}
```

**Create file: `src/modules/vehicles/dto/vehicle-response.dto.ts`**

```ts
import type { Vehicle } from '../entities/vehicle.entity.js';

export class VehicleResponseDto {
  id: string;
  plateNumber: string;
  model: string;
  type: string;
  companyId: string;
  createdAt: Date;
  updatedAt: Date;

  static fromEntity(vehicle: Vehicle): VehicleResponseDto {
    return {
      id: vehicle.id,
      plateNumber: vehicle.plateNumber,
      model: vehicle.model,
      type: vehicle.type,
      companyId: vehicle.companyId,
      createdAt: vehicle.createdAt,
      updatedAt: vehicle.updatedAt,
    };
  }
}
```

### 4 — Repository

**Create file: `src/modules/vehicles/vehicles.repository.ts`**

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
import { ListVehiclesQueryDto } from './dto/list-vehicles-query.dto.js';
import { Vehicle } from './entities/vehicle.entity.js';

@Injectable()
export class VehiclesRepository extends BaseRepository<Vehicle> {
  constructor(@InjectRepository(Vehicle) repository: Repository<Vehicle>) {
    super(repository);
  }

  // Searchable columns: plateNumber, model, type. companyId narrows every branch.
  findPaginated(query: ListVehiclesQueryDto): Promise<[Vehicle[], number]> {
    const scope: FindOptionsWhere<Vehicle> = query.companyId
      ? { companyId: query.companyId }
      : {};
    const pattern = query.search
      ? ILike(`%${escapeLike(query.search)}%`)
      : undefined;
    return this.findAndCount({
      where: pattern
        ? [
            { ...scope, plateNumber: pattern },
            { ...scope, model: pattern },
            { ...scope, type: pattern },
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

- `scope` is spread into **every** `OR` branch. Putting `companyId` only beside the array would not filter the search branches.
- `find*` skips soft-deleted rows automatically. **Do not** pass `withDeleted: true`.

### 5 — Service

**File: `src/modules/companies/companies.service.ts`** — add after `findOne`:

```ts
  exists(id: string): Promise<boolean> {
    return this.companiesRepository.exists({ id });
  }
```

**Create file: `src/modules/vehicles/vehicles.service.ts`**

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
import { CompaniesService } from '../companies/companies.service.js';
import { CreateVehicleDto } from './dto/create-vehicle.dto.js';
import type { ListVehiclesQueryDto } from './dto/list-vehicles-query.dto.js';
import { UpdateVehicleDto } from './dto/update-vehicle.dto.js';
import { Vehicle } from './entities/vehicle.entity.js';
import { VehiclesRepository } from './vehicles.repository.js';

@Injectable()
export class VehiclesService {
  constructor(
    private readonly vehiclesRepository: VehiclesRepository,
    private readonly companiesService: CompaniesService,
  ) {}

  async findAll(
    query: ListVehiclesQueryDto,
  ): Promise<PaginatedResult<Vehicle>> {
    return toPaginatedResult(
      await this.vehiclesRepository.findPaginated(query),
      query,
    );
  }

  async findOne(id: string): Promise<Vehicle> {
    const vehicle = await this.vehiclesRepository.findById(id);
    if (!vehicle) {
      throw new NotFoundException(`Vehicle ${id} not found`);
    }
    return vehicle;
  }

  exists(id: string): Promise<boolean> {
    return this.vehiclesRepository.exists({ id });
  }

  async create(dto: CreateVehicleDto): Promise<Vehicle> {
    await this.ensurePlateNumberIsAvailable(dto.plateNumber);
    await this.ensureCompanyExists(dto.companyId);
    return this.vehiclesRepository.create(dto);
  }

  async update(id: string, dto: UpdateVehicleDto): Promise<Vehicle> {
    const vehicle = await this.findOne(id);

    if (
      dto.plateNumber !== undefined &&
      dto.plateNumber !== vehicle.plateNumber
    ) {
      await this.ensurePlateNumberIsAvailable(dto.plateNumber);
    }
    if (dto.companyId !== undefined && dto.companyId !== vehicle.companyId) {
      await this.ensureCompanyExists(dto.companyId);
    }

    const changes: DeepPartial<Vehicle> = Object.fromEntries(
      Object.entries(dto).filter(([, value]) => value !== undefined),
    );
    const saved = await this.vehiclesRepository.update(vehicle.id, changes);
    if (!saved) {
      throw new NotFoundException(`Vehicle ${id} not found`);
    }
    return saved;
  }

  async remove(id: string): Promise<void> {
    const vehicle = await this.findOne(id);
    await this.vehiclesRepository.softDelete(vehicle.id);
  }

  private async ensurePlateNumberIsAvailable(
    plateNumber: string,
  ): Promise<void> {
    if (await this.vehiclesRepository.exists({ plateNumber })) {
      throw new ConflictException('Plate number is already in use');
    }
  }

  private async ensureCompanyExists(companyId: string): Promise<void> {
    if (!(await this.companiesService.exists(companyId))) {
      throw new BadRequestException(`Company ${companyId} does not exist`);
    }
  }
}
```

- A bad `companyId` is a **400** (the request body is wrong), not a 404 (the URL resource exists).
- Checks on update run **only when the value changes**, so PATCH with the vehicle's own plate number succeeds.

### 6 — Controller and module

**Create file: `src/modules/vehicles/vehicles.controller.ts`**

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
import { CreateVehicleDto } from './dto/create-vehicle.dto.js';
import { ListVehiclesQueryDto } from './dto/list-vehicles-query.dto.js';
import { UpdateVehicleDto } from './dto/update-vehicle.dto.js';
import { VehicleResponseDto } from './dto/vehicle-response.dto.js';
import { VehiclesService } from './vehicles.service.js';

// Entities are mapped to response DTOs here; the service returns entities.
@ApiTags('vehicles')
@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  /** Create a vehicle for an existing company. */
  @Post()
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.CONFLICT)
  async create(@Body() dto: CreateVehicleDto): Promise<VehicleResponseDto> {
    return VehicleResponseDto.fromEntity(
      await this.vehiclesService.create(dto),
    );
  }

  /** List vehicles, newest first. Search matches plate number, model and type. */
  @Get()
  @ApiPaginatedResponse(VehicleResponseDto)
  @ApiErrorResponses(HttpStatus.BAD_REQUEST)
  async findAll(
    @Query() query: ListVehiclesQueryDto,
  ): Promise<PaginatedResult<VehicleResponseDto>> {
    const result = await this.vehiclesService.findAll(query);
    return { ...result, data: result.data.map(VehicleResponseDto.fromEntity) };
  }

  /** Get a vehicle by id. */
  @Get(':id')
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND)
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<VehicleResponseDto> {
    return VehicleResponseDto.fromEntity(
      await this.vehiclesService.findOne(id),
    );
  }

  /** Update a vehicle. */
  @Patch(':id')
  @ApiErrorResponses(
    HttpStatus.BAD_REQUEST,
    HttpStatus.NOT_FOUND,
    HttpStatus.CONFLICT,
  )
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVehicleDto,
  ): Promise<VehicleResponseDto> {
    return VehicleResponseDto.fromEntity(
      await this.vehiclesService.update(id, dto),
    );
  }

  /** Soft-delete a vehicle. */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.vehiclesService.remove(id);
  }
}
```

**Create file: `src/modules/vehicles/vehicles.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompaniesModule } from '../companies/companies.module.js';
import { Vehicle } from './entities/vehicle.entity.js';
import { VehiclesController } from './vehicles.controller.js';
import { VehiclesRepository } from './vehicles.repository.js';
import { VehiclesService } from './vehicles.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Vehicle]), CompaniesModule],
  controllers: [VehiclesController],
  providers: [VehiclesService, VehiclesRepository],
  exports: [VehiclesService],
})
export class VehiclesModule {}
```

**File: `src/app.module.ts`** — import `VehiclesModule` from `./modules/vehicles/vehicles.module.js` and add it to `imports` after `CompaniesModule`.

Final layout:

```text
src/database/migrations/1793419200000-CreateVehiclesTable.ts
src/modules/vehicles/
├── vehicles.module.ts
├── vehicles.controller.ts
├── vehicles.service.ts
├── vehicles.repository.ts
├── dto/
│   ├── create-vehicle.dto.ts
│   ├── update-vehicle.dto.ts
│   ├── list-vehicles-query.dto.ts
│   └── vehicle-response.dto.ts
└── entities/
    └── vehicle.entity.ts
```

---

## Edge Cases & Failure Modes

**Fields**

- **Missing, not a string, or out of range after trimming** (`"plateNumber": "   "`, a 51-character plate, `"model": ""`) → **400**. Trimming runs first (`create-vehicle.dto.ts`, `Trim`).
- **`companyId` not a uuid** → **400** (`@IsUUID`).
- **`null` in PATCH** (`{"model": null}`) → **400** (`skipNullProperties: false` in `update-vehicle.dto.ts`). Empty PATCH `{}` → **200**, nothing changes.
- **Unknown field** (`id`, `deletedAt`, `company`) → **400** (`forbidNonWhitelisted`).

**Rules**

- **Unknown or soft-deleted `companyId`** → **400** `Company <id> does not exist` (`VehiclesService.ensureCompanyExists`; `CompaniesService.exists` skips deleted rows).
- **Duplicate `plateNumber`** → **409** `Plate number is already in use` (`ensurePlateNumberIsAvailable`). Comparison is exact after trim: `ABC 123` and `abc123` are different plates.
- **Two concurrent creates with the same plate** → the second insert hits `UQ_vehicles_plate_number` → `23505` → **409** `Resource already exists` (`AllExceptionsFilter`).
- **Soft-deleted vehicle's plate** → can be reused (partial index; `exists` skips deleted rows).
- **Unknown or soft-deleted id** on GET/PATCH/DELETE → **404** `Vehicle <id> not found`. **Non-UUID id** → **400** (`ParseUUIDPipe`).

**List**

- **Invalid query** (`page=0`, `limit=101`, `companyId=abc`, `search=" "`) → **400**.
- **`companyId` of an unknown company** → `data: []`, not an error (it is a filter, not a reference).
- **`search` with `%` or `_`** → matched literally (`escapeLike`).

**Relationships**

- **Company soft-deleted while it has vehicles** → succeeds; vehicles keep pointing to it. `FK_vehicles_company_id … ON DELETE RESTRICT` only blocks a **hard** delete. New vehicles cannot use that company.
- **Vehicle soft-deleted while drivers use it** → succeeds; drivers keep their `vehicleId` (Story 07). Blocking or cascading is out of scope.

---

## Test Plan

No automated tests: the project forbids test files. Verify with manual smoke tests against a running app (`BASE=http://localhost:3000/api`, `$CID` = an existing company id).

1. **DTO rules without a DB** (after `npm run build`):

   ```bash
   node --input-type=module -e "
   import 'reflect-metadata';
   const { plainToInstance } = await import('class-transformer');
   const { validate } = await import('class-validator');
   const { UpdateVehicleDto } = await import('./dist/modules/vehicles/dto/update-vehicle.dto.js');
   const errs = await validate(plainToInstance(UpdateVehicleDto, { plateNumber: null }), { whitelist: true, forbidNonWhitelisted: true });
   console.log(errs.length ? 'rejected' : 'accepted');"
   ```

   → `rejected`. Same check for `{}` → `accepted`; `{ model: 'Hiace' }` → `accepted`.
2. **Create:** `curl -i -H "Content-Type: application/json" -d '{"plateNumber":"ABC 1234","model":"Toyota Hiace","type":"Bus","companyId":"'$CID'"}' $BASE/vehicles` → `201`; save `id` as `$VID`. Repeat → `409`.
3. **Bad company:** same body with a random uuid as `companyId` → `400`; `"companyId":"abc"` → `400`.
4. **Validation:** missing `type` → `400`; `"plateNumber":"   "` → `400`; extra `"color":"red"` → `400`.
5. **List:** `GET $BASE/vehicles` → `{ data, meta }` with the new vehicle first. `?search=hiace` → found. `?search=%25` → `total: 0`. `?companyId=$CID&search=bus` → found; `?companyId=<other company>&search=bus` → not found.
6. **Get:** `GET $BASE/vehicles/$VID` → `200`; `/vehicles/abc` → `400`; random uuid → `404`.
7. **Update:** `PATCH $VID {"model":"Toyota Coaster"}` → `200`. `{"plateNumber":"ABC 1234"}` (own plate) → `200`. Another vehicle's plate → `409`. `{"type":null}` → `400`.
8. **Delete:** `DELETE $VID` → `204`; GET/PATCH/DELETE → `404`. Re-create `ABC 1234` → `201`.

---

## Migration / Rollback

- Schema: `CreateVehiclesTable` creates `vehicles`, the FK and two indexes. `npm run migration:revert` undoes it, **after** reverting `CreateDriversTable` (FK to `vehicles`) and `CreateCountriesTable` (newer timestamp). TypeORM reverts newest first, so this happens naturally. **Reverting deletes all vehicles.**
- Half-applied state: the migration runs in a transaction, so a failure leaves nothing behind.
- Code rollback: revert the commit (including `CompaniesService.exists`). No new dependencies or env vars. Revert the migration **before** the code.

---

## Verification Steps

1. **Backend builds:** `npm run build` (in `trip-management/`) → no errors. `dist/modules/vehicles/` and `dist/database/migrations/1793419200000-CreateVehiclesTable.js` exist.
2. **Lint:** `npm run lint` → no errors.
3. **Boundaries:** `grep -rn "vehicles.repository" src --include=*.ts` → only files inside `src/modules/vehicles/`. `grep -rn "companies.repository" src/modules/vehicles` → nothing.
4. **No test artifacts:** no `*.spec.ts` under `src/`.
5. **Database:** `npm run migration:run` → applied. `npm run migration:generate -- src/database/migrations/Check` → "No changes in database schema were found". If it emits SQL, delete the generated file and align the hand-written migration.
6. **Runs:** `npm run start:dev` → logs `Mapped {/api/vehicles, POST}`, `{/api/vehicles, GET}`, `{/api/vehicles/:id, GET}`, `{/api/vehicles/:id, PATCH}`, `{/api/vehicles/:id, DELETE}`. Swagger at `/api/docs` shows the `vehicles` tag. Run Test Plan steps 2–8.
7. **Regression:** `/api/health` and `/api/companies` still respond.

---

## Done Criteria

- [x] `Vehicle` (table `vehicles`) extends `BaseEntity` with `plateNumber` (`plate_number` varchar 50), `model`, `type` (varchar 256), `companyId` (`company_id` uuid) and `deletedAt`.
- [x] `FK_vehicles_company_id` → `companies(id)` `ON DELETE RESTRICT`; `IDX_vehicles_company_id`; partial unique `UQ_vehicles_plate_number`; migration exists; `synchronize` stays `false`.
- [ ] `migration:generate` reports no drift (needs a database).
- [x] All four fields required on create, trimmed and length-checked; PATCH accepts any subset and rejects `null`; unknown fields → 400.
- [x] Unknown company → 400; duplicate plate → 409; unknown or soft-deleted id → 404; non-uuid → 400; DELETE soft-deletes and returns 204.
- [x] `GET /api/vehicles` returns `{ data, meta }`, newest first, searches `plateNumber`/`model`/`type` with escaped `ILike`, filters by `companyId`.
- [x] All endpoints return `VehicleResponseDto`; `VehiclesModule` exports only `VehiclesService`; `VehiclesService.exists` and `CompaniesService.exists` are public.
- [x] ESM preserved (`.js` suffixes); `npm run build` and `npm run lint` pass; no test files.
- [ ] Test Plan steps 2–8 run against a database.

**STOP HERE. Report to the user and wait for confirmation before proceeding to Story 07.**
