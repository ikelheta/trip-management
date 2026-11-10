# Story 04 — Add Countries module with Arabic and English names and a seeder for all countries

## Prerequisites

- **Story 01 completed:** [../project-structure/01-story-restructure-project-as-clean-modular-monolith-no-ddd-no-test-files.md](../project-structure/01-story-restructure-project-as-clean-modular-monolith-no-ddd-no-test-files.md). Config, `DatabaseModule`, `data-source.ts`, `AllExceptionsFilter`, global `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform`, `exposeUnsetFields: false`).
- **Story 03 completed:** [../companies/03-story-company-management-api.md](../companies/03-story-company-management-api.md). It created the crud-foundation pieces this story reuses: `BaseRepository`, `BaseListQueryDto`, `PaginatedResult`/`toSkipTake`/`toPaginatedResult`, `escapeLike`, and the response-DTO-in-controller convention. **Do not recreate them.**
- **Status: implemented.** The code below matches `src/`. If they ever differ, **`src/` is the source of truth**.
- Local **PostgreSQL ≥ 13** with earlier migrations applied is needed for the runtime verification steps and the seeder only.

---

## Story Goal

Add a `countries` module under `src/modules/countries/` and the project's first seeder.

1. `POST/GET/GET :id/PATCH/DELETE /api/countries` manage countries with `nameAr` and `nameEn`. Each is a required, trimmed string of 2–256 characters, unique among non-deleted countries (409 on duplicates). `DELETE` is a soft delete.
2. `GET /api/countries` takes `BaseListQueryDto` (`page`, `limit`, `search`) and returns `{ data, meta }`, newest first. Search matches `nameAr` and `nameEn`.
3. `CountriesService.exists(id)` lets other modules (drivers) check a country id.
4. `npm run seed` inserts all 249 ISO 3166-1 countries. It is idempotent and does not resurrect soft-deleted countries.

**Not in scope:** ISO/phone codes, flags, extra columns, case- or diacritic-insensitive uniqueness, cities, blocking deletion of a country used by drivers, a generic seeding framework, authorization, tests. **Do not** change `src/common/` or other modules (except registering the module in `app.module.ts`).

**Hard constraints for the executor** (same as Stories 01–03):

- Controller → Service → `CountriesRepository` → `BaseRepository` → TypeORM. **No** DDD constructs, **no** new interfaces, **no** generic base service.
- ESM: every relative import ends in **`.js`**.
- Constructor-injected classes (`CountriesRepository`, `CountriesService`, `Repository`) are **value imports**.
- Controllers return `CountryResponseDto` (or `PaginatedResult<CountryResponseDto>`), never the entity. Mapping happens in the **controller**.

---

## Context — Read These Files First

1. `src/modules/companies/` — **the pattern to copy**. `companies.repository.ts` (`findPaginated`, `softDelete`), `companies.service.ts` (`findOne` → 404, `exists`, `ensureRegistrationNumberIsAvailable` → 409, `update` drops `undefined` with `Object.fromEntries`), `companies.controller.ts` (decorators, mapping), `dto/update-company.dto.ts` (`skipNullProperties: false`).
2. `src/common/repositories/base.repository.ts` — `create`, `findById`, `findAndCount`, `update` (returns `null` when missing), `exists`, protected `repositoryFor(manager)`.
3. `src/common/dto/base-list-query.dto.ts`, `src/common/utils/pagination.util.ts`, `src/common/utils/escape-like.util.ts`.
4. `src/common/decorators/api-error-responses.decorator.ts`, `api-paginated-response.decorator.ts` — Swagger decorators used by every controller.
5. `src/common/entities/base.entity.ts` — `id` (uuid), `createdAt`, `updatedAt`.
6. `src/database/migrations/1793415600000-CreateCompaniesTable.ts` — hand-written migration style.
7. `src/database/data-source.ts` — loads `.env`, validates env, exports the `DataSource` the CLI uses. The seeder reuses it.
8. `src/common/filters/all-exceptions.filter.ts` — `23505` → **409** `Resource already exists`.
9. `node_modules/@nestjs/mapped-types/dist/partial-type.helper.js` — `skipNullProperties === false` applies `ValidateIf(value !== undefined)` instead of `IsOptional()`, so `null` is validated.

---

## Implementation tasks

### 1 — Entity

**Create file: `src/modules/countries/entities/country.entity.ts`**

```ts
import { Column, DeleteDateColumn, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity.js';

@Entity('countries')
export class Country extends BaseEntity {
  @Index('UQ_countries_name_ar', {
    unique: true,
    where: '"deleted_at" IS NULL',
  })
  @Column({ name: 'name_ar', type: 'varchar', length: 256 })
  nameAr: string;

  @Index('UQ_countries_name_en', {
    unique: true,
    where: '"deleted_at" IS NULL',
  })
  @Column({ name: 'name_en', type: 'varchar', length: 256 })
  nameEn: string;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
```

### 2 — Migration

**Create file: `src/database/migrations/1793422800000-CreateCountriesTable.ts`** — timestamp is one hour after `CreateVehiclesTable` (`1793419200000`). `CreateDriversTable` (`1793426400000`) comes after it and has a FK to `countries`.

```ts
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCountriesTable1793422800000 implements MigrationInterface {
  name = 'CreateCountriesTable1793422800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "countries" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "name_ar" character varying(256) NOT NULL,
        "name_en" character varying(256) NOT NULL,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_b2d7006793e8697ab3ae2deff18" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_countries_name_ar" ON "countries" ("name_ar") WHERE "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_countries_name_en" ON "countries" ("name_en") WHERE "deleted_at" IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."UQ_countries_name_en"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_countries_name_ar"`);
    await queryRunner.query(`DROP TABLE "countries"`);
  }
}
```

`PK_b2d7006793e8697ab3ae2deff18` is `"PK_" + sha1("countries_id").substring(0, 27)` (TypeORM `DefaultNamingStrategy.primaryKeyName`). Check: the same formula gives `PK_d4bc3e82a314fa9e29f652c2c22` for `companies_id`, which matches Story 03.

### 3 — DTOs

**Create file: `src/modules/countries/dto/create-country.dto.ts`**

```ts
import { Transform } from 'class-transformer';
import { IsString, Length } from 'class-validator';

const Trim = () =>
  Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));

export class CreateCountryDto {
  /**
   * Arabic name. Unique among non-deleted countries.
   * @example "المملكة العربية السعودية"
   */
  @Trim()
  @IsString()
  @Length(2, 256)
  nameAr: string;

  /**
   * English name. Unique among non-deleted countries.
   * @example "Saudi Arabia"
   */
  @Trim()
  @IsString()
  @Length(2, 256)
  nameEn: string;
}
```

The JSDoc `@example` tags feed Swagger through the `introspectComments` plugin option in `nest-cli.json`.

**Create file: `src/modules/countries/dto/update-country.dto.ts`**

```ts
import { PartialType } from '@nestjs/swagger';
import { CreateCountryDto } from './create-country.dto.js';

// skipNullProperties: false → null is validated (and rejected) instead of reaching the NOT NULL columns.
export class UpdateCountryDto extends PartialType(CreateCountryDto, {
  skipNullProperties: false,
}) {}
```

Without the option, `{"nameAr": null}` skips validation, survives the `!== undefined` filter in the service, and fails at the DB with a NOT NULL violation → **500**.

**Create file: `src/modules/countries/dto/country-response.dto.ts`**

```ts
import type { Country } from '../entities/country.entity.js';

export class CountryResponseDto {
  id: string;
  nameAr: string;
  nameEn: string;
  createdAt: Date;
  updatedAt: Date;

  static fromEntity(country: Country): CountryResponseDto {
    return {
      id: country.id,
      nameAr: country.nameAr,
      nameEn: country.nameEn,
      createdAt: country.createdAt,
      updatedAt: country.updatedAt,
    };
  }
}
```

No list query DTO: the list has no module-specific filters, so the controller takes `BaseListQueryDto` directly.

### 4 — Repository

**Create file: `src/modules/countries/countries.repository.ts`**

```ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, ILike, Repository } from 'typeorm';
import { BaseListQueryDto } from '../../common/dto/base-list-query.dto.js';
import { BaseRepository } from '../../common/repositories/base.repository.js';
import { escapeLike } from '../../common/utils/escape-like.util.js';
import { toSkipTake } from '../../common/utils/pagination.util.js';
import { Country } from './entities/country.entity.js';

@Injectable()
export class CountriesRepository extends BaseRepository<Country> {
  constructor(@InjectRepository(Country) repository: Repository<Country>) {
    super(repository);
  }

  // Searchable columns: nameAr, nameEn. Seeded rows share created_at, so id keeps pages stable.
  findPaginated(query: BaseListQueryDto): Promise<[Country[], number]> {
    const pattern = query.search
      ? ILike(`%${escapeLike(query.search)}%`)
      : undefined;
    return this.findAndCount({
      where: pattern ? [{ nameAr: pattern }, { nameEn: pattern }] : {},
      order: { createdAt: 'DESC', id: 'DESC' },
      ...toSkipTake(query),
    });
  }

  async softDelete(id: string, manager?: EntityManager): Promise<void> {
    await this.repositoryFor(manager).softDelete({ id });
  }
}
```

- Default sort is `createdAt DESC` (crud-foundation §9). The `id` tie-breaker matters here: the seeder inserts 249 rows in one transaction, so they all get the same `created_at`, and PostgreSQL does not guarantee a stable order between equal keys, so pages could repeat or skip rows.
- `find*` skips soft-deleted rows automatically. **Do not** pass `withDeleted: true`.

### 5 — Service

**Create file: `src/modules/countries/countries.service.ts`**

```ts
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { DeepPartial } from 'typeorm';
import type { BaseListQueryDto } from '../../common/dto/base-list-query.dto.js';
import {
  toPaginatedResult,
  type PaginatedResult,
} from '../../common/utils/pagination.util.js';
import { CountriesRepository } from './countries.repository.js';
import { CreateCountryDto } from './dto/create-country.dto.js';
import { UpdateCountryDto } from './dto/update-country.dto.js';
import { Country } from './entities/country.entity.js';

@Injectable()
export class CountriesService {
  constructor(private readonly countriesRepository: CountriesRepository) {}

  async findAll(query: BaseListQueryDto): Promise<PaginatedResult<Country>> {
    return toPaginatedResult(
      await this.countriesRepository.findPaginated(query),
      query,
    );
  }

  async findOne(id: string): Promise<Country> {
    const country = await this.countriesRepository.findById(id);
    if (!country) {
      throw new NotFoundException(`Country ${id} not found`);
    }
    return country;
  }

  exists(id: string): Promise<boolean> {
    return this.countriesRepository.exists({ id });
  }

  async create(dto: CreateCountryDto): Promise<Country> {
    await this.ensureNameArIsAvailable(dto.nameAr);
    await this.ensureNameEnIsAvailable(dto.nameEn);
    return this.countriesRepository.create(dto);
  }

  async update(id: string, dto: UpdateCountryDto): Promise<Country> {
    const country = await this.findOne(id);

    if (dto.nameAr !== undefined && dto.nameAr !== country.nameAr) {
      await this.ensureNameArIsAvailable(dto.nameAr);
    }
    if (dto.nameEn !== undefined && dto.nameEn !== country.nameEn) {
      await this.ensureNameEnIsAvailable(dto.nameEn);
    }

    const changes: DeepPartial<Country> = Object.fromEntries(
      Object.entries(dto).filter(([, value]) => value !== undefined),
    );
    const saved = await this.countriesRepository.update(country.id, changes);
    if (!saved) {
      throw new NotFoundException(`Country ${id} not found`);
    }
    return saved;
  }

  async remove(id: string): Promise<void> {
    const country = await this.findOne(id);
    await this.countriesRepository.softDelete(country.id);
  }

  private async ensureNameArIsAvailable(nameAr: string): Promise<void> {
    if (await this.countriesRepository.exists({ nameAr })) {
      throw new ConflictException('Arabic name is already in use');
    }
  }

  private async ensureNameEnIsAvailable(nameEn: string): Promise<void> {
    if (await this.countriesRepository.exists({ nameEn })) {
      throw new ConflictException('English name is already in use');
    }
  }
}
```

The service returns **entities** so other modules can use it; `exists` is the public check for `DriversService`.

### 6 — Controller and module

**Create file: `src/modules/countries/countries.controller.ts`**

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
import { BaseListQueryDto } from '../../common/dto/base-list-query.dto.js';
import type { PaginatedResult } from '../../common/utils/pagination.util.js';
import { CountriesService } from './countries.service.js';
import { CountryResponseDto } from './dto/country-response.dto.js';
import { CreateCountryDto } from './dto/create-country.dto.js';
import { UpdateCountryDto } from './dto/update-country.dto.js';

// Entities are mapped to response DTOs here; the service returns entities.
@ApiTags('countries')
@Controller('countries')
export class CountriesController {
  constructor(private readonly countriesService: CountriesService) {}

  /** Create a country. */
  @Post()
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.CONFLICT)
  async create(@Body() dto: CreateCountryDto): Promise<CountryResponseDto> {
    return CountryResponseDto.fromEntity(
      await this.countriesService.create(dto),
    );
  }

  /** List countries, newest first. Search matches nameAr and nameEn. */
  @Get()
  @ApiPaginatedResponse(CountryResponseDto)
  @ApiErrorResponses(HttpStatus.BAD_REQUEST)
  async findAll(
    @Query() query: BaseListQueryDto,
  ): Promise<PaginatedResult<CountryResponseDto>> {
    const result = await this.countriesService.findAll(query);
    return { ...result, data: result.data.map(CountryResponseDto.fromEntity) };
  }

  /** Get a country by id. */
  @Get(':id')
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND)
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CountryResponseDto> {
    return CountryResponseDto.fromEntity(
      await this.countriesService.findOne(id),
    );
  }

  /** Update a country. */
  @Patch(':id')
  @ApiErrorResponses(
    HttpStatus.BAD_REQUEST,
    HttpStatus.NOT_FOUND,
    HttpStatus.CONFLICT,
  )
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCountryDto,
  ): Promise<CountryResponseDto> {
    return CountryResponseDto.fromEntity(
      await this.countriesService.update(id, dto),
    );
  }

  /** Soft-delete a country. */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.countriesService.remove(id);
  }
}
```

**Create file: `src/modules/countries/countries.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CountriesController } from './countries.controller.js';
import { CountriesRepository } from './countries.repository.js';
import { CountriesService } from './countries.service.js';
import { Country } from './entities/country.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Country])],
  controllers: [CountriesController],
  providers: [CountriesService, CountriesRepository],
  exports: [CountriesService],
})
export class CountriesModule {}
```

**File: `src/app.module.ts`** — import `CountriesModule` from `./modules/countries/countries.module.js` and add it to `imports` after `VehiclesModule` (before `DriversModule`).

### 7 — Seed data

**Create file: `src/database/seeds/data/countries.data.ts`** — the full list (249 entries) is in `src/`. Shape and rules:

```ts
export interface CountrySeed {
  nameEn: string;
  nameAr: string;
}

// ISO 3166-1 countries and territories, ordered by English name.
export const COUNTRIES: readonly CountrySeed[] = [
  { nameEn: 'Afghanistan', nameAr: 'أفغانستان' },
  { nameEn: 'Åland Islands', nameAr: 'جزر أولاند' },
  // … 247 more, alphabetical by nameEn …
  { nameEn: 'Zimbabwe', nameAr: 'زيمبابوي' },
];
```

- One entry per ISO 3166-1 code (249). Use common short English names (`Bolivia`, `Iran`, `Russia`, `Syria`, `Vatican City`, `Türkiye`, `Palestine`).
- Arabic names without diacritics (`عمان`, not `عُمان`) so ILIKE search finds them.
- No duplicates in either column; every name already trimmed and 2–256 characters (same rules as `CreateCountryDto`).

### 8 — Seeder and runner

**Create file: `src/database/seeds/countries.seed.ts`**

```ts
import type { DataSource } from 'typeorm';
import { Country } from '../../modules/countries/entities/country.entity.js';
import { COUNTRIES } from './data/countries.data.js';

/**
 * Inserts the countries that are not in the table yet and returns how many were added.
 * Safe to re-run: a country is skipped when its Arabic or English name already exists,
 * including soft-deleted rows, so countries removed by an admin are not brought back.
 */
export function seedCountries(dataSource: DataSource): Promise<number> {
  return dataSource.transaction(async (manager) => {
    const repository = manager.getRepository(Country);
    const existing = await repository.find({
      select: { nameAr: true, nameEn: true },
      withDeleted: true,
    });
    const takenAr = new Set(existing.map((country) => country.nameAr));
    const takenEn = new Set(existing.map((country) => country.nameEn));

    const missing = COUNTRIES.filter(
      ({ nameAr, nameEn }) => !takenAr.has(nameAr) && !takenEn.has(nameEn),
    );
    if (missing.length > 0) {
      await repository.insert(missing.map((country) => ({ ...country })));
    }
    return missing.length;
  });
}
```

- The seeder talks to TypeORM directly (no Nest container, no `CountriesRepository`): it runs outside the app, like migrations.
- `withDeleted: true` is deliberate here, unlike the repository: it is what keeps deleted countries deleted.
- Skipping when **either** name is taken avoids violating the other unique index.

**Create file: `src/database/seeds/run-seeds.ts`**

```ts
import dataSource from '../data-source.js';
import { seedCountries } from './countries.seed.js';

// Entry point for `npm run seed`. Uses the same connection settings as the migrations.
await dataSource.initialize();
try {
  const inserted = await seedCountries(dataSource);
  console.log(`countries: inserted ${inserted}`);
} finally {
  await dataSource.destroy();
}
```

Top-level `await` works because the project is ESM (`"type": "module"`, `module: nodenext`). Future seeds add one call here, after the seeds they depend on.

**File: `package.json`** — add after `migration:show`:

```json
    "seed": "npm run build && node dist/database/seeds/run-seeds.js"
```

**File: `README.md`** — add after the "Database migrations" section:

````md
## Seeding

Run after the migrations. Seeds are safe to re-run: existing rows (including soft-deleted ones) are skipped.

```bash
# insert reference data (all countries)
$ npm run seed
```
````

Final layout:

```text
src/database/migrations/1793422800000-CreateCountriesTable.ts
src/database/seeds/
├── run-seeds.ts
├── countries.seed.ts
└── data/
    └── countries.data.ts
src/modules/countries/
├── countries.module.ts
├── countries.controller.ts
├── countries.service.ts
├── countries.repository.ts
├── dto/
│   ├── create-country.dto.ts
│   ├── update-country.dto.ts
│   └── country-response.dto.ts
└── entities/
    └── country.entity.ts
```

---

## Edge Cases & Failure Modes

**Fields**

- **Missing, not a string, shorter than 2 or longer than 256 after trimming** (`"nameEn": "  a "`, `"   "`) → **400**. Trimming runs first.
- **`null` in PATCH** (`{"nameAr": null}`) → **400** (`skipNullProperties: false`). Empty PATCH `{}` → **200**, nothing changes.
- **Unknown field** (`code`, `id`, `deletedAt`) → **400** (`forbidNonWhitelisted`).
- **Duplicate `nameAr`** → **409** `Arabic name is already in use`; **duplicate `nameEn`** → **409** `English name is already in use`. PATCH with the country's **own** name → no check, **200**.
- **Comparison is exact** after trim: `Egypt` and `egypt` are different names. Case-insensitive uniqueness is out of scope.
- **Two concurrent creates with the same name** → the second insert hits a partial unique index → `23505` → **409** `Resource already exists`.
- **Soft-deleted country's name** → can be reused through the API (partial index; `exists` skips deleted rows).
- **Unknown or soft-deleted id** on GET/PATCH/DELETE → **404** `Country <id> not found`. **Non-UUID id** → **400** (`ParseUUIDPipe`).

**List**

- **Invalid query** (`page=0`, `limit=101`, `limit=abc`, `search=" "`) → **400** (`BaseListQueryDto`).
- **Page beyond the last** → `data: []` with correct `meta`.
- **`search` with `%` or `_`** → matched literally (`escapeLike`).
- **Arabic search** → ILIKE is a plain substring match for Arabic; diacritics and alef/hamza variants (`أ`/`ا`) are **not** normalized. `"افغانستان"` does not find `"أفغانستان"`.
- **Seeded rows share `created_at`** → ordered by `id DESC` among themselves; pages stay stable but the order looks random. Accepted: clients that need alphabetical order sort client-side (or a later story adds `sortBy`).

**Drivers relationship**

- `drivers.nationality_id` has `FK_drivers_nationality_id … ON DELETE RESTRICT`, but **soft delete is an UPDATE**, so deleting a country used by drivers succeeds and those drivers keep pointing to it. `DriversService` rejects the deleted id for **new** assignments (`exists` skips deleted rows). Blocking or cascading is out of scope.

**Seeder**

- **Table missing** (migrations not run) → `relation "countries" does not exist`; nothing inserted. Run `npm run migration:run` first.
- **Second run** → inserts **0**.
- **Admin soft-deleted a country** → stays deleted (`withDeleted: true`).
- **Admin renamed only one name** (e.g. `nameEn` "Türkiye" → "Turkey") → the untouched Arabic name still matches, so it is skipped. **Both names renamed** → the seeder sees no match and inserts the original as a new row. Accepted; document if admins rename often.
- **Admin created a country manually with a seed name** → skipped, no 409.
- **Any insert fails** → the transaction rolls back; nothing is inserted.
- **`npm run seed` always builds first** (same as `migration:*`), so it takes a few seconds and requires a clean build.

---

## Test Plan

No automated tests: the project forbids test files. Verify with manual smoke tests against a running app (`BASE=http://localhost:3000/api`).

1. **DTO rules without a DB** (after `npm run build`):

   ```bash
   node --input-type=module -e "
   import 'reflect-metadata';
   const { plainToInstance } = await import('class-transformer');
   const { validate } = await import('class-validator');
   const { UpdateCountryDto } = await import('./dist/modules/countries/dto/update-country.dto.js');
   const errs = await validate(plainToInstance(UpdateCountryDto, { nameAr: null }), { whitelist: true, forbidNonWhitelisted: true });
   console.log(errs.length ? 'rejected' : 'accepted');"
   ```

   → `rejected`. Same check for `{}` → `accepted`; `{ nameEn: '   ' }` → `rejected`; `{ code: 'EG' }` → `rejected`.
2. **Seed data integrity:** import `dist/database/seeds/data/countries.data.js` and check `COUNTRIES.length === 249`, no duplicate `nameEn`/`nameAr`, every name trimmed and 2–256 chars.
3. **Seed:** `npm run migration:run`, then `npm run seed` → `countries: inserted 249`. Again → `countries: inserted 0`.
4. **List:** `GET $BASE/countries` → `meta.total: 249`, `limit: 10`. `?page=25&limit=10` → 9 rows; `?page=26` → `data: []`. Collect all ids over pages 1–25 → 249 distinct ids.
5. **Search:** `?search=saudi` → Saudi Arabia. `?search=السعودية` → Saudi Arabia. `?search=%25` → `total: 0`.
6. **Create:** `curl -i -H "Content-Type: application/json" -d '{"nameAr":"كوسوفو","nameEn":"Kosovo"}' $BASE/countries` → `201`; save `id` as `$ID`. Repeat → `409`. `{"nameAr":"مصر","nameEn":"Egypt 2"}` → `409` (Arabic).
7. **Validation:** missing `nameAr` → `400`; `"nameEn":" a "` → `400`; extra `"code":"XK"` → `400`.
8. **Get:** `GET $BASE/countries/$ID` → `200`; `/countries/abc` → `400`; random uuid → `404`.
9. **Update:** `PATCH $ID {"nameEn":"Republic of Kosovo"}` → `200`. `{"nameEn":"Egypt"}` → `409`. `{"nameAr":null}` → `400`. `{"nameEn":"Republic of Kosovo"}` (own name) → `200`.
10. **Delete:** `DELETE $ID` → `204`; GET/PATCH/DELETE → `404`; list total back to 249. Re-create `Kosovo` → `201`.
11. **Seeder respects deletes:** soft-delete `Saudi Arabia` through the API, run `npm run seed` → `inserted 0`, and Saudi Arabia is still absent from the list.

---

## Migration / Rollback

- Schema: `CreateCountriesTable` creates `countries` and two partial unique indexes. `npm run migration:revert` undoes it, **after** reverting `CreateDriversTable` (it has a FK to `countries`; TypeORM reverts newest first, so this happens naturally). **Reverting deletes all countries, including seeded and admin-made ones.**
- Seed data: no down step. To re-seed from scratch, revert and re-run the migration, then `npm run seed`.
- Half-applied state: each migration and the seeder run in a transaction, so a failure leaves nothing behind.
- Code rollback: revert the commit. No new dependencies or env vars. Revert the migration (and drivers') **before** the code.

---

## Verification Steps

1. **Build:** `npm run build` → no errors. `dist/modules/countries/`, `dist/database/seeds/run-seeds.js` and `dist/database/migrations/1793422800000-CreateCountriesTable.js` exist.
2. **Lint:** `npm run lint` → no errors.
3. **Boundaries:** `grep -rn "countries.repository" src --include=*.ts` → only files inside `src/modules/countries/`. `grep -rn "modules/countries" src --include=*.ts` → `app.module.ts`, the drivers module, and `src/database/seeds/countries.seed.ts` (entity only).
4. **No test artifacts:** no `*.spec.ts` under `src/`.
5. **Database:** `npm run migration:show` → `CreateCountriesTable` pending (if not yet applied). `npm run migration:run` → applied. `npm run migration:generate -- src/database/migrations/Check` → "No changes in database schema were found". If it emits SQL for the index predicate or PK name, delete the generated file and align the hand-written migration.
6. **Runs:** `npm run start:dev` → logs `Mapped {/api/countries, POST}`, `{/api/countries, GET}`, `{/api/countries/:id, GET}`, `{/api/countries/:id, PATCH}`, `{/api/countries/:id, DELETE}`. Swagger at `/api/docs` shows the `countries` tag. Run Test Plan steps 3–11.
7. **Regression:** `/api/health`, `/api/companies`, `/api/vehicles` still respond. Creating a driver with a seeded country id as `nationalityId` succeeds.

---

## Done Criteria

- [ ] `Country` (table `countries`) extends `BaseEntity` with `nameAr` (`name_ar`), `nameEn` (`name_en`) as `varchar(256)` and `deletedAt` (`@DeleteDateColumn`).
- [ ] Partial unique indexes on `name_ar` and `name_en` where `deleted_at IS NULL`; migration exists; `synchronize` stays `false`; no drift.
- [ ] Both names required, trimmed, 2–256 chars on create; PATCH accepts any subset and rejects `null`; unknown fields → 400.
- [ ] Duplicate name → 409. Unknown or soft-deleted id → 404; non-uuid → 400; DELETE soft-deletes and returns 204.
- [ ] `GET /api/countries` uses `BaseListQueryDto`, returns `{ data, meta }`, `createdAt DESC` with `id` tie-breaker, searches `nameAr`/`nameEn` only with escaped `ILike`.
- [ ] All endpoints return `CountryResponseDto`; `CountriesModule` exports only `CountriesService`.
- [ ] `npm run seed` inserts 249 countries on an empty table and 0 on re-run; soft-deleted countries are not re-inserted; README documents it.
- [ ] ESM preserved (`.js` suffixes); `npm run build` and `npm run lint` pass; no test files.

**STOP HERE. Report to the user and wait for confirmation before proceeding to the next story.**
