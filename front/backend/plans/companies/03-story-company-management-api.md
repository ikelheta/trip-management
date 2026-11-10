# Story 03 — Add Companies module to manage leasing company profiles with header and footer images

## Prerequisites

- **Story 01 completed:** [../project-structure/01-story-restructure-project-as-clean-modular-monolith-no-ddd-no-test-files.md](../project-structure/01-story-restructure-project-as-clean-modular-monolith-no-ddd-no-test-files.md). Config, `DatabaseModule`, `AllExceptionsFilter`, global `ValidationPipe` and the users module pattern.
- **Story 02 completed:** [../files/02-story-shared-file-management-api.md](../files/02-story-shared-file-management-api.md). This story uses `BaseEntity` and `FilesService`, **changes the files module** (task 1), and adds migrations after `1793408400000-CreateFilesTable`. **Do not start until `npm run build` passes on the Story 02 result.**
- **Revision (implemented):** companies follows the **crud-foundation** conventions ([intake](../../stories/crud-foundation/shared-crud-foundation-baserepository-baselistquerydto-pagination-users-as-refer/intake.md)). Its shared pieces were created as part of this story: `src/common/dto/base-list-query.dto.ts`, `src/common/repositories/base.repository.ts`, `src/common/utils/pagination.util.ts` (`PaginatedResult`, `toSkipTake`, `toPaginatedResult`), `src/common/utils/escape-like.util.ts`. Where the task code below differs, **the code in `src/` is the source of truth**:
  - `CompaniesRepository extends BaseRepository<Company>` and keeps only `findPaginated(query)` (search: `name`, `registrationNumber`, `city`, `ILike`, escaped) and `softDelete`. The service uses `exists`, `findById`, `create`, `update` from the base.
  - `GET /api/companies` takes `BaseListQueryDto` (`page`, `limit`, `search`; no extra filters) and returns `{ data, meta }`.
  - Endpoints return `CompanyResponseDto` (`dto/company-response.dto.ts`, `fromEntity`), never the entity. Mapping happens in the **controller**; the service returns entities so other modules can use it.
  - The crud-foundation users refactor and `docs/crud-module-guide.md` are **not** done here.
- Local **PostgreSQL ≥ 13** with the Story 01 and 02 migrations applied is needed for the runtime verification steps only.

---

## Story Goal

Add a `companies` module under `src/modules/companies/`. A company is a small leasing company. It is the first business module, and later stories attach vehicles, drivers and trips to it.

1. `POST/GET/GET :id/PATCH/DELETE /api/companies` manage company profiles: `name`, `registrationNumber`, `city`, `address`, `whatsAppNumber`, `phoneNumber`. Each is a required, trimmed string of 2–256 characters. `DELETE` is a soft delete.
2. `registrationNumber` is unique among non-deleted companies (409 on duplicates).
3. Header and footer images use an **upload-first** flow:
   1. The client uploads each image with the existing `POST /api/files`, sending `ownerType=companies` and **no** `ownerId`.
   2. The response now has a `url` (`/api/files/<id>/download`).
   3. The client sends that url as `headerUrl` / `footerUrl` when creating or updating the company.
   4. The service validates the url, saves the company, then links the file to it (`ownerId` = company id) through `FilesService.attach`.
   5. Replacing or clearing (`null`) an image on PATCH soft-deletes the previous file.

**Not in scope:** vehicles, drivers, trips, linking users to companies, pagination/filtering, E.164 phone validation, image dimension checks, cleanup of files that are uploaded but never linked, absolute or signed urls, authorization, tests, Swagger. **Do not** change `src/modules/users/`.

**Hard constraints for the executor** (same as Stories 01–02):

- Controller → Service → Repository. **No** DDD constructs, **no** new interfaces.
- `src/modules/companies/` uses the files module **only** through `FilesModule` (import), `FilesService`, and the `FileEntity` **type**. **Never** import `FilesRepository`, `file-url.ts`, `STORAGE_PROVIDER` or anything under `files/storage/`.
- ESM: every relative import ends in **`.js`**.
- Constructor-injected classes (`CompaniesRepository`, `FilesService`, `Repository`) are **value imports**.

---

## Context — Read These Files First

1. `src/modules/users/users.repository.ts`, `users.service.ts`, `users.controller.ts`, `users.module.ts` — **the pattern to copy**. In `users.service.ts`: `findOne` throws `NotFoundException` (~lines 20–26), `ensureEmailIsAvailable` (~lines 59–63) is the model for the registration-number check, and `update` drops `undefined` values with `Object.fromEntries` (~lines 44–47).
2. `src/modules/users/dto/create-user.dto.ts` — line 13: the `@Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))` trim idiom.
3. `src/common/entities/base.entity.ts` — `id` (uuid), `createdAt`, `updatedAt`. `Company` extends it.
4. `src/modules/files/entities/file.entity.ts` — lines 10–11: `ownerId` column (`uuid`, not nullable). You make it nullable and add a computed `url`.
5. `src/modules/files/dto/upload-file.dto.ts` and `list-files-query.dto.ts` — `ListFilesQueryDto extends UploadFileDto`. Task 1 splits them, because upload makes `ownerId` optional while list keeps it required.
6. `src/modules/files/files.repository.ts` — lines 13–30. You add `attachOwner`.
7. `src/modules/files/files.service.ts`:
   - lines 34–39: the JSDoc above `FilesService` (public API for other modules). Update it.
   - line 57: `upload(file, ownerType, ownerId)`; line 62 calls `assertCanAccess(ownerType, ownerId)`.
   - line 106: `findById`; line 111 calls `assertCanAccess(file.ownerType, file.ownerId)`.
   - line 125: `remove(id)` soft-deletes; throws `NotFoundException` for an unknown or deleted id.
   - line 132: `private assertCanAccess(_ownerType: string, _ownerId: string): void {}`.
8. `src/modules/files/files.controller.ts` — `upload` (~lines 28–35) passes `dto.ownerId` to the service.
9. `src/main.ts` — `app.setGlobalPrefix('api')`. The file url hard-codes `/api`; keep them in sync.
10. `src/database/migrations/1793408400000-CreateFilesTable.ts` — hand-written migration style. Your timestamps must be larger.
11. `src/common/filters/all-exceptions.filter.ts` — ~lines 65–74: a `QueryFailedError` with code `23505` becomes **409** `Resource already exists`.
12. `node_modules/@nestjs/mapped-types/dist/partial-type.helper.d.ts` — line 5: `skipNullProperties?: boolean`. Passing `false` makes `null` fail validation for fields that do not have their own `@IsOptional()`.

---

## Implementation tasks

### 1 — Files module: optional owner on upload, `url`, `findByUrl`, `attach`

**Create file: `src/modules/files/file-url.ts`** — internal to the files module.

```ts
// Must match the global prefix in main.ts and the download route in FilesController.
const FILE_URL_PATTERN =
  /^\/api\/files\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/download$/i;

export function toFileUrl(id: string): string {
  return `/api/files/${id}/download`;
}

export function parseFileUrl(url: string): string | null {
  return FILE_URL_PATTERN.exec(url)?.[1].toLowerCase() ?? null;
}
```

**File: `src/modules/files/entities/file.entity.ts`**

- Add `AfterInsert`, `AfterLoad` to the `typeorm` import and `import { toFileUrl } from '../file-url.js';`.
- Make `ownerId` nullable:

```ts
  // Null until the owning module links the file (FilesService.attach).
  @Column({ name: 'owner_id', type: 'uuid', nullable: true })
  ownerId: string | null;
```

- Add at the end of the class:

```ts
  // Not a column: the download path clients send back, e.g. a company's headerUrl.
  url: string;

  @AfterLoad()
  @AfterInsert()
  protected setUrl(): void {
    this.url = toFileUrl(this.id);
  }
```

**File: `src/modules/files/dto/upload-file.dto.ts`** — replace the contents:

```ts
import { IsOptional, IsString, IsUUID, Matches } from 'class-validator';

export const OWNER_TYPE_PATTERN = /^[a-z][a-z0-9-]{0,49}$/;
export const OWNER_TYPE_MESSAGE =
  'ownerType must be 1-50 lowercase letters, digits or dashes, starting with a letter';

export class UploadFileDto {
  // Owning module's name, e.g. "users", "trips", "trip-bookings".
  @IsString()
  @Matches(OWNER_TYPE_PATTERN, { message: OWNER_TYPE_MESSAGE })
  ownerType: string;

  // Omit when the owner does not exist yet; the owning module links it later.
  @IsOptional()
  @IsUUID()
  ownerId?: string;
}
```

**File: `src/modules/files/dto/list-files-query.dto.ts`** — replace the contents. It must **not** extend `UploadFileDto` any more: an inherited `@IsOptional()` would make `ownerId` optional here too.

```ts
import { IsString, IsUUID, Matches } from 'class-validator';
import { OWNER_TYPE_MESSAGE, OWNER_TYPE_PATTERN } from './upload-file.dto.js';

export class ListFilesQueryDto {
  @IsString()
  @Matches(OWNER_TYPE_PATTERN, { message: OWNER_TYPE_MESSAGE })
  ownerType: string;

  @IsUUID()
  ownerId: string;
}
```

**File: `src/modules/files/files.repository.ts`** — add `IsNull` to the `typeorm` import and this method after `create`:

```ts
  // Atomic: only links a live file of this ownerType that has no owner yet.
  async attachOwner(
    id: string,
    ownerType: string,
    ownerId: string,
  ): Promise<boolean> {
    const result = await this.repository.update(
      { id, ownerType, ownerId: IsNull(), deletedAt: IsNull() },
      { ownerId },
    );
    return result.affected === 1;
  }
```

**File: `src/modules/files/files.service.ts`**

- Add `ConflictException` to the `@nestjs/common` import and `import { parseFileUrl } from './file-url.js';`.
- `upload`: change the parameter to `ownerId: string | null`. Nothing else in the method changes.
- `assertCanAccess`: change the second parameter to `_ownerId: string | null`.
- Add after `findByOwner`:

```ts
  /** The live file behind a url returned by upload, or null if there is none. */
  async findByUrl(url: string): Promise<FileEntity | null> {
    const id = parseFileUrl(url);
    const file = id ? await this.filesRepository.findById(id) : null;
    if (file) {
      this.assertCanAccess(file.ownerType, file.ownerId);
    }
    return file;
  }

  /** Links a file uploaded without an owner. Fails if it is already linked. */
  async attach(id: string, ownerType: string, ownerId: string): Promise<void> {
    this.assertCanAccess(ownerType, ownerId);
    if (!(await this.filesRepository.attachOwner(id, ownerType, ownerId))) {
      throw new ConflictException(
        `File ${id} does not exist or is already linked to an owner`,
      );
    }
  }
```

- Replace the JSDoc above `export class FilesService` with:

```ts
/**
 * Shared file storage for every module. A business module adds `FilesModule`
 * to its `imports` and injects `FilesService`, e.g.
 * `this.filesService.findByOwner('trips', trip.id)`. It never imports
 * `FilesRepository`, `STORAGE_PROVIDER` or anything under `storage/`.
 *
 * Upload-first flow: the client uploads with `ownerType` only and sends the
 * returned `url` to the owning module, which checks it with `findByUrl` and
 * links it with `attach` once its record exists.
 */
```

**File: `src/modules/files/files.controller.ts`** — in `upload`, pass `dto.ownerId ?? null`:

```ts
    return this.filesService.upload(file, dto.ownerType, dto.ownerId ?? null);
```

### 2 — Companies entity

**Create file: `src/modules/companies/entities/company.entity.ts`**

```ts
import { Column, DeleteDateColumn, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity.js';

@Entity('companies')
export class Company extends BaseEntity {
  @Column({ type: 'varchar', length: 256 })
  name: string;

  @Index('UQ_companies_registration_number', {
    unique: true,
    where: '"deleted_at" IS NULL',
  })
  @Column({ name: 'registration_number', type: 'varchar', length: 256 })
  registrationNumber: string;

  @Column({ type: 'varchar', length: 256 })
  city: string;

  @Column({ type: 'varchar', length: 256 })
  address: string;

  @Column({ name: 'whatsapp_number', type: 'varchar', length: 256 })
  whatsAppNumber: string;

  @Column({ name: 'phone_number', type: 'varchar', length: 256 })
  phoneNumber: string;

  // Urls returned by POST /api/files (ownerType "companies").
  @Column({ name: 'header_url', type: 'varchar', length: 512, nullable: true })
  headerUrl: string | null;

  @Column({ name: 'footer_url', type: 'varchar', length: 512, nullable: true })
  footerUrl: string | null;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
```

The unique index is **partial**, so a soft-deleted company does not block re-registering its number.

### 3 — Migrations

Preferred (needs a running DB): after tasks 1–2, run `npm run migration:generate -- src/database/migrations/CompaniesAndNullableFileOwner` and keep the generated file.

If no DB is available, create **two** files by hand.

**Create file: `src/database/migrations/1793412000000-MakeFilesOwnerIdNullable.ts`**

```ts
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeFilesOwnerIdNullable1793412000000 implements MigrationInterface {
  name = 'MakeFilesOwnerIdNullable1793412000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "files" ALTER COLUMN "owner_id" DROP NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Unlinked uploads cannot satisfy NOT NULL; their bytes stay in storage.
    await queryRunner.query(`DELETE FROM "files" WHERE "owner_id" IS NULL`);
    await queryRunner.query(
      `ALTER TABLE "files" ALTER COLUMN "owner_id" SET NOT NULL`,
    );
  }
}
```

**Create file: `src/database/migrations/1793415600000-CreateCompaniesTable.ts`**

```ts
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCompaniesTable1793415600000 implements MigrationInterface {
  name = 'CreateCompaniesTable1793415600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "companies" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "name" character varying(256) NOT NULL,
        "registration_number" character varying(256) NOT NULL,
        "city" character varying(256) NOT NULL,
        "address" character varying(256) NOT NULL,
        "whatsapp_number" character varying(256) NOT NULL,
        "phone_number" character varying(256) NOT NULL,
        "header_url" character varying(512),
        "footer_url" character varying(512),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_d4bc3e82a314fa9e29f652c2c22" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_companies_registration_number" ON "companies" ("registration_number") WHERE "deleted_at" IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."UQ_companies_registration_number"`,
    );
    await queryRunner.query(`DROP TABLE "companies"`);
  }
}
```

`PK_d4bc3e82a314fa9e29f652c2c22` is `"PK_" + sha1("companies_id").substring(0, 27)`, TypeORM's `DefaultNamingStrategy.primaryKeyName` (computed 2026-10-31, same formula Story 02 used for `files`).

### 4 — DTOs

**Create file: `src/modules/companies/dto/create-company.dto.ts`**

```ts
import { Transform } from 'class-transformer';
import { IsOptional, IsString, Length, MaxLength } from 'class-validator';

const Trim = () =>
  Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));

export class CreateCompanyDto {
  @Trim()
  @IsString()
  @Length(2, 256)
  name: string;

  @Trim()
  @IsString()
  @Length(2, 256)
  registrationNumber: string;

  @Trim()
  @IsString()
  @Length(2, 256)
  city: string;

  @Trim()
  @IsString()
  @Length(2, 256)
  address: string;

  @Trim()
  @IsString()
  @Length(2, 256)
  whatsAppNumber: string;

  @Trim()
  @IsString()
  @Length(2, 256)
  phoneNumber: string;

  // `url` from POST /api/files; null clears the image on update.
  @IsOptional()
  @IsString()
  @MaxLength(512)
  headerUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  footerUrl?: string | null;
}
```

- `Trim` stays local to this file. Move it to `src/common/` only when a second module needs it.
- The url fields carry their **own** `@IsOptional()`, which accepts `null`. That is what lets PATCH clear an image.

**Create file: `src/modules/companies/dto/update-company.dto.ts`**

```ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateCompanyDto } from './create-company.dto.js';

export class UpdateCompanyDto extends PartialType(CreateCompanyDto, {
  skipNullProperties: false,
}) {}
```

`skipNullProperties: false` makes `{"city": null}` fail `@IsString` (400) instead of reaching the DB as `NULL` (500). `headerUrl: null` / `footerUrl: null` still pass because of their own `@IsOptional()`.

### 5 — Repository

**Create file: `src/modules/companies/companies.repository.ts`** — TypeORM `find*` methods skip soft-deleted rows automatically. **Do not** pass `withDeleted: true`.

```ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { Company } from './entities/company.entity.js';

@Injectable()
export class CompaniesRepository {
  constructor(
    @InjectRepository(Company)
    private readonly repository: Repository<Company>,
  ) {}

  findAll(): Promise<Company[]> {
    return this.repository.find({ order: { createdAt: 'DESC' } });
  }

  findById(id: string): Promise<Company | null> {
    return this.repository.findOneBy({ id });
  }

  findByRegistrationNumber(registrationNumber: string): Promise<Company | null> {
    return this.repository.findOneBy({ registrationNumber });
  }

  create(data: DeepPartial<Company>): Promise<Company> {
    return this.repository.save(this.repository.create(data));
  }

  save(company: Company): Promise<Company> {
    return this.repository.save(company);
  }

  async softDelete(id: string): Promise<void> {
    await this.repository.softDelete({ id });
  }
}
```

### 6 — Service

**Create file: `src/modules/companies/companies.service.ts`**

```ts
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { FileEntity } from '../files/entities/file.entity.js';
import { FilesService } from '../files/files.service.js';
import { CompaniesRepository } from './companies.repository.js';
import { CreateCompanyDto } from './dto/create-company.dto.js';
import { UpdateCompanyDto } from './dto/update-company.dto.js';
import { Company } from './entities/company.entity.js';

const FILE_OWNER_TYPE = 'companies';
const IMAGE_MIME_TYPES: ReadonlySet<string> = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

type ImageField = 'headerUrl' | 'footerUrl';

@Injectable()
export class CompaniesService {
  private readonly logger = new Logger(CompaniesService.name);

  constructor(
    private readonly companiesRepository: CompaniesRepository,
    private readonly filesService: FilesService,
  ) {}

  findAll(): Promise<Company[]> {
    return this.companiesRepository.findAll();
  }

  async findOne(id: string): Promise<Company> {
    const company = await this.companiesRepository.findById(id);
    if (!company) {
      throw new NotFoundException(`Company ${id} not found`);
    }
    return company;
  }

  async create(dto: CreateCompanyDto): Promise<Company> {
    await this.ensureRegistrationNumberIsAvailable(dto.registrationNumber);
    this.ensureDistinctImages(dto.headerUrl, dto.footerUrl);
    const images = [
      await this.resolveImage('headerUrl', dto.headerUrl, null),
      await this.resolveImage('footerUrl', dto.footerUrl, null),
    ];

    const company = await this.companiesRepository.create(dto);
    await this.linkImages(company, images);
    return company;
  }

  async update(id: string, dto: UpdateCompanyDto): Promise<Company> {
    const company = await this.findOne(id);

    if (
      dto.registrationNumber !== undefined &&
      dto.registrationNumber !== company.registrationNumber
    ) {
      await this.ensureRegistrationNumberIsAvailable(dto.registrationNumber);
    }
    this.ensureDistinctImages(
      dto.headerUrl === undefined ? company.headerUrl : dto.headerUrl,
      dto.footerUrl === undefined ? company.footerUrl : dto.footerUrl,
    );
    const images = [
      await this.resolveImage('headerUrl', dto.headerUrl, company.id),
      await this.resolveImage('footerUrl', dto.footerUrl, company.id),
    ];
    const previousUrls = [company.headerUrl, company.footerUrl];

    const changes = Object.fromEntries(
      Object.entries(dto).filter(([, value]) => value !== undefined),
    );
    const saved = await this.companiesRepository.save(
      Object.assign(company, changes),
    );

    await this.linkImages(saved, images);
    for (const url of previousUrls) {
      if (url && url !== saved.headerUrl && url !== saved.footerUrl) {
        await this.removeImageQuietly(url);
      }
    }
    return saved;
  }

  async remove(id: string): Promise<void> {
    const company = await this.findOne(id);
    await this.companiesRepository.softDelete(company.id);
  }

  private async ensureRegistrationNumberIsAvailable(
    registrationNumber: string,
  ): Promise<void> {
    if (
      await this.companiesRepository.findByRegistrationNumber(
        registrationNumber,
      )
    ) {
      throw new ConflictException('Registration number is already in use');
    }
  }

  private ensureDistinctImages(
    headerUrl: string | null | undefined,
    footerUrl: string | null | undefined,
  ): void {
    if (headerUrl && headerUrl === footerUrl) {
      throw new BadRequestException('headerUrl and footerUrl must be different files');
    }
  }

  // The file must be a live "companies" image that is unlinked or already this company's.
  private async resolveImage(
    field: ImageField,
    url: string | null | undefined,
    companyId: string | null,
  ): Promise<FileEntity | null> {
    if (url === undefined || url === null) {
      return null;
    }
    const file = await this.filesService.findByUrl(url);
    if (
      !file ||
      file.ownerType !== FILE_OWNER_TYPE ||
      (file.ownerId !== null && file.ownerId !== companyId)
    ) {
      throw new BadRequestException(
        `${field} must be the url of a file uploaded with ownerType "${FILE_OWNER_TYPE}" and not used by another company`,
      );
    }
    if (!IMAGE_MIME_TYPES.has(file.mimeType)) {
      throw new BadRequestException(
        `${field} must point to a JPEG, PNG or WebP image`,
      );
    }
    return file;
  }

  // Validation already passed; a failed link (lost race) is only logged.
  private async linkImages(
    company: Company,
    files: (FileEntity | null)[],
  ): Promise<void> {
    for (const file of files) {
      if (file && file.ownerId === null) {
        await this.filesService
          .attach(file.id, FILE_OWNER_TYPE, company.id)
          .catch((error: unknown) => {
            this.logger.error(
              `Failed to link file ${file.id} to company ${company.id}`,
              error instanceof Error ? error.stack : error,
            );
          });
      }
    }
  }

  // The company row is the source of truth; a file that fails to delete is only logged.
  private async removeImageQuietly(url: string): Promise<void> {
    const file = await this.filesService.findByUrl(url);
    if (!file) {
      return;
    }
    await this.filesService.remove(file.id).catch((error: unknown) => {
      this.logger.error(
        `Failed to remove company image file ${file.id}`,
        error instanceof Error ? error.stack : error,
      );
    });
  }
}
```

- All checks (registration number, distinct images, each url) run **before** the insert/save, so a 400/409 never leaves a half-written company.
- `FileEntity` is a **type-only** import (it appears only in signatures). That is allowed; importing it as a value is not needed.
- SVG is excluded from `IMAGE_MIME_TYPES` on purpose (it can carry script).

### 7 — Controller and module

**Create file: `src/modules/companies/companies.controller.ts`** — HTTP only.

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
import { CompaniesService } from './companies.service.js';
import { CreateCompanyDto } from './dto/create-company.dto.js';
import { UpdateCompanyDto } from './dto/update-company.dto.js';
import { Company } from './entities/company.entity.js';

@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Post()
  create(@Body() dto: CreateCompanyDto): Promise<Company> {
    return this.companiesService.create(dto);
  }

  @Get()
  findAll(): Promise<Company[]> {
    return this.companiesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Company> {
    return this.companiesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCompanyDto,
  ): Promise<Company> {
    return this.companiesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.companiesService.remove(id);
  }
}
```

**Create file: `src/modules/companies/companies.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FilesModule } from '../files/files.module.js';
import { CompaniesController } from './companies.controller.js';
import { CompaniesRepository } from './companies.repository.js';
import { CompaniesService } from './companies.service.js';
import { Company } from './entities/company.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Company]), FilesModule],
  controllers: [CompaniesController],
  providers: [CompaniesService, CompaniesRepository],
  exports: [CompaniesService],
})
export class CompaniesModule {}
```

**File: `src/app.module.ts`** — import `CompaniesModule` from `./modules/companies/companies.module.js` and add it to `imports` after `FilesModule`.

Final layout:

```text
src/database/migrations/1793412000000-MakeFilesOwnerIdNullable.ts   (or one generated file)
src/database/migrations/1793415600000-CreateCompaniesTable.ts
src/modules/files/file-url.ts                                       (new)
src/modules/files/{entities/file.entity.ts, dto/*.ts, files.repository.ts, files.service.ts, files.controller.ts}  (edited)
src/modules/companies/
├── companies.module.ts
├── companies.controller.ts
├── companies.service.ts
├── companies.repository.ts
├── dto/
│   ├── create-company.dto.ts
│   └── update-company.dto.ts
└── entities/
    └── company.entity.ts
```

---

## Edge Cases & Failure Modes

**Company fields**

- **Field missing, not a string, shorter than 2 or longer than 256 after trimming** (e.g. `"name": "  a "`) → **400** from `ValidationPipe`. Trimming happens first, so whitespace-only values fail `@Length`.
- **`null` for a text field in PATCH** (`{"city": null}`) → **400** (`skipNullProperties: false`). Empty PATCH `{}` → `200`, nothing changes.
- **Unknown field** (`id`, `deletedAt`, `foo`) → **400** (`forbidNonWhitelisted`).
- **Duplicate `registrationNumber`** on create, or PATCH to another company's number → **409** `Registration number is already in use`. PATCH with the company's **own** number → no check, `200`.
- **Two concurrent creates with the same number** → the second insert hits `UQ_companies_registration_number` → `23505` → **409** `Resource already exists` (`all-exceptions.filter.ts`).
- **Number comparison is exact** after trim (`cr-123` ≠ `CR-123`). Normalization is a later product decision.
- **Soft-deleted company's number** → can be reused (partial index; `findOneBy` skips deleted rows).
- **Unknown or soft-deleted id** on GET, PATCH or DELETE → **404** `Company <id> not found`. **Non-UUID id** → **400** (`ParseUUIDPipe`).

**Header / footer urls**

- **Upload without `ownerId`** → `201`, `ownerId: null`, `url: "/api/files/<id>/download"`. **`GET /api/files?ownerType=companies`** without `ownerId` → still **400** (`ListFilesQueryDto`).
- **Url that is not a file url** (`"logo.png"`, `"https://x/y"`, wrong prefix, bad uuid) → `parseFileUrl` returns `null` → **400** from `resolveImage`. Matching is case-insensitive for the uuid; the stored url is the client's string as sent.
- **Url of an unknown or soft-deleted file** → `findByUrl` returns `null` → **400**.
- **Url of a file uploaded with another `ownerType`** (`users`) → **400**.
- **Url of a file already linked to another company** → **400**. The same company re-sending its own current url → accepted, no new link, no deletion.
- **Url of a PDF** (allowed by `FILE_ALLOWED_MIME_TYPES`, but not an image) → **400** `headerUrl must point to a JPEG, PNG or WebP image`.
- **`headerUrl` equal to `footerUrl`** (in the body, or new header equal to the stored footer) → **400**. Without this check, clearing one would soft-delete the file the other still uses.
- **PATCH `headerUrl: null`** → header cleared, previous file soft-deleted. PATCH that **omits** `headerUrl` → header unchanged.
- **Replacing the header** → new file linked, previous file soft-deleted (its `GET /api/files/<old id>` → 404).
- **Two companies submit the same unlinked url at the same time** → both pass `resolveImage`; `attachOwner` is a conditional `UPDATE … WHERE owner_id IS NULL`, so only one links. The other company is saved with the url, and the `ConflictException` from `attach` is logged by `linkImages`, not returned. Accepted: the url is known only to the client that uploaded it.
- **Company insert or save fails after validation** (DB down) → nothing has been linked yet; the uploaded files stay unlinked. They are not cleaned up (out of scope).
- **Previous image cannot be removed** (already deleted via `DELETE /api/files/:id`) → `findByUrl` returns `null`, nothing to do. Any other failure is logged and the request still succeeds.
- **Image deleted directly through `/api/files/:id`** → the company keeps a url that now returns 404. Fix by sending a new url or `null`. Accepted until authorization limits who can call the files endpoints.
- **Soft-deleting a company** does **not** delete its images, so a restored company keeps them.
- **Global prefix changes** in `main.ts` → `toFileUrl`/`parseFileUrl` in `file-url.ts` must change with it, and stored urls become stale. The comment in `file-url.ts` says so.
- **`url` on `FileEntity`** is set by `@AfterLoad`/`@AfterInsert`, so every file response (upload, get, list) includes it. It is not a column; `migration:generate` must not see it.

**Migrations**

- **`MakeFilesOwnerIdNullable` down** deletes file rows with `owner_id IS NULL` (unlinked uploads), because `SET NOT NULL` would fail otherwise. Their bytes stay in storage.
- **Hand-written migration drift** → after applying, run `npm run migration:generate -- src/database/migrations/Check`. It must report **no changes**. If it emits SQL for the partial index predicate (PostgreSQL stores it as `(deleted_at IS NULL)`) or a PK name, delete the generated file and align the hand-written migration with what it shows.

---

## Test Plan

No automated tests: the project forbids test files. Verify with manual smoke tests against a running app (`BASE=http://localhost:3000/api`). Create fixtures in the repo root, outside `src/`, and delete them afterwards:

```bash
node -e "require('fs').writeFileSync('logo.png', Buffer.from('89504e470d0a1a0a', 'hex'))"
node -e "require('fs').writeFileSync('doc.pdf', '%PDF-1.4 sample')"
COMPANY='"name":"Azm Leasing","registrationNumber":"CR-1010","city":"Riyadh","address":"King Fahd Rd","whatsAppNumber":"+966500000000","phoneNumber":"+966110000000"'
```

1. **Upload without owner:** `curl -s -F "file=@logo.png;type=image/png" -F ownerType=companies $BASE/files` → `201`, `ownerId: null`, `url: "/api/files/<id>/download"`. Upload two more PNGs and one `doc.pdf` the same way. Save the urls as `$H1`, `$H2`, `$F1`, `$PDF`.
2. **Files regression:** upload with `ownerId` still works and returns `url`. `GET $BASE/files?ownerType=companies` (no `ownerId`) → `400`.
3. **Create with images:** `curl -i -H "Content-Type: application/json" -d "{$COMPANY,\"headerUrl\":\"$H1\",\"footerUrl\":\"$F1\"}" $BASE/companies` → `201`, both urls stored. Save `id` as `$ID`. `GET` the files behind `$H1` and `$F1` → `ownerId: $ID`.
4. **Create without images:** a second company (`CR-2020`) with no url fields → `201`, `headerUrl: null`, `footerUrl: null`.
5. **Validation:** `"name":" a "` → `400`; missing `city` → `400`; 257-char `address` → `400`; extra `"foo":1` → `400`.
6. **Url errors on create** (new `registrationNumber` each time): `headerUrl: "nope"` → `400`; random-uuid file url → `400`; `$PDF` → `400`; `$H1` (linked to `$ID`) → `400`; `headerUrl` = `footerUrl` = `$H2` → `400`.
7. **Duplicate number:** repeat step 3's body with fresh urls → `409`.
8. **List / get:** `GET $BASE/companies` → newest first. `GET $BASE/companies/abc` → `400`; random uuid → `404`.
9. **Update fields:** `PATCH` `{"city":"Jeddah"}` → `200`. `{"city":null}` → `400`. PATCH the `CR-2020` company to `CR-1010` → `409`.
10. **Replace header:** `PATCH $ID` `{"headerUrl":"$H2"}` → `200`; `$H2`'s file has `ownerId: $ID`; `GET $BASE/files/<H1 id>` → `404`.
11. **Re-send own url:** `PATCH $ID` `{"headerUrl":"$H2"}` → `200`, nothing deleted.
12. **Clear footer:** `PATCH $ID` `{"footerUrl":null}` → `200`, `footerUrl: null`; `$F1`'s file → `404`.
13. **Delete:** `curl -i -X DELETE $BASE/companies/$ID` → `204`; GET/PATCH/DELETE → `404`; list excludes it; `$H2`'s file → still `200`. Create a new company with `CR-1010` → `201`.

---

## Migration / Rollback

- Schema: `MakeFilesOwnerIdNullable` drops `NOT NULL` on `files.owner_id`; `CreateCompaniesTable` creates `companies` and the partial unique index. `npm run migration:revert` (twice) undoes both. **Reverting deletes all companies and all unlinked file rows.** Linked image files stay, owned by ids that no longer exist.
- Half-applied state: PostgreSQL runs each TypeORM migration in a transaction, so a failed `up` leaves nothing behind.
- Code rollback: revert the commit. No new dependencies or env vars. Revert the migrations **before** the code, or the old `FileEntity` (non-nullable `ownerId`) will report drift.

---

## Verification Steps

1. **Backend builds:** in the repo root, `npm run build` → no errors. `dist/modules/companies/entities/company.entity.js`, `dist/modules/files/file-url.js` and both migrations' `.js` exist.
2. **Lint:** `npm run lint` → no errors.
3. **Boundaries:** `grep -rn "files.repository\|file-url\|storage" src/modules/companies` → no output. `grep -rn "modules/companies" src --include=*.ts` → only `src/app.module.ts`.
4. **No test artifacts:** `nest-cli.json` still has `"generateOptions": { "spec": false }`; no `*.spec.ts` under `src/`.
5. **Database:** `npm run migration:show` → both new migrations pending. `npm run migration:run` → applied. `npm run migration:generate -- src/database/migrations/Check` → "No changes in database schema were found".
6. **Backend runs:** `npm run start:dev` → logs `Mapped {/api/companies, POST}`, `{/api/companies, GET}`, `{/api/companies/:id, GET}`, `{/api/companies/:id, PATCH}`, `{/api/companies/:id, DELETE}`, and the five `/api/files` routes unchanged. Run Test Plan steps 1–13.
7. **Regression:** `/api/health`, `/api/users` and Story 02's upload/download/list/delete smoke steps still pass. `npm run migration:revert` twice, then `npm run migration:run` → all succeed.

---

## Done Criteria

- [ ] `Company` (table `companies`) extends `BaseEntity` and has `name`, `registrationNumber`, `city`, `address`, `whatsAppNumber`, `phoneNumber` (`varchar(256)`), `headerUrl`, `footerUrl` (nullable `varchar(512)`), `deletedAt` (`@DeleteDateColumn`).
- [ ] Partial unique index on `registration_number` where `deleted_at IS NULL`; `files.owner_id` is nullable; migrations exist; `synchronize` stays `false`; no drift.
- [ ] All six text fields are required, trimmed, 2–256 chars on create; PATCH accepts any subset with the same rules and rejects `null` for them; unknown fields → 400.
- [ ] Duplicate registration number → 409. Unknown or soft-deleted id → 404; non-uuid id → 400; DELETE soft-deletes and returns 204.
- [ ] `POST /api/files` accepts `ownerType` without `ownerId`; every file response includes `url`; listing still requires both owner params.
- [ ] `headerUrl`/`footerUrl` must be a live JPEG/PNG/WebP file with `ownerType` `companies`, unlinked or already this company's, and not the same file for both; otherwise 400.
- [ ] After create/update, the referenced files have `ownerId` = company id; replaced or cleared images are soft-deleted.
- [ ] `CompaniesModule` imports `FilesModule` and uses only `FilesService` (plus the `FileEntity` type).
- [ ] `src/modules/users/` is unchanged.
- [ ] ESM preserved (`.js` suffixes); `npm run build` and `npm run lint` pass; no test files.

**STOP HERE. Report to the user and wait for confirmation before proceeding to Story 04.**
