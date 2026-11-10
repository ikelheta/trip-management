# Story 01 — Restructure project as Clean Modular Monolith (no DDD, no test files)

## Prerequisites

- None. This is the first story; it operates on the freshly generated NestJS 12 project at the repo root.
- Local **PostgreSQL ≥ 13** is required only for the runtime verification steps (`gen_random_uuid()` is built in from PG 13). Build and lint do not need a database.
- Node **v24** (verified `v24.13.0`). `import.meta.dirname` and `process.loadEnvFile()` are used and require Node ≥ 20.12.

---

## Story Goal

Turn the generated Nest starter into the foundation of a production-ready **Modular Monolith** using pragmatic Clean Architecture — **no DDD**:

1. All test files and test tooling are removed, and `nest g` no longer generates spec files.
2. `src/` is organized as `common/`, `config/`, `database/`, `modules/`, `app.module.ts`, `main.ts`.
3. Environment config is typed and validated at startup (fail fast).
4. PostgreSQL is wired through TypeORM with `synchronize: false` and a working migration workflow.
5. A **users** module implements CRUD as the reference pattern: **Controller → Service → Repository → Entity**.
6. The default `AppController`/`AppService` "Hello World" is replaced by a minimal health endpoint.

**Not in scope:** auth (JWT, guards, password hashing), trips/orders or any other business module, tests of any kind, Docker/CI, Swagger.

**Hard constraints for the executor:**

- **Do not** introduce aggregates, value objects, domain events, factories, rich domain models, domain layers, or repository interfaces. The repository is a concrete `@Injectable()` class.
- **Do not** create empty folders or files that hold nothing. `dto/`, `entities/`, `enums/` exist in `users/` because they hold files; **no `interfaces/` folder** is created in this story.
- **Keep ESM**: `"type": "module"` stays, every relative import ends in **`.js`**, `module: nodenext` stays.
- Classes injected via constructor (services, repositories, `Repository`, `ConfigService`, `HttpAdapterHost`) must be **value imports**, never `import type` — `emitDecoratorMetadata` needs the runtime reference.

---

## Context — Read These Files First

1. `package.json` — lines 9–23 are `scripts` (test scripts at 18–22, `format` at 12 and `lint` at 17 reference `test/`); lines 31–47 are `devDependencies` (test-only packages at 35, 38, 39, 43, 45, 46). Line 8 `"type": "module"` must stay.
2. `tsconfig.json` — line 20 `"types": ["vitest/globals", "node"]`; lines 2–4 show `nodenext` ESM; line 18–19 `strict: true` with `strictPropertyInitialization: false` (DTO/entity fields without initializers are fine).
3. `tsconfig.build.json` — line 7 `exclude` still lists `test` and `**/*spec.ts`.
4. `nest-cli.json` — whole file (8 lines); no `generateOptions` yet.
5. `src/main.ts` — lines 1–8: `bootstrap()` with top-level `await bootstrap();` (ESM). Keep the top-level await style.
6. `src/app.module.ts` — lines 1–10: wires `AppController`/`AppService`; will be rewritten.
7. `src/app.controller.ts`, `src/app.service.ts` — the Hello World pair; both get deleted.
8. `src/app.controller.spec.ts`, `test/app.e2e-spec.ts`, `vitest.config.ts`, `vitest.config.e2e.ts` — all deleted.
9. `.gitignore` — line 42 already ignores `.env`; lines 21–23 are the `# Tests` block (`/coverage`, `/.nyc_output`); lines 61–68 are the squad-kit managed block — **do not edit it**.
10. `README.md` — lines 47–58 "Run tests" section references removed scripts.
11. `.prettierrc` — single quotes, trailing commas. All new code follows it.
12. `oxlint.json` — lint rules; `no-floating-promises` is `warn`.

---

## Implementation tasks

### 1 — Remove test files and tooling

Delete:

- `src/app.controller.spec.ts`
- `test/` (whole folder; only contains `app.e2e-spec.ts`)
- `vitest.config.ts`
- `vitest.config.e2e.ts`

Run in the repo root:

```bash
npm uninstall vitest @vitest/coverage-v8 @nestjs/testing supertest @types/supertest vite-tsconfig-paths
```

**File: `tsconfig.json`** — line 20 becomes:

```json
    "types": ["node"]
```

**File: `tsconfig.build.json`** — line 7 becomes:

```json
  "exclude": ["node_modules", "dist"]
```

**File: `nest-cli.json`** — replace whole file:

```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "generateOptions": {
    "spec": false
  },
  "compilerOptions": {
    "deleteOutDir": true
  }
}
```

**File: `.gitignore`** — delete lines 21–23 (`# Tests`, `/coverage`, `/.nyc_output`) and the blank line after them. Leave everything else, especially the squad-kit block.

**File: `README.md`** — replace the "Run tests" section (lines 47–58) with the "Database migrations" section from task 9.

### 2 — Install runtime dependencies

```bash
npm install @nestjs/config @nestjs/typeorm typeorm pg class-validator class-transformer @nestjs/mapped-types
```

Verified on 2026-10-31: `@nestjs/typeorm@12.0.2` (peer `typeorm ^0.3.0 || ^1.0.0-dev`), `typeorm@1.1.2` (latest), `@nestjs/config@12.0.1`, `class-validator@0.15.1`, `class-transformer@0.5.1`, `@nestjs/mapped-types@12.0.0`, `pg@8.23.1`.

### 3 — `package.json` scripts

**File: `package.json`** — replace the `scripts` block (lines 9–23) with:

```json
  "scripts": {
    "build": "nest build",
    "deploy": "nest deploy",
    "format": "prettier --write \"src/**/*.ts\"",
    "start": "nest start",
    "start:dev": "nest start --watch",
    "start:debug": "nest start --debug --watch",
    "start:prod": "node dist/main",
    "lint": "oxlint src/",
    "migration:create": "typeorm migration:create",
    "migration:generate": "npm run build && typeorm migration:generate -d dist/database/data-source.js",
    "migration:run": "npm run build && typeorm migration:run -d dist/database/data-source.js",
    "migration:revert": "npm run build && typeorm migration:revert -d dist/database/data-source.js",
    "migration:show": "npm run build && typeorm migration:show -d dist/database/data-source.js"
  },
```

Migrations run against the **compiled** data source in `dist/` — no ts-node/ESM loader is needed.

### 4 — Config (`src/config/`)

**Create file: `src/config/env.validation.ts`**

```ts
import { plainToInstance, Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  Min,
  validateSync,
} from 'class-validator';

export enum NodeEnv {
  Development = 'development',
  Production = 'production',
}

export class EnvironmentVariables {
  @IsEnum(NodeEnv)
  NODE_ENV: NodeEnv = NodeEnv.Development;

  @IsInt()
  @Min(1)
  @Max(65535)
  PORT: number = 3000;

  @IsString()
  @IsNotEmpty()
  DB_HOST: string;

  @IsInt()
  @Min(1)
  @Max(65535)
  DB_PORT: number = 5432;

  @IsString()
  @IsNotEmpty()
  DB_USERNAME: string;

  @IsString()
  DB_PASSWORD: string;

  @IsString()
  @IsNotEmpty()
  DB_NAME: string;

  // Implicit conversion turns "false" into true, so read the raw value.
  @Transform(({ obj }) => obj.DB_LOGGING === true || obj.DB_LOGGING === 'true')
  @IsBoolean()
  DB_LOGGING: boolean = false;
}

export function validateEnv(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const env = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(env);

  if (errors.length > 0) {
    const details = errors
      .map((error) => Object.values(error.constraints ?? {}).join(', '))
      .join('\n');
    throw new Error(`Invalid environment variables:\n${details}`);
  }

  return env;
}
```

**Create file: `.env.example`** (repo root, committed):

```dotenv
NODE_ENV=development
PORT=3000

DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=trip_management
DB_LOGGING=false
```

Copy it to `.env` locally (`.env` is already ignored at `.gitignore` line 42).

### 5 — Database (`src/database/`)

**Create file: `src/database/database.options.ts`** — single source of truth for TypeORM options, shared by Nest and the CLI.

```ts
import { join } from 'node:path';
import type { DataSourceOptions } from 'typeorm';
import type { EnvironmentVariables } from '../config/env.validation.js';

export type DatabaseEnv = Pick<
  EnvironmentVariables,
  'DB_HOST' | 'DB_PORT' | 'DB_USERNAME' | 'DB_PASSWORD' | 'DB_NAME' | 'DB_LOGGING'
>;

export function buildDataSourceOptions(env: DatabaseEnv): DataSourceOptions {
  return {
    type: 'postgres',
    host: env.DB_HOST,
    port: env.DB_PORT,
    username: env.DB_USERNAME,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    logging: env.DB_LOGGING,
    synchronize: false,
    uuidExtension: 'pgcrypto',
    entities: [join(import.meta.dirname, '..', '**', '*.entity.js')],
    migrations: [join(import.meta.dirname, 'migrations', '*.js')],
  };
}
```

After installing, confirm the `uuidExtension` option exists: grep for `uuidExtension` in `node_modules/typeorm/driver/postgres/PostgresConnectionOptions.d.ts`. If it is absent, delete that one line (the migration in task 6 still works on PG ≥ 13).

**Create file: `src/database/database.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { EnvironmentVariables } from '../config/env.validation.js';
import { buildDataSourceOptions } from './database.options.js';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvironmentVariables, true>) =>
        buildDataSourceOptions({
          DB_HOST: config.get('DB_HOST', { infer: true }),
          DB_PORT: config.get('DB_PORT', { infer: true }),
          DB_USERNAME: config.get('DB_USERNAME', { infer: true }),
          DB_PASSWORD: config.get('DB_PASSWORD', { infer: true }),
          DB_NAME: config.get('DB_NAME', { infer: true }),
          DB_LOGGING: config.get('DB_LOGGING', { infer: true }),
        }),
    }),
  ],
})
export class DatabaseModule {}
```

**Create file: `src/database/data-source.ts`** — used only by the TypeORM CLI (must default-export exactly one `DataSource`).

```ts
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { validateEnv } from '../config/env.validation.js';
import { buildDataSourceOptions } from './database.options.js';

try {
  process.loadEnvFile();
} catch {
  // No .env file: rely on variables already set in the environment.
}

export default new DataSource(buildDataSourceOptions(validateEnv(process.env)));
```

### 6 — Initial migration

Preferred (needs a running DB): after task 7 is done, run `npm run migration:generate -- src/database/migrations/CreateUsersTable` and keep the generated file.

If no DB is available, **create file: `src/database/migrations/1793404800000-CreateUsersTable.ts`** by hand — it matches the entity in task 7 exactly (constraint and index names included):

```ts
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsersTable1793404800000 implements MigrationInterface {
  name = 'CreateUsersTable1793404800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."users_role_enum" AS ENUM('admin', 'user')`,
    );
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "email" character varying(255) NOT NULL,
        "first_name" character varying(100) NOT NULL,
        "last_name" character varying(100) NOT NULL,
        "role" "public"."users_role_enum" NOT NULL DEFAULT 'user',
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_users_email" ON "users" ("email")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."UQ_users_email"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
  }
}
```

### 7 — Users module (`src/modules/users/`) — the reference pattern

Final layout (nothing else in this folder):

```text
src/modules/users/
├── users.module.ts
├── users.controller.ts
├── users.service.ts
├── users.repository.ts
├── dto/
│   ├── create-user.dto.ts
│   └── update-user.dto.ts
├── entities/
│   └── user.entity.ts
└── enums/
    └── user-role.enum.ts
```

**Create file: `src/modules/users/enums/user-role.enum.ts`**

```ts
export enum UserRole {
  Admin = 'admin',
  User = 'user',
}
```

**Create file: `src/modules/users/entities/user.entity.ts`** — structure only, no behavior.

```ts
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserRole } from '../enums/user-role.enum.js';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'PK_users_id' })
  id: string;

  @Index('UQ_users_email', { unique: true })
  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ name: 'first_name', type: 'varchar', length: 100 })
  firstName: string;

  @Column({ name: 'last_name', type: 'varchar', length: 100 })
  lastName: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.User })
  role: UserRole;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
```

**Create file: `src/modules/users/dto/create-user.dto.ts`**

```ts
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { UserRole } from '../enums/user-role.enum.js';

export class CreateUserDto {
  @IsEmail()
  @MaxLength(255)
  email: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
```

**Create file: `src/modules/users/dto/update-user.dto.ts`**

```ts
import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateUserDto } from './create-user.dto.js';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
```

**Create file: `src/modules/users/users.repository.ts`** — data access only, no business rules.

```ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { User } from './entities/user.entity.js';

@Injectable()
export class UsersRepository {
  constructor(
    @InjectRepository(User)
    private readonly repository: Repository<User>,
  ) {}

  findAll(): Promise<User[]> {
    return this.repository.find({ order: { createdAt: 'DESC' } });
  }

  findById(id: string): Promise<User | null> {
    return this.repository.findOneBy({ id });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.repository.findOneBy({ email });
  }

  create(data: DeepPartial<User>): Promise<User> {
    return this.repository.save(this.repository.create(data));
  }

  save(user: User): Promise<User> {
    return this.repository.save(user);
  }

  async remove(user: User): Promise<void> {
    await this.repository.remove(user);
  }
}
```

**Create file: `src/modules/users/users.service.ts`** — business rules (email normalization, uniqueness, not-found).

```ts
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { User } from './entities/user.entity.js';
import { UsersRepository } from './users.repository.js';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  findAll(): Promise<User[]> {
    return this.usersRepository.findAll();
  }

  async findOne(id: string): Promise<User> {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }
    return user;
  }

  async create(dto: CreateUserDto): Promise<User> {
    const email = this.normalizeEmail(dto.email);
    await this.ensureEmailIsAvailable(email);
    return this.usersRepository.create({ ...dto, email });
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);

    if (dto.email !== undefined) {
      const email = this.normalizeEmail(dto.email);
      if (email !== user.email) {
        await this.ensureEmailIsAvailable(email);
      }
      dto = { ...dto, email };
    }

    return this.usersRepository.save(Object.assign(user, dto));
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    await this.usersRepository.remove(user);
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private async ensureEmailIsAvailable(email: string): Promise<void> {
    if (await this.usersRepository.findByEmail(email)) {
      throw new ConflictException('Email is already in use');
    }
  }
}
```

**Create file: `src/modules/users/users.controller.ts`** — HTTP only.

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
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { User } from './entities/user.entity.js';
import { UsersService } from './users.service.js';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() dto: CreateUserDto): Promise<User> {
    return this.usersService.create(dto);
  }

  @Get()
  findAll(): Promise<User[]> {
    return this.usersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<User> {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ): Promise<User> {
    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.usersService.remove(id);
  }
}
```

**Create file: `src/modules/users/users.module.ts`** — exports **only** `UsersService` (the module's public API; `UsersRepository` stays private).

```ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity.js';
import { UsersController } from './users.controller.js';
import { UsersRepository } from './users.repository.js';
import { UsersService } from './users.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository],
  exports: [UsersService],
})
export class UsersModule {}
```

### 8 — Health module, common filter, app wiring

**Delete:** `src/app.controller.ts`, `src/app.service.ts`.

**Create file: `src/modules/health/health.controller.ts`**

```ts
import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check(): { status: string } {
    return { status: 'ok' };
  }
}
```

**Create file: `src/modules/health/health.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { HealthController } from './health.controller.js';

@Module({
  controllers: [HealthController],
})
export class HealthModule {}
```

**Create file: `src/common/filters/all-exceptions.filter.ts`** — one consistent error shape for every error; maps PG unique violations (`23505`) to **409** so races on unique columns never surface as 500.

```ts
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { QueryFailedError } from 'typeorm';

interface ErrorBody {
  statusCode: number;
  error: string;
  message: string | string[];
}

const PG_UNIQUE_VIOLATION = '23505';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const body = this.toErrorBody(exception);

    if (body.statusCode >= 500) {
      this.logger.error(
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    httpAdapter.reply(
      ctx.getResponse(),
      {
        ...body,
        path: httpAdapter.getRequestUrl(ctx.getRequest()),
        timestamp: new Date().toISOString(),
      },
      body.statusCode,
    );
  }

  private toErrorBody(exception: unknown): ErrorBody {
    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const response = exception.getResponse();

      if (typeof response === 'string') {
        return { statusCode, error: exception.name, message: response };
      }

      const { error, message } = response as Partial<ErrorBody>;
      return {
        statusCode,
        error: error ?? exception.name,
        message: message ?? exception.message,
      };
    }

    if (
      exception instanceof QueryFailedError &&
      (exception.driverError as { code?: string }).code === PG_UNIQUE_VIOLATION
    ) {
      return {
        statusCode: HttpStatus.CONFLICT,
        error: 'Conflict',
        message: 'Resource already exists',
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'Internal Server Error',
      message: 'Internal server error',
    };
  }
}
```

**File: `src/app.module.ts`** — replace whole file:

```ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';
import { validateEnv } from './config/env.validation.js';
import { DatabaseModule } from './database/database.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { UsersModule } from './modules/users/users.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true, validate: validateEnv }),
    DatabaseModule,
    HealthModule,
    UsersModule,
  ],
  providers: [{ provide: APP_FILTER, useClass: AllExceptionsFilter }],
})
export class AppModule {}
```

**File: `src/main.ts`** — replace whole file (keeps the top-level `await bootstrap();` from line 8):

```ts
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import type { EnvironmentVariables } from './config/env.validation.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { exposeUnsetFields: false },
    }),
  );
  app.enableShutdownHooks();

  const config: ConfigService<EnvironmentVariables, true> =
    app.get(ConfigService);
  await app.listen(config.get('PORT', { infer: true }));
}
await bootstrap();
```

### 9 — README

**File: `README.md`** — replace lines 47–58 ("Run tests") with:

````markdown
## Database migrations

Copy `.env.example` to `.env` and point it at a PostgreSQL 13+ database.

```bash
# apply pending migrations
$ npm run migration:run

# generate a migration from entity changes
$ npm run migration:generate -- src/database/migrations/<Name>

# create an empty migration
$ npm run migration:create -- src/database/migrations/<Name>

# revert the last migration
$ npm run migration:revert
```
````

Final `src/` tree:

```text
src/
├── common/filters/all-exceptions.filter.ts
├── config/env.validation.ts
├── database/
│   ├── data-source.ts
│   ├── database.module.ts
│   ├── database.options.ts
│   └── migrations/1793404800000-CreateUsersTable.ts
├── modules/
│   ├── health/ (health.module.ts, health.controller.ts)
│   └── users/  (see task 7)
├── app.module.ts
└── main.ts
```

---

## Edge Cases & Failure Modes

- **Missing/invalid env var** (e.g. no `DB_HOST`, `PORT=abc`) → `validateEnv` throws `Invalid environment variables: …` and the app exits before listening. Enforced in `src/config/env.validation.ts` via `ConfigModule.forRoot({ validate })` in `src/app.module.ts`. The CLI path (`src/database/data-source.ts`) uses the same function, so migrations fail the same way.
- **`DB_LOGGING=false` parsed as `true`** → `enableImplicitConversion` uses `Boolean("false") === true`; the `@Transform` on `DB_LOGGING` reads the raw `obj` value to avoid this. Do not remove it.
- **No `.env` file when running migrations** (CI, containers) → `process.loadEnvFile()` throws; the `try/catch` in `data-source.ts` swallows it and real env vars are used. Run CLI scripts from the **repo root** — `.env` is resolved against the cwd.
- **PATCH with partial body nulling fields** → with `target: ES2023`, class fields are defined as `undefined` on DTO instances; `Object.assign(user, dto)` would overwrite columns with `undefined`. Prevented by `transformOptions: { exposeUnsetFields: false }` in `src/main.ts`. Do not remove it.
- **Unknown body properties** (e.g. `{ "id": "...", "createdAt": "..." }` on POST) → `400` from `forbidNonWhitelisted` in `src/main.ts`.
- **Non-UUID `:id`** → `400` from `ParseUUIDPipe` in `users.controller.ts`; never reaches PostgreSQL (which would otherwise throw a 500 on invalid uuid syntax).
- **Duplicate email, sequential** → `409 Email is already in use` from `UsersService.ensureEmailIsAvailable`. Email is normalized to trimmed lowercase first, so `A@x.com` and `a@x.com ` collide.
- **Duplicate email, concurrent** → both pass the check; the second insert hits unique index `UQ_users_email` → `QueryFailedError` code `23505` → `409` from `AllExceptionsFilter.toErrorBody`.
- **Unknown errors** → `500` with generic message; stack is logged, never returned to the client (`all-exceptions.filter.ts`).
- **`import type` on injected classes** → DI fails at runtime with "Nest can't resolve dependencies". All constructor-injected classes in the snippets are value imports; keep them that way. `import type` is used only for types never injected (`DataSourceOptions`, `EnvironmentVariables`, `MigrationInterface`, `QueryRunner`).
- **Entity/migration globs** → `database.options.ts` globs `dist/**/*.entity.js` and `dist/database/migrations/*.js` via `import.meta.dirname`, so they only match **compiled** output. This is why every migration script runs `npm run build` first. A new entity whose file name does not end in `.entity.ts` will not be loaded.
- **TypeORM 1.x vs 0.3** → `@nestjs/typeorm@12.0.2` accepts both. If `npm install` reports a peer conflict, install `typeorm@0.3` (`legacy` dist-tag); every API used here exists in 0.3.
- **`uuidExtension` option** → TypeORM may try `CREATE EXTENSION IF NOT EXISTS "pgcrypto"` on connect; on a DB user without that privilege, check the startup log. The migration does not depend on the extension (`gen_random_uuid()` is core since PG 13). Verify the option exists per task 5.
- **Generated vs hand-written migration drift** → if the hand-written migration in task 6 is used, run `npm run migration:generate -- src/database/migrations/Check` once a DB is available; it should report **no changes**. If it generates SQL, delete that file and reconcile the entity with the migration.

---

## Test Plan

No automated tests are added in this story — the intake explicitly removes all test files and tooling. Verification is manual smoke testing against a running app (see Verification Steps):

1. **Smoke — health:** `GET /api/health` → `200 {"status":"ok"}`.
2. **Smoke — create:** `POST /api/users` with `{"email":" John@Example.com ","firstName":"John","lastName":"Doe"}` → `201`, `email` is `john@example.com`, `role` is `user`, `isActive` is `true`.
3. **Smoke — duplicate:** repeat step 2 → `409`, body has `statusCode`, `error`, `message`, `path`, `timestamp`.
4. **Smoke — validation:** `POST /api/users` with `{"email":"bad"}` → `400` with a `message` array; with an extra field `{"foo":1,...}` → `400`.
5. **Smoke — read:** `GET /api/users` → array; `GET /api/users/<id>` → user; `GET /api/users/not-a-uuid` → `400`; `GET /api/users/00000000-0000-0000-0000-000000000000` → `404`.
6. **Smoke — partial update:** `PATCH /api/users/<id>` with `{"lastName":"Smith"}` → `200`, `firstName` and `email` unchanged.
7. **Smoke — delete:** `DELETE /api/users/<id>` → `204`; subsequent `GET` → `404`.
8. **Smoke — fail fast:** remove `DB_HOST` from `.env`, run `npm run start` → process exits with `Invalid environment variables`.

---

## Migration / Rollback

- Schema: one migration creates enum `users_role_enum`, table `users`, unique index `UQ_users_email`. Roll back with `npm run migration:revert` (drops all three in reverse order).
- Half-applied state: TypeORM runs each migration in a transaction by default on PostgreSQL, so a failure mid-`up` leaves no partial table. If the type exists but the table does not (manual tampering), drop `users_role_enum` manually before re-running.
- Code rollback: this story only removes generated starter files; reverting the commit restores the Hello World app and test tooling (`npm install` afterwards).

---

## Verification Steps

1. **Backend builds:** in the repo root, `npm run build` → no errors; `dist/main.js`, `dist/database/data-source.js`, `dist/modules/users/entities/user.entity.js` exist.
2. **Lint:** `npm run lint` → no errors.
3. **No test artifacts:** `git ls-files | grep -Ei "spec|vitest|test/"` → no output (from repo root; on PowerShell use `git ls-files | Select-String -Pattern 'spec|vitest|test/'`). `npx nest g service tmp --dry-run` → lists no `.spec.ts` file.
4. **No leftover deps:** `package.json` contains none of `vitest`, `@vitest/coverage-v8`, `@nestjs/testing`, `supertest`, `@types/supertest`, `vite-tsconfig-paths`.
5. **Database:** `cp .env.example .env` (adjust credentials), create DB `trip_management`, then `npm run migration:show` → lists `CreateUsersTable1793404800000` as pending; `npm run migration:run` → applied.
6. **Backend runs:** `npm run start:dev` → logs `Mapped {/api/health, GET}` and the five `/api/users` routes; then run Test Plan steps 1–7 with curl.
7. **Regression:** `npm run migration:revert` then `npm run migration:run` → both succeed.

---

## Done Criteria

- [ ] `src/app.controller.spec.ts`, `test/`, `vitest.config.ts`, `vitest.config.e2e.ts` deleted.
- [ ] `test*` scripts and test-only devDependencies removed from `package.json`; `lint`/`format` target `src/` only.
- [ ] `tsconfig.json` `types` is `["node"]`; `tsconfig.build.json` excludes only `node_modules`, `dist`.
- [ ] `nest-cli.json` has `"generateOptions": { "spec": false }`.
- [ ] `src/common/`, `src/config/`, `src/database/`, `src/modules/` exist, each with real files; no empty folders; no `interfaces/` folder.
- [ ] Env config is validated at startup via `validateEnv`; `.env.example` committed; `.env` ignored.
- [ ] TypeORM wired with `TypeOrmModule.forRootAsync`, `synchronize: false`; migration scripts work; initial `users` migration present.
- [ ] Global `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform`, `exposeUnsetFields: false`), global prefix `api`, shutdown hooks, port from config in `src/main.ts`.
- [ ] `AllExceptionsFilter` registered via `APP_FILTER`; all errors share `{ statusCode, error, message, path, timestamp }`.
- [ ] `AppController`/`AppService` deleted; `GET /api/health` returns `{ "status": "ok" }`.
- [ ] Users CRUD implemented Controller → Service → Repository; controller has no business logic; repository has no business rules; `UsersModule` exports only `UsersService`.
- [ ] No DDD constructs anywhere (aggregates, value objects, domain events, factories, repository interfaces).
- [ ] ESM preserved: `"type": "module"`, `.js` suffix on every relative import.
- [ ] `npm run build` and `npm run lint` pass; Test Plan smoke steps 1–8 pass against a running PostgreSQL.

**STOP HERE. Report to the user and wait for confirmation before proceeding to Story 02.**
