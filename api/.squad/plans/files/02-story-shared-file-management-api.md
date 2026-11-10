# Story 02 — Add shared Files module for upload, download, list and delete across all modules

## Prerequisites

- **Story 01 completed:** [../project-structure/01-story-restructure-project-as-clean-modular-monolith-no-ddd-no-test-files.md](../project-structure/01-story-restructure-project-as-clean-modular-monolith-no-ddd-no-test-files.md). This story edits files that Story 01 creates (`src/config/env.validation.ts`, `src/app.module.ts`, `.env.example`, `tsconfig.json`) and follows its users module pattern. **Do not start until `npm run build` passes on the Story 01 result.**
- The **crud-foundation** story (intake only, not planned yet) is **not** a prerequisite. This story does **not** use `BaseRepository` or response DTOs. `FilesRepository` wraps TypeORM `Repository<FileEntity>` directly, as the intake requires. Files need **soft** delete, and crud-foundation's `BaseRepository.delete` is a hard delete.
- Local **PostgreSQL ≥ 13** with the Story 01 migration applied is needed for the runtime verification steps only.

---

## Story Goal

Add a shared, owner-agnostic `files` module under `src/modules/files/` that any business module can use to attach files to its own records:

1. `POST /api/files` stores an uploaded file (multipart field `file` + `ownerType` + `ownerId`) through a pluggable storage backend and saves its metadata in a new `files` table.
2. `GET /api/files/:id`, `GET /api/files/:id/download`, `GET /api/files?ownerType=&ownerId=` and `DELETE /api/files/:id` read, stream, list and soft-delete files.
3. Other modules import `FilesModule` and inject **only** `FilesService`.
4. Storage is behind a single `StorageProvider` interface bound to the `STORAGE_PROVIDER` token. Config selects the implementation; only `LocalStorageProvider` exists.
5. Upload limits (size, MIME types) and the storage location come from validated env config.

**Not in scope:** S3/Azure/GCS providers, hard delete or cleanup jobs, chunked/resumable uploads, presigned URLs, image processing, virus scanning, content sniffing (the client-declared MIME type is trusted), authorization rules (only a marked placeholder), tests, Swagger, Docker, CI/CD. **Do not** refactor the `User` entity onto the new base entity (see Edge Cases).

**Hard constraints for the executor** (same as Story 01):

- Controller → Service → Repository. **No** DDD constructs. `StorageProvider` is the **only** interface introduced.
- `src/modules/files/` **never** imports from another business module (`src/modules/users/`, …).
- ESM: every relative import ends in **`.js`**.
- Constructor-injected classes (`FilesRepository`, `ConfigService`, `Repository`) are **value imports**. `StorageProvider` is an interface used in a decorated constructor, so it **must** be `import type` (required by `isolatedModules` + `emitDecoratorMetadata`).

---

## Context — Read These Files First

1. [Story 01 plan](../project-structure/01-story-restructure-project-as-clean-modular-monolith-no-ddd-no-test-files.md) — the source of truth for the files this story builds on. Read:
   - ~lines 133–205: `src/config/env.validation.ts` (`EnvironmentVariables`, `validateEnv`, the raw-`obj` `@Transform` trick on `DB_LOGGING` at line 183). You will add fields here in the same style.
   - ~lines 207–219: `.env.example` contents.
   - ~lines 225–252: `src/database/database.options.ts`. Line 248 globs `**/*.entity.js` (new entities load automatically if the file name ends in `.entity.ts`); line 249 globs `migrations/*.js`; line 247 sets `uuidExtension: 'pgcrypto'`.
   - ~lines 301–341: hand-written users migration (style, `gen_random_uuid()`, named constraints). The timestamp is `1793404800000`; yours must be larger.
   - ~lines 371–411: `User` entity (snake_case `name:` on columns, `timestamptz` dates, explicit index names).
   - ~lines 461–500, 502–566, 568–621, 623–640: users repository / service / controller / module — **the pattern to copy**.
   - ~lines 672–757: `AllExceptionsFilter`. Every `HttpException` becomes `{ statusCode, error, message, path, timestamp }`, and non-HTTP errors become a logged 500. No changes needed.
   - ~lines 759–781: `src/app.module.ts` (`ConfigModule.forRoot({ isGlobal: true, … })`). You add `FilesModule` to `imports`.
   - ~lines 783–811: `src/main.ts`. Global prefix `api`; `ValidationPipe` with `whitelist`, `forbidNonWhitelisted`, `transform`, `exposeUnsetFields: false`.
   - ~lines 857–872: Story 01 edge cases (`import type` DI pitfall, entity glob, migration drift check).
2. `node_modules/@nestjs/platform-express/multer/multer/multer.utils.js` — `transformException` at line 100: multer `LIMIT_FILE_SIZE` → `PayloadTooLargeException` (line 110), so oversize uploads become **413** with no extra code.
3. `node_modules/@nestjs/platform-express/multer/interfaces/multer-options.interface.d.ts` — `MulterOptions` (line 37): `limits` (line 48) and `defParamCharset` (line 52, default `'latin1'`).
4. `node_modules/@nestjs/platform-express/multer/interceptors/file.interceptor.js` — lines 15–16 and 34: `FileInterceptor` injects `MULTER_MODULE_OPTIONS` (provided by `MulterModule.registerAsync`) and merges it with local options. That is how config-driven limits reach the interceptor.
5. `node_modules/multer/index.js` — lines 83–88: with neither `storage` nor `dest` set, multer uses `memoryStorage()` (`file.buffer`). Multer is `2.5.0` and ships **no** typings, so `@types/multer` is required.
6. `node_modules/@nestjs/common/file-stream/streamable-file.d.ts` — line 16: `constructor(readable: Readable, options?)`. In `interfaces/streamable-options.interface.d.ts`, the options are `type`, `disposition`, `length` (line 21).
7. `.gitignore` — the `# temp directory` block (`.temp`, `.tmp`). Add the storage folder after it. **Do not edit** the squad-kit managed block at the end of the file.
8. `oxlint.json` — default rule set (includes `no-control-regex` and `no-unused-vars`). The regexes below use `\p{…}` classes, and the auth placeholder uses `_`-prefixed params, to stay lint-clean.

---

## Implementation tasks

### 1 — Dependencies and TypeScript types

Run in the repo root:

```bash
npm install -D @types/multer
```

Verified 2026-10-31: `@types/multer@2.3.0` is latest; `@nestjs/platform-express@12.3.2` bundles `multer@2.5.0`. **Do not** add `multer` as a direct dependency; it is only used through `@nestjs/platform-express`.

**File: `tsconfig.json`** — Story 01 sets `"types": ["node"]`. Change it to:

```json
    "types": ["node", "multer"]
```

The explicit `types` list stops `@types/multer` from loading automatically. Without this, `Express.Multer.File` fails with "Cannot find namespace 'Express'… Multer".

### 2 — Config

**File: `src/config/env.validation.ts`** — extend the `class-validator` import with `ArrayNotEmpty`, `IsArray`, `IsMimeType`. Add a `StorageDriver` enum next to `NodeEnv`, and add four fields at the end of `EnvironmentVariables`:

```ts
export enum StorageDriver {
  Local = 'local',
}
```

```ts
  @IsEnum(StorageDriver)
  STORAGE_DRIVER: StorageDriver = StorageDriver.Local;

  @IsString()
  @IsNotEmpty()
  STORAGE_LOCAL_PATH: string = './storage';

  @IsInt()
  @Min(1)
  @Max(100)
  FILE_MAX_SIZE_MB: number = 10;

  // Comma-separated list; read the raw value (implicit conversion does not split strings).
  @Transform(({ obj }) =>
    typeof obj.FILE_ALLOWED_MIME_TYPES === 'string'
      ? obj.FILE_ALLOWED_MIME_TYPES.split(',')
          .map((type: string) => type.trim().toLowerCase())
          .filter((type: string) => type !== '')
      : obj.FILE_ALLOWED_MIME_TYPES,
  )
  @IsArray()
  @ArrayNotEmpty()
  @IsMimeType({ each: true })
  FILE_ALLOWED_MIME_TYPES: string[] = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
  ];
```

`FILE_MAX_SIZE_MB` is capped at **100** because files are buffered in memory (see Edge Cases). `validateEnv` needs no changes: an invalid driver, an empty or malformed MIME list, or a size outside 1–100 makes the app exit at startup.

**File: `.env.example`** — append:

```dotenv

STORAGE_DRIVER=local
STORAGE_LOCAL_PATH=./storage
FILE_MAX_SIZE_MB=10
FILE_ALLOWED_MIME_TYPES=image/jpeg,image/png,image/webp,application/pdf
```

**File: `.gitignore`** — after the `# temp directory` block (`.temp`, `.tmp`), add:

```gitignore

# Local file storage (STORAGE_LOCAL_PATH)
/storage
```

### 3 — Shared base entity

**Create file: `src/common/entities/base.entity.ts`**

```ts
import {
  CreateDateColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export abstract class BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
```

- It is **not** decorated with `@Entity`. TypeORM inherits its columns into each concrete entity. The `**/*.entity.js` glob loads this file too, which is harmless because classes without `@Entity` are ignored.
- **Never** import TypeORM's own Active Record `BaseEntity`. Always import this one from `../../../common/entities/base.entity.js`.
- No `primaryKeyConstraintName`: a shared class cannot name a per-table constraint, so TypeORM's default name is used (see task 5).

### 4 — Entity

**Create file: `src/modules/files/entities/file.entity.ts`**

```ts
import { Column, DeleteDateColumn, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity.js';

@Entity('files')
@Index('IDX_files_owner_type_owner_id', ['ownerType', 'ownerId'])
export class FileEntity extends BaseEntity {
  @Column({ name: 'owner_type', type: 'varchar', length: 50 })
  ownerType: string;

  @Column({ name: 'owner_id', type: 'uuid' })
  ownerId: string;

  @Column({ name: 'original_name', type: 'varchar', length: 255 })
  originalName: string;

  @Index('UQ_files_storage_key', { unique: true })
  @Column({ name: 'storage_key', type: 'varchar', length: 64 })
  storageKey: string;

  @Column({ name: 'mime_type', type: 'varchar', length: 255 })
  mimeType: string;

  @Column({ name: 'size_bytes', type: 'integer' })
  sizeBytes: number;

  @Column({ type: 'char', length: 64 })
  checksum: string;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
```

- `sizeBytes` is `integer`, not `bigint`. `pg` returns `bigint` as a string, and the 100 MB cap fits easily in int4.
- `storageKey` is at most 47 chars (36-char uuid + extension of up to 11 chars).

### 5 — Migration

Preferred (needs a running DB): after tasks 3–4, run `npm run migration:generate -- src/database/migrations/CreateFilesTable` and keep the generated file.

If no DB is available, **create file: `src/database/migrations/1793408400000-CreateFilesTable.ts`** by hand (timestamp is 1 h after the users migration):

```ts
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFilesTable1793408400000 implements MigrationInterface {
  name = 'CreateFilesTable1793408400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "files" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "owner_type" character varying(50) NOT NULL,
        "owner_id" uuid NOT NULL,
        "original_name" character varying(255) NOT NULL,
        "storage_key" character varying(64) NOT NULL,
        "mime_type" character varying(255) NOT NULL,
        "size_bytes" integer NOT NULL,
        "checksum" character(64) NOT NULL,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_6c16b9093a142e0e7613b04a3d9" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_files_storage_key" ON "files" ("storage_key")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_files_owner_type_owner_id" ON "files" ("owner_type", "owner_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_files_owner_type_owner_id"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_files_storage_key"`);
    await queryRunner.query(`DROP TABLE "files"`);
  }
}
```

`PK_6c16b9093a142e0e7613b04a3d9` is TypeORM's `DefaultNamingStrategy.primaryKeyName('files', ['id'])` = `"PK_" + sha1("files_id").substring(0, 27)`, computed on 2026-10-31. Before relying on it, confirm the formula: grep for `primaryKeyName` in `node_modules/typeorm/naming-strategy/DefaultNamingStrategy.js`.

### 6 — Storage abstraction (`src/modules/files/storage/`)

**Create file: `src/modules/files/storage/storage-provider.interface.ts`**

```ts
import type { Readable } from 'node:stream';

export interface StorageProvider {
  save(key: string, data: Buffer): Promise<void>;
  getStream(key: string): Promise<Readable>;
  delete(key: string): Promise<void>;
}
```

**Create file: `src/modules/files/storage/storage.constants.ts`**

```ts
export const STORAGE_PROVIDER = Symbol('STORAGE_PROVIDER');
```

**Create file: `src/modules/files/storage/local-storage.provider.ts`** — a plain class, **not** `@Injectable()`. The module factory in task 9 constructs it.

```ts
import { mkdir, open, rm, writeFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import type { Readable } from 'node:stream';
import type { StorageProvider } from './storage-provider.interface.js';

export class LocalStorageProvider implements StorageProvider {
  private readonly basePath: string;

  constructor(basePath: string) {
    this.basePath = resolve(basePath);
  }

  async save(key: string, data: Buffer): Promise<void> {
    await mkdir(this.basePath, { recursive: true });
    // 'wx' fails instead of overwriting if the key already exists.
    await writeFile(this.pathFor(key), data, { flag: 'wx' });
  }

  async getStream(key: string): Promise<Readable> {
    // Opening first makes a missing file fail here, before any response bytes are sent.
    const handle = await open(this.pathFor(key), 'r');
    return handle.createReadStream();
  }

  async delete(key: string): Promise<void> {
    await rm(this.pathFor(key), { force: true });
  }

  private pathFor(key: string): string {
    const path = resolve(this.basePath, key);
    if (!path.startsWith(this.basePath + sep)) {
      throw new Error(`Invalid storage key: ${key}`);
    }
    return path;
  }
}
```

`handle.createReadStream()` closes the handle automatically (`autoClose` defaults to `true`).

### 7 — DTOs

**Create file: `src/modules/files/dto/upload-file.dto.ts`**

```ts
import { IsString, IsUUID, Matches } from 'class-validator';

export class UploadFileDto {
  // Owning module's name, e.g. "users", "trips", "trip-bookings".
  @IsString()
  @Matches(/^[a-z][a-z0-9-]{0,49}$/, {
    message:
      'ownerType must be 1-50 lowercase letters, digits or dashes, starting with a letter',
  })
  ownerType: string;

  @IsUUID()
  ownerId: string;
}
```

**Create file: `src/modules/files/dto/list-files-query.dto.ts`** — same fields and rules, both required:

```ts
import { UploadFileDto } from './upload-file.dto.js';

export class ListFilesQueryDto extends UploadFileDto {}
```

### 8 — Repository and service

**Create file: `src/modules/files/files.repository.ts`** — data access only. TypeORM `find*` methods skip rows with `deleted_at` set automatically because the entity has a `@DeleteDateColumn`. **Do not** pass `withDeleted: true`.

```ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { FileEntity } from './entities/file.entity.js';

@Injectable()
export class FilesRepository {
  constructor(
    @InjectRepository(FileEntity)
    private readonly repository: Repository<FileEntity>,
  ) {}

  findById(id: string): Promise<FileEntity | null> {
    return this.repository.findOneBy({ id });
  }

  findByOwner(ownerType: string, ownerId: string): Promise<FileEntity[]> {
    return this.repository.find({
      where: { ownerType, ownerId },
      order: { createdAt: 'DESC' },
    });
  }

  create(data: DeepPartial<FileEntity>): Promise<FileEntity> {
    return this.repository.save(this.repository.create(data));
  }

  async softDelete(id: string): Promise<void> {
    await this.repository.softDelete({ id });
  }
}
```

**Create file: `src/modules/files/files.service.ts`** — all rules live here. This is the module's public API.

```ts
import { createHash, randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import type { Readable } from 'node:stream';
import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvironmentVariables } from '../../config/env.validation.js';
import { FileEntity } from './entities/file.entity.js';
import { FilesRepository } from './files.repository.js';
import type { StorageProvider } from './storage/storage-provider.interface.js';
import { STORAGE_PROVIDER } from './storage/storage.constants.js';

/** What `upload` needs from a file. `Express.Multer.File` satisfies it. */
export type UploadableFile = Pick<
  Express.Multer.File,
  'originalname' | 'mimetype' | 'buffer'
>;

export interface FileDownload {
  file: FileEntity;
  stream: Readable;
}

const BYTES_PER_MB = 1024 * 1024;
const MAX_ORIGINAL_NAME_LENGTH = 255;

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);
  private readonly maxSizeMb: number;
  private readonly allowedMimeTypes: ReadonlySet<string>;

  constructor(
    private readonly filesRepository: FilesRepository,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
    config: ConfigService<EnvironmentVariables, true>,
  ) {
    this.maxSizeMb = config.get('FILE_MAX_SIZE_MB', { infer: true });
    this.allowedMimeTypes = new Set(
      config.get('FILE_ALLOWED_MIME_TYPES', { infer: true }),
    );
  }

  async upload(
    file: UploadableFile | undefined,
    ownerType: string,
    ownerId: string,
  ): Promise<FileEntity> {
    this.assertCanAccess(ownerType, ownerId);

    if (!file || file.buffer.length === 0) {
      throw new BadRequestException('A non-empty "file" is required');
    }
    if (file.buffer.length > this.maxSizeMb * BYTES_PER_MB) {
      throw new PayloadTooLargeException(
        `File exceeds the ${this.maxSizeMb} MB limit`,
      );
    }
    const mimeType = file.mimetype.toLowerCase();
    if (!this.allowedMimeTypes.has(mimeType)) {
      throw new UnsupportedMediaTypeException(
        `File type "${mimeType}" is not allowed`,
      );
    }

    const originalName = this.sanitizeFileName(file.originalname);
    const storageKey = `${randomUUID()}${this.safeExtension(originalName)}`;
    const checksum = createHash('sha256').update(file.buffer).digest('hex');

    await this.storage.save(storageKey, file.buffer);
    try {
      return await this.filesRepository.create({
        ownerType,
        ownerId,
        originalName,
        storageKey,
        mimeType,
        sizeBytes: file.buffer.length,
        checksum,
      });
    } catch (error) {
      // No orphans: the row was not written, so remove the stored bytes.
      await this.storage.delete(storageKey).catch((cleanupError: unknown) => {
        this.logger.error(
          `Failed to remove orphan file ${storageKey}`,
          cleanupError instanceof Error ? cleanupError.stack : cleanupError,
        );
      });
      throw error;
    }
  }

  async findById(id: string): Promise<FileEntity> {
    const file = await this.filesRepository.findById(id);
    if (!file) {
      throw new NotFoundException(`File ${id} not found`);
    }
    this.assertCanAccess(file.ownerType, file.ownerId);
    return file;
  }

  async findByOwner(ownerType: string, ownerId: string): Promise<FileEntity[]> {
    this.assertCanAccess(ownerType, ownerId);
    return this.filesRepository.findByOwner(ownerType, ownerId);
  }

  async getStream(id: string): Promise<FileDownload> {
    const file = await this.findById(id);
    return { file, stream: await this.storage.getStream(file.storageKey) };
  }

  async remove(id: string): Promise<void> {
    const file = await this.findById(id);
    await this.filesRepository.softDelete(file.id);
  }

  // AUTHZ (auth story): the single place to check that the current user may
  // read/write files of this owner. Every public method calls it. Not implemented yet.
  private assertCanAccess(_ownerType: string, _ownerId: string): void {}

  private sanitizeFileName(name: string): string {
    const baseName = name.split(/[\\/]/).pop() ?? '';
    const cleaned = baseName
      .normalize('NFC')
      .replace(/[\p{Cc}\p{Cf}]/gu, '')
      .trim();
    const truncated = Array.from(cleaned)
      .slice(0, MAX_ORIGINAL_NAME_LENGTH)
      .join('');
    return truncated === '' || truncated === '.' || truncated === '..'
      ? 'file'
      : truncated;
  }

  private safeExtension(fileName: string): string {
    const extension = extname(fileName).toLowerCase();
    return /^\.[a-z0-9]{1,10}$/.test(extension) ? extension : '';
  }
}
```

- `sanitizeFileName` removes path parts (`../../x.pdf` → `x.pdf`), control and format characters (including bidi overrides such as U+202E), and limits the name to 255 code points. The result is **metadata only**; it never reaches the file system.
- `upload` takes the file's size from `buffer.length` and ignores the client's `size`. The size and MIME checks repeat the HTTP-layer limits on purpose, so callers from other modules (no multer involved) get the same rules.

### 9 — Controller and module

**Create file: `src/modules/files/files.controller.ts`** — HTTP only.

```ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ListFilesQueryDto } from './dto/list-files-query.dto.js';
import { UploadFileDto } from './dto/upload-file.dto.js';
import { FileEntity } from './entities/file.entity.js';
import { FilesService } from './files.service.js';

@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: UploadFileDto,
  ): Promise<FileEntity> {
    return this.filesService.upload(file, dto.ownerType, dto.ownerId);
  }

  @Get()
  findByOwner(@Query() query: ListFilesQueryDto): Promise<FileEntity[]> {
    return this.filesService.findByOwner(query.ownerType, query.ownerId);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<FileEntity> {
    return this.filesService.findById(id);
  }

  @Get(':id/download')
  @Header('X-Content-Type-Options', 'nosniff')
  async download(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<StreamableFile> {
    const { file, stream } = await this.filesService.getStream(id);
    return new StreamableFile(stream, {
      type: file.mimeType,
      disposition: toContentDisposition(file.originalName),
      length: file.sizeBytes,
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.filesService.remove(id);
  }
}

// RFC 6266: ASCII fallback in `filename`, exact UTF-8 name in `filename*` (RFC 5987).
function toContentDisposition(fileName: string): string {
  const fallback = fileName.replace(/[^\x20-\x7e]|["\\]/g, '_');
  const encoded = encodeURIComponent(fileName).replace(
    /['()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}
```

- The `201` comes from `@Post()`'s default status. As in Story 01's users controller, endpoints return the entity.
- The disposition is always `attachment` (never `inline`), and `nosniff` is set. Together they stop an uploaded HTML or SVG file from rendering in the API's origin.

**Create file: `src/modules/files/files.module.ts`** — exports **only** `FilesService`.

```ts
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  StorageDriver,
  type EnvironmentVariables,
} from '../../config/env.validation.js';
import { FileEntity } from './entities/file.entity.js';
import { FilesController } from './files.controller.js';
import { FilesRepository } from './files.repository.js';
import { FilesService } from './files.service.js';
import { LocalStorageProvider } from './storage/local-storage.provider.js';
import type { StorageProvider } from './storage/storage-provider.interface.js';
import { STORAGE_PROVIDER } from './storage/storage.constants.js';

function createStorageProvider(
  config: ConfigService<EnvironmentVariables, true>,
): StorageProvider {
  const driver = config.get('STORAGE_DRIVER', { infer: true });
  switch (driver) {
    case StorageDriver.Local:
      return new LocalStorageProvider(
        config.get('STORAGE_LOCAL_PATH', { infer: true }),
      );
    default:
      throw new Error(`Unsupported storage driver: ${String(driver)}`);
  }
}

@Module({
  imports: [
    TypeOrmModule.forFeature([FileEntity]),
    MulterModule.registerAsync({
      inject: [ConfigService],
      // No `storage`/`dest`: multer keeps the upload in memory (`file.buffer`).
      useFactory: (config: ConfigService<EnvironmentVariables, true>) => ({
        defParamCharset: 'utf8',
        limits: {
          fileSize: config.get('FILE_MAX_SIZE_MB', { infer: true }) * 1024 * 1024,
          files: 1,
        },
      }),
    }),
  ],
  controllers: [FilesController],
  providers: [
    FilesService,
    FilesRepository,
    {
      provide: STORAGE_PROVIDER,
      inject: [ConfigService],
      useFactory: createStorageProvider,
    },
  ],
  exports: [FilesService],
})
export class FilesModule {}
```

- `ConfigService` resolves without importing `ConfigModule` because Story 01 registers it with `isGlobal: true`.
- `defParamCharset: 'utf8'` makes multer decode non-ASCII filenames correctly (its default `latin1` produces mojibake such as `ØªÙØ±ÙØ±.pdf`).

**File: `src/app.module.ts`** — import `FilesModule` from `./modules/files/files.module.js` and add it to `imports` after `UsersModule`.

Final layout (nothing else in this folder):

```text
src/common/entities/base.entity.ts
src/database/migrations/1793408400000-CreateFilesTable.ts   (or the generated one)
src/modules/files/
├── files.module.ts
├── files.controller.ts
├── files.service.ts
├── files.repository.ts
├── dto/
│   ├── upload-file.dto.ts
│   └── list-files-query.dto.ts
├── entities/
│   └── file.entity.ts
└── storage/
    ├── storage-provider.interface.ts
    ├── storage.constants.ts
    └── local-storage.provider.ts
```

### 10 — How other modules use it (documentation only, no code in this story)

A business module adds `FilesModule` to its `imports` and injects `FilesService`, e.g. `this.filesService.findByOwner('trips', trip.id)`. It never imports `FilesRepository`, `STORAGE_PROVIDER` or anything under `storage/`. Add this paragraph as a JSDoc comment above `export class FilesService`.

---

## Edge Cases & Failure Modes

- **No file part / non-multipart request** → multer leaves `file` `undefined` → `400 A non-empty "file" is required` from `FilesService.upload` (`files.service.ts`).
- **Zero-byte file** → same `400` (checked via `buffer.length === 0`).
- **File larger than `FILE_MAX_SIZE_MB`** → multer stops reading at `limits.fileSize` and raises `LIMIT_FILE_SIZE`, which `transformException` (`multer.utils.js` line 110) turns into **413**. The repeated check in the service covers non-HTTP callers.
- **MIME type not in `FILE_ALLOWED_MIME_TYPES`** → **415** `File type "x/y" is not allowed`. The type is the **client-declared** part header (`file.mimetype`), not sniffed content. Content sniffing is out of scope (virus-scanning story). The download sends `attachment` and `nosniff` to limit the impact of a lying client.
- **Wrong field name (e.g. `upload` instead of `file`) or more than one file** → multer `LIMIT_UNEXPECTED_FILE` / `LIMIT_FILE_COUNT` → **400** via `transformException`.
- **`multipart/mixed` or another non-form multipart type** → **415** via `transformException` line 137.
- **Invalid `ownerType`/`ownerId`** (uppercase, spaces, non-uuid, missing) on upload or list → **400** from `ValidationPipe`. **Extra form fields** → 400 (`forbidNonWhitelisted`). The file has already been buffered in memory but nothing is written to disk, because the handler never runs.
- **Malicious filename** (`../../etc/passwd`, `C:\x\y.pdf`, U+202E bidi override, 1 000 chars) → only the sanitized base name is stored in `original_name`. The on-disk name is always `<uuid><ext>`. `LocalStorageProvider.pathFor` rejects any key that resolves outside the base path, as defense in depth.
- **Non-ASCII filename** (`تقرير.pdf`) → decoded as UTF-8 thanks to `defParamCharset: 'utf8'`. Download sends `filename="_____.pdf"` plus `filename*=UTF-8''%D8%AA…`, and browsers use `filename*`.
- **DB insert fails after `storage.save`** (DB down, constraint violation) → the `catch` in `upload` deletes the stored file, then rethrows → 500, or 409 for a unique violation (via `AllExceptionsFilter`). If the cleanup itself fails, the original error is still thrown and the orphan key is logged at `error` level.
- **Storage key collision** → `writeFile` with flag `wx` throws `EEXIST` instead of overwriting → 500. With uuid v4 this is practically impossible. The unique index `UQ_files_storage_key` also guards the DB side.
- **Unknown or soft-deleted id** on GET, download or DELETE → `findOneBy` excludes soft-deleted rows → **404** `File <id> not found`. A second DELETE of the same id → 404.
- **Non-UUID `:id`** → **400** from `ParseUUIDPipe`.
- **Row exists but the bytes are missing on disk** (manual deletion, wrong `STORAGE_LOCAL_PATH`) → `open()` in `LocalStorageProvider.getStream` throws `ENOENT` **before** headers are sent → logged **500** via `AllExceptionsFilter`. This is deliberate: it is a server-side inconsistency, not a client error.
- **`STORAGE_LOCAL_PATH` relative** → resolved against the **process cwd** (`resolve()` in the provider constructor). Start the app from the repo root, or use an absolute path in production. The folder is created on first upload (`mkdir recursive`).
- **Invalid config** (`STORAGE_DRIVER=s3`, `FILE_MAX_SIZE_MB=0` or `500`, `FILE_ALLOWED_MIME_TYPES=` or `pdf`) → `validateEnv` throws `Invalid environment variables` at startup.
- **Memory pressure** → memory storage buffers the whole file. The worst case is roughly concurrent uploads × `FILE_MAX_SIZE_MB`. The 100 MB cap in config bounds it. Streaming/chunked upload is out of scope.
- **`import type` for `StorageProvider`** → required, because a plain import of an interface in a decorated constructor fails to compile under `isolatedModules` + `emitDecoratorMetadata` (TS1272). `FilesRepository` and `ConfigService` stay **value** imports (Story 01 edge case, plan line 868).
- **`Cannot find namespace 'Express'` / `Multer`** at build time → `"multer"` is missing from `tsconfig.json` `types` (task 1).
- **Base entity and `User`** → `User` keeps its own columns and `PK_users_id`. Moving it onto `BaseEntity` would make `migration:generate` rename that constraint. Leave this to a later story (crud-foundation or a dedicated refactor).
- **Hand-written migration drift** → after applying it, run `npm run migration:generate -- src/database/migrations/Check`. It must report **no changes**. If it emits SQL (e.g. a PK rename because the default PK name differs), delete the generated file and copy the constraint name it shows into `1793408400000-CreateFilesTable.ts`.
- **Response exposes `storageKey`, `checksum`, `deletedAt`** → accepted for now (consistent with Story 01 returning entities). The key is not secret: only `FilesService` can turn it into bytes. Response DTOs arrive with the crud-foundation story.

---

## Test Plan

No automated tests: the intake forbids test files, and Story 01 removed the test tooling. Verify with manual smoke tests against a running app (`BASE=http://localhost:3000/api`; create fixtures in the repo root, outside `src/`, and delete them afterwards):

```bash
node -e "require('fs').writeFileSync('sample.pdf', '%PDF-1.4 sample')"
node -e "require('fs').writeFileSync('empty.pdf', '')"
node -e "require('fs').writeFileSync('big.pdf', Buffer.alloc(11 * 1024 * 1024))"
OWNER=11111111-1111-4111-8111-111111111111
```

1. **Upload OK:** `curl -i -F "file=@sample.pdf;type=application/pdf" -F ownerType=trips -F ownerId=$OWNER $BASE/files` → `201`, body has `id`, `originalName: "sample.pdf"`, `mimeType`, `sizeBytes: 15`, 64-char `checksum`, `deletedAt: null`. `./storage/` contains `<uuid>.pdf`.
2. **Missing file:** same without `-F file=…` → `400`. **Empty file:** `empty.pdf` → `400`.
3. **Oversize:** `big.pdf` with default `FILE_MAX_SIZE_MB=10` → `413`, error-filter shape.
4. **Disallowed type:** `-F "file=@sample.pdf;type=text/html"` → `415`.
5. **Bad owner:** `ownerType=Trips` → `400`; `ownerId=abc` → `400`; extra `-F foo=1` → `400`.
6. **Filename sanitizing:** `-F "file=@sample.pdf;type=application/pdf;filename=../../evil.pdf"` → `originalName: "evil.pdf"`, and the stored file name is a uuid.
7. **Get by id:** `GET $BASE/files/<id>` → `200`; `GET $BASE/files/not-a-uuid` → `400`; random uuid → `404`.
8. **Download:** `curl -i $BASE/files/<id>/download` → `200`, `Content-Type: application/pdf`, `Content-Length: 15`, `Content-Disposition: attachment; filename="sample.pdf"; filename*=UTF-8''sample.pdf`, `X-Content-Type-Options: nosniff`, body `%PDF-1.4 sample`.
9. **Unicode name:** upload with `filename=تقرير.pdf`, then download → `filename*=UTF-8''%D8%AA%D9%82%D8%B1%D9%8A%D8%B1.pdf`.
10. **List:** `GET "$BASE/files?ownerType=trips&ownerId=$OWNER"` → array, newest first. Missing either param → `400`.
11. **Delete:** `curl -i -X DELETE $BASE/files/<id>` → `204`. Afterwards GET, download and DELETE → `404`, and the list no longer contains it. In SQL, `SELECT deleted_at FROM files WHERE id = '<id>'` is not null, and the file still exists in `./storage/`.
12. **Orphan cleanup:** with the app running, stop PostgreSQL, then upload `sample.pdf` → `500`. The count of files in `./storage/` is unchanged. Restart PostgreSQL.
13. **Fail fast:** set `STORAGE_DRIVER=s3` in `.env`, then `npm run start` → exits with `Invalid environment variables`. Restore the value.

---

## Migration / Rollback

- Schema: one migration creates table `files`, unique index `UQ_files_storage_key` and index `IDX_files_owner_type_owner_id`. `npm run migration:revert` drops them in reverse order. **Reverting deletes all file metadata.** The bytes under `STORAGE_LOCAL_PATH` stay and become orphans, so back up the table first in any shared environment.
- Half-applied state: PostgreSQL runs each TypeORM migration in a transaction, so a failed `up` leaves nothing behind.
- Code rollback: revert the commit and run `npm install` (drops `@types/multer`). The new env vars are then ignored, so `.env` needs no changes.

---

## Verification Steps

1. **Backend builds:** in the repo root, `npm run build` → no errors. `dist/modules/files/entities/file.entity.js` and `dist/database/migrations/1793408400000-CreateFilesTable.js` (or the generated name) exist.
2. **Lint:** `npm run lint` → no errors.
3. **Boundaries:** `grep -rn "modules/users\|\.\./users" src/modules/files` → no output. `grep -n "exports" src/modules/files/files.module.ts` → `exports: [FilesService]` only.
4. **No test artifacts:** `git ls-files | grep -Ei "spec|vitest|test/"` → no output (PowerShell: `git ls-files | Select-String -Pattern 'spec|vitest|test/'`). `nest-cli.json` still has `"generateOptions": { "spec": false }`.
5. **Database:** `npm run migration:show` → `CreateFilesTable…` pending. `npm run migration:run` → applied. Then `npm run migration:generate -- src/database/migrations/Check` → "No changes in database schema were found".
6. **Backend runs:** copy the new keys from `.env.example` into `.env`, run `npm run start:dev` → logs `Mapped {/api/files, POST}`, `{/api/files, GET}`, `{/api/files/:id, GET}`, `{/api/files/:id/download, GET}`, `{/api/files/:id, DELETE}`. Run Test Plan steps 1–13.
7. **Gitignore:** after an upload, `git status --short` does not list `storage/`.
8. **Regression:** Story 01 smoke steps for `/api/health` and `/api/users` still pass. `npm run migration:revert` then `npm run migration:run` → both succeed.

---

## Done Criteria

- [ ] `src/common/entities/base.entity.ts` (`id` uuid, `createdAt`, `updatedAt`) exists; `FileEntity` extends it; `User` is unchanged.
- [ ] `FileEntity` (table `files`) has `ownerType`, `ownerId` (uuid), `originalName`, `storageKey` (unique), `mimeType`, `sizeBytes`, `checksum` (sha256 hex), `deletedAt` (`@DeleteDateColumn`), plus an index on (`owner_type`, `owner_id`).
- [ ] A migration creates the table; `synchronize` stays `false`; `migration:generate` reports no drift.
- [ ] `STORAGE_DRIVER` (only `local`), `STORAGE_LOCAL_PATH`, `FILE_MAX_SIZE_MB`, `FILE_ALLOWED_MIME_TYPES` are typed and validated in `EnvironmentVariables`; invalid values stop startup; `.env.example` updated; `/storage` gitignored.
- [ ] Upload uses `FileInterceptor('file')` with memory storage and the size limit from config (via `MulterModule.registerAsync`).
- [ ] Missing or empty file → 400; oversize → 413; disallowed MIME → 415 with a clear message.
- [ ] Original filename is sanitized and stored only as metadata; on-disk name is `<uuid><ext>`.
- [ ] A failed DB insert removes the stored file (no orphans).
- [ ] GET and download return 404 for unknown or soft-deleted ids; download uses `StreamableFile` with `Content-Type`, `Content-Length` and an RFC 5987-encoded `Content-Disposition`.
- [ ] List requires valid `ownerType` and `ownerId` and excludes soft-deleted rows.
- [ ] DELETE soft-deletes (row kept, bytes kept) and returns 204.
- [ ] `FilesModule` exports only `FilesService`; `StorageProvider` is bound to `STORAGE_PROVIDER` via a config-driven factory; only `LocalStorageProvider` exists.
- [ ] Nothing under `src/modules/files` imports another business module.
- [ ] One clearly marked `assertCanAccess` placeholder in `FilesService`, called by every public method, with no logic.
- [ ] All errors use the `AllExceptionsFilter` shape.
- [ ] No DDD constructs; `StorageProvider` is the only new interface.
- [ ] ESM preserved (`.js` suffixes); `npm run build` and `npm run lint` pass; no test files; spec generation still disabled.

**STOP HERE. Report to the user and wait for confirmation before proceeding to Story 03.**
