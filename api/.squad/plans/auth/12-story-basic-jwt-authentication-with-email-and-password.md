# Story 12 — Basic JWT authentication with email and password

## Prerequisites

- **Story 01 completed:** [../project-structure/01-story-restructure-project-as-clean-modular-monolith-no-ddd-no-test-files.md](../project-structure/01-story-restructure-project-as-clean-modular-monolith-no-ddd-no-test-files.md) — `users` module (`src/modules/users/`), global `ValidationPipe`, `AllExceptionsFilter`, validated config.
- Stories 02–11 implemented: every route they added becomes protected by this story.
- Intake: [../../stories/auth/basic-jwt-authentication-with-email-and-password/intake.md](../../stories/auth/basic-jwt-authentication-with-email-and-password/intake.md).
- Local PostgreSQL with all migrations applied (latest: `1793451600000-AddQrCodeUrlToTrips`) — runtime verification only.
- **`.env` must get `JWT_SECRET` before anything runs:** `validateEnv` is also used by `src/database/data-source.ts`, so migrations and seeds fail without it.
- **Do not start until `npm run build` passes on the current `src/`.**

---

## Story Goal

Only signed-in users can use the API.

1. Users get a password, stored as a bcrypt hash in a new nullable column `users.password_hash` that is never returned.
2. `POST /api/auth/login` exchanges email + password for a JWT access token (`HS256`, `JWT_SECRET`, `JWT_EXPIRES_IN_SECONDS`).
3. A **global guard** requires `Authorization: Bearer <token>` on every route except those marked `@Public()` (`GET /api/health`, `POST /api/auth/login`). The token's user is re-loaded on every request, so deleting or deactivating a user locks them out immediately.
4. `GET /api/auth/me` and `POST /api/auth/change-password` for the signed-in user.
5. `POST /api/users` requires `password`; `PATCH /api/users/:id` may reset it. Users routes return a new `UserResponseDto`.
6. `npm run seed` creates the first admin from `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`.

**Not in scope:** role-based authorization, company scoping, refresh tokens, logout / revocation, sign-up, email verification, forgot-password, rate limiting / lockout, password strength beyond length, CORS, cookies, a public trip page, tests.

**Hard constraints for the executor:**

- Controller → Service → Repository; entities are mapped to `UserResponseDto` in the controller (like `CompanyResponseDto`).
- `AuthModule` uses the users module **only** through `UsersService` (and the `User` / `UserRole` **types**). Hashing lives in the users module; `AuthModule` never touches `UsersRepository` or bcrypt.
- `UsersModule` must not import `AuthModule`.
- The guard is registered once, as `APP_GUARD` in `AuthModule`. Other modules opt out only with `@Public()` from `src/common/decorators/public.decorator.ts`; they never import from `src/modules/auth/`.
- `passwordHash` is `select: false` and is never part of any response DTO.
- ESM: relative imports end in `.js`; constructor-injected classes are value imports.
- One hand-written migration; `migration:generate` must report no drift afterwards.

---

## Context — Read These Files First

1. `src/modules/users/entities/user.entity.ts` — columns (~lines 13–36); `password_hash` goes after `isActive` (~line 30).
2. `src/modules/users/users.service.ts` — `create` (~lines 27–31), `update` (~lines 33–48: strips `undefined` values before `Object.assign`), `normalizeEmail` (~lines 55–57), `ensureEmailIsAvailable` (~lines 59–63).
3. `src/modules/users/users.repository.ts` — `findById`, `findByEmail`, `create`, `save` (~lines 13–35).
4. `src/modules/users/users.controller.ts` — every route returns the `User` entity today (~lines 25–65).
5. `src/modules/users/dto/create-user.dto.ts` (~lines 12–31) and `update-user.dto.ts` (`PartialType(CreateUserDto)` + `isActive`, ~lines 5–9).
6. `src/modules/companies/dto/company-response.dto.ts` — the response DTO + `fromEntity` pattern to copy.
7. `src/app.module.ts` — `imports` (~lines 18–30); `ConfigModule` is global.
8. `src/main.ts` — Swagger `DocumentBuilder` (~lines 26–38).
9. `src/config/env.validation.ts` — `EnvironmentVariables` (~lines 26–93; last entry `TRIP_QR_BASE_URL` ~lines 90–92); `validateEnv` (~lines 95–111).
10. `src/modules/files/files.service.ts` ~lines 52–61 — reading config in a constructor with `ConfigService<EnvironmentVariables, true>` + `{ infer: true }`.
11. `src/common/decorators/api-error-responses.decorator.ts` — `DESCRIPTIONS` (~lines 5–11).
12. `src/common/filters/all-exceptions.filter.ts` — `UnauthorizedException` becomes `{ statusCode: 401, error: "Unauthorized", message, path, timestamp }` with no change.
13. `src/modules/health/health.controller.ts` — must become `@Public()`.
14. `src/database/seeds/run-seeds.ts` and `countries.seed.ts` — seed entry point and seeder style (plain function taking a `DataSource`).
15. `src/database/data-source.ts` — loads `.env` and calls `validateEnv(process.env)`.
16. `src/database/migrations/1793451600000-AddQrCodeUrlToTrips.ts` — latest migration; the new timestamp must be larger.

---

## Implementation tasks

### 1 — Dependencies and configuration

```bash
npm install @nestjs/jwt bcryptjs
```

`@nestjs/jwt` 12.x (peer `@nestjs/common ^12`); `bcryptjs` 3.x is pure JS, ESM, and ships its own types (no `@types/bcryptjs`, no native build on Windows).

**File: `src/config/env.validation.ts`** — add `IsEmail`, `IsOptional`, `MaxLength`, `MinLength` to the `class-validator` import and, after `TRIP_QR_BASE_URL`:

```ts
  // HS256 key for access tokens. Use a long random value (e.g. `openssl rand -base64 48`).
  @IsString()
  @MinLength(32)
  JWT_SECRET: string;

  @IsInt()
  @Min(60)
  @Max(604800)
  JWT_EXPIRES_IN_SECONDS: number = 3600;

  // Optional: `npm run seed` creates this admin when the email is not taken yet.
  @IsOptional()
  @IsEmail()
  SEED_ADMIN_EMAIL?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  SEED_ADMIN_PASSWORD?: string;
```

**File: `.env.example`** — append:

```dotenv

JWT_SECRET=replace-with-a-long-random-string-at-least-32-chars
JWT_EXPIRES_IN_SECONDS=3600

SEED_ADMIN_EMAIL=admin@example.com
SEED_ADMIN_PASSWORD=ChangeMe123!
```

Add the same keys (with a real random secret) to the local `.env`.

### 2 — Column and migration

**File: `src/modules/users/entities/user.entity.ts`** — after `isActive`:

```ts
  // bcrypt hash. select: false keeps it out of every normal read; null = cannot log in.
  @Column({
    name: 'password_hash',
    type: 'varchar',
    length: 255,
    nullable: true,
    select: false,
  })
  passwordHash: string | null;
```

**New file: `src/database/migrations/1793455200000-AddPasswordHashToUsers.ts`**

```ts
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPasswordHashToUsers1793455200000 implements MigrationInterface {
  name = 'AddPasswordHashToUsers1793455200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "password_hash" character varying(255)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "password_hash"`);
  }
}
```

### 3 — Password hashing (users module)

**New file: `src/modules/users/password-hasher.ts`** (plain functions, like `src/modules/trips/trip-qr-code.ts`):

```ts
import { compare, hash, hashSync } from 'bcryptjs';

const BCRYPT_COST = 12;

// Compared against when there is no user or hash, so response time does not reveal which emails exist.
const DUMMY_HASH = hashSync('timing-equalizer', BCRYPT_COST);

export function hashPassword(password: string): Promise<string> {
  return hash(password, BCRYPT_COST);
}

export async function verifyPassword(
  password: string,
  passwordHash: string | null | undefined,
): Promise<boolean> {
  const matches = await compare(password, passwordHash ?? DUMMY_HASH);
  return matches && !!passwordHash;
}
```

### 4 — Users repository, service, DTOs, controller

**File: `src/modules/users/users.repository.ts`** — add after `findByEmail`:

```ts
  findByEmailWithPassword(email: string): Promise<User | null> {
    return this.withPassword().where('user.email = :email', { email }).getOne();
  }

  findByIdWithPassword(id: string): Promise<User | null> {
    return this.withPassword().where('user.id = :id', { id }).getOne();
  }
```

and at the end of the class:

```ts
  private withPassword() {
    return this.repository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash');
  }
```

**File: `src/modules/users/dto/create-user.dto.ts`** — add `MinLength` to the import and after `lastName`:

```ts
  // Not trimmed. 72 is bcrypt's input limit.
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password: string;
```

`UpdateUserDto` gets an optional `password` through `PartialType`; no change to that file.

**New file: `src/modules/users/dto/user-response.dto.ts`**

```ts
import type { User } from '../entities/user.entity.js';
import { UserRole } from '../enums/user-role.enum.js';

export class UserResponseDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;

  static fromEntity(user: User): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
```

(`UserRole` is a value import so the Swagger plugin can emit the enum.)

**File: `src/modules/users/users.service.ts`** — add `UnauthorizedException` to the `@nestjs/common` import, import `hashPassword, verifyPassword` from `./password-hasher.js`, then:

- `create`:

```ts
  async create(dto: CreateUserDto): Promise<User> {
    const { password, ...fields } = dto;
    const email = this.normalizeEmail(fields.email);
    await this.ensureEmailIsAvailable(email);
    return this.usersRepository.create({
      ...fields,
      email,
      passwordHash: await hashPassword(password),
    });
  }
```

- `update`:

```ts
  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);
    const { password, ...fields } = dto;

    if (fields.email !== undefined) {
      const email = this.normalizeEmail(fields.email);
      if (email !== user.email) {
        await this.ensureEmailIsAvailable(email);
      }
      fields.email = email;
    }

    const changes: Partial<User> = Object.fromEntries(
      Object.entries(fields).filter(([, value]) => value !== undefined),
    );
    if (password !== undefined) {
      changes.passwordHash = await hashPassword(password);
    }
    return this.usersRepository.save(Object.assign(user, changes));
  }
```

- New public methods after `remove`:

```ts
  /** The user if it exists and is active, otherwise null (used for every authenticated request). */
  async findActive(id: string): Promise<User | null> {
    const user = await this.usersRepository.findById(id);
    return user?.isActive ? user : null;
  }

  /** The active user with this email and password, otherwise null. */
  async verifyCredentials(email: string, password: string): Promise<User | null> {
    const user = await this.usersRepository.findByEmailWithPassword(
      this.normalizeEmail(email),
    );
    const matches = await verifyPassword(password, user?.passwordHash);
    return matches && user?.isActive ? user : null;
  }

  async changePassword(
    id: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.usersRepository.findByIdWithPassword(id);
    if (!user || !(await verifyPassword(currentPassword, user.passwordHash))) {
      throw new UnauthorizedException('Current password is incorrect');
    }
    user.passwordHash = await hashPassword(newPassword);
    await this.usersRepository.save(user);
  }
```

**File: `src/modules/users/users.controller.ts`** — import `UserResponseDto`; every route returns it instead of `User` (e.g. `findAll` → `(await this.usersService.findAll()).map(UserResponseDto.fromEntity)`, `create` / `findOne` / `update` → `UserResponseDto.fromEntity(await …)`); make those methods `async`; drop the now-unused `User` import.

### 5 — Public decorator and Swagger

**New file: `src/common/decorators/public.decorator.ts`**

```ts
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Opts a route or controller out of the global access-token guard. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

**File: `src/common/decorators/api-error-responses.decorator.ts`** — add to `DESCRIPTIONS`:

```ts
  [HttpStatus.UNAUTHORIZED]: 'Not signed in, or wrong credentials',
```

**File: `src/modules/health/health.controller.ts`** — import `Public` from `../../common/decorators/public.decorator.js` and add `@Public()` above `@Controller('health')`.

**File: `src/main.ts`** — add `HttpStatus` to the `@nestjs/common` import; in the `DocumentBuilder` chain before `.build()`:

```ts
        .addBearerAuth()
        .addSecurityRequirements('bearer')
        .addGlobalResponse({
          status: HttpStatus.UNAUTHORIZED,
          description: 'Missing, invalid or expired access token',
        })
```

### 6 — Auth module

**New file: `src/modules/auth/auth.types.ts`**

```ts
import type { Request } from 'express';
import type { User } from '../users/entities/user.entity.js';
import type { UserRole } from '../users/enums/user-role.enum.js';

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
}

/** A request that passed JwtAuthGuard. */
export interface AuthenticatedRequest extends Request {
  user: User;
}
```

**New file: `src/modules/auth/jwt-auth.guard.ts`**

```ts
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator.js';
import { UsersService } from '../users/users.service.js';
import type { AuthenticatedRequest, JwtPayload } from './auth.types.js';

/** Global guard: every route needs a valid Bearer token unless it is @Public(). */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = extractBearerToken(request.headers.authorization);
    if (!token) {
      throw new UnauthorizedException('Missing access token');
    }

    // Re-load the user so a deleted or deactivated user is locked out before the token expires.
    const payload = await this.jwtService
      .verifyAsync<JwtPayload>(token)
      .catch(() => null);
    const user = payload ? await this.usersService.findActive(payload.sub) : null;
    if (!user) {
      throw new UnauthorizedException('Invalid or expired access token');
    }
    request.user = user;
    return true;
  }
}

function extractBearerToken(header: string | undefined): string | null {
  const [scheme, token] = header?.split(' ') ?? [];
  return scheme?.toLowerCase() === 'bearer' && token ? token : null;
}
```

**New file: `src/modules/auth/current-user.decorator.ts`**

```ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { User } from '../users/entities/user.entity.js';
import type { AuthenticatedRequest } from './auth.types.js';

/** The user JwtAuthGuard attached to the request. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): User =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().user,
);
```

**New file: `src/modules/auth/dto/login.dto.ts`**

```ts
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class LoginDto {
  /** @example "admin@example.com" */
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsEmail()
  @MaxLength(255)
  email: string;

  /** @example "ChangeMe123!" */
  @IsString()
  @IsNotEmpty()
  @MaxLength(72)
  password: string;
}
```

**New file: `src/modules/auth/dto/change-password.dto.ts`**

```ts
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(72)
  currentPassword: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  newPassword: string;
}
```

**New file: `src/modules/auth/dto/login-response.dto.ts`**

```ts
import { UserResponseDto } from '../../users/dto/user-response.dto.js';

export class LoginResponseDto {
  /** Send as `Authorization: Bearer <accessToken>`. */
  accessToken: string;

  /** @example "Bearer" */
  tokenType: 'Bearer';

  /**
   * Seconds until the token expires.
   * @example 3600
   */
  expiresIn: number;

  user: UserResponseDto;
}
```

**New file: `src/modules/auth/auth.service.ts`**

```ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { EnvironmentVariables } from '../../config/env.validation.js';
import type { User } from '../users/entities/user.entity.js';
import { UsersService } from '../users/users.service.js';
import type { JwtPayload } from './auth.types.js';
import type { ChangePasswordDto } from './dto/change-password.dto.js';
import type { LoginDto } from './dto/login.dto.js';

@Injectable()
export class AuthService {
  private readonly expiresIn: number;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    config: ConfigService<EnvironmentVariables, true>,
  ) {
    this.expiresIn = config.get('JWT_EXPIRES_IN_SECONDS', { infer: true });
  }

  async login(
    dto: LoginDto,
  ): Promise<{ accessToken: string; expiresIn: number; user: User }> {
    const user = await this.usersService.verifyCredentials(
      dto.email,
      dto.password,
    );
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role };
    return {
      accessToken: await this.jwtService.signAsync(payload),
      expiresIn: this.expiresIn,
      user,
    };
  }

  changePassword(user: User, dto: ChangePasswordDto): Promise<void> {
    return this.usersService.changePassword(
      user.id,
      dto.currentPassword,
      dto.newPassword,
    );
  }
}
```

**New file: `src/modules/auth/auth.controller.ts`**

```ts
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiErrorResponses } from '../../common/decorators/api-error-responses.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { UserResponseDto } from '../users/dto/user-response.dto.js';
import type { User } from '../users/entities/user.entity.js';
import { AuthService } from './auth.service.js';
import { CurrentUser } from './current-user.decorator.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { LoginResponseDto } from './dto/login-response.dto.js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** Sign in with email and password; returns a bearer access token. */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.UNAUTHORIZED)
  async login(@Body() dto: LoginDto): Promise<LoginResponseDto> {
    const { accessToken, expiresIn, user } = await this.authService.login(dto);
    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn,
      user: UserResponseDto.fromEntity(user),
    };
  }

  /** The signed-in user. */
  @Get('me')
  me(@CurrentUser() user: User): UserResponseDto {
    return UserResponseDto.fromEntity(user);
  }

  /** Change the signed-in user's password. Tokens already issued stay valid until they expire. */
  @Post('change-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.UNAUTHORIZED)
  changePassword(
    @CurrentUser() user: User,
    @Body() dto: ChangePasswordDto,
  ): Promise<void> {
    return this.authService.changePassword(user, dto);
  }
}
```

(`@Body()` DTOs are value imports so `ValidationPipe` sees their classes.)

**New file: `src/modules/auth/auth.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import type { EnvironmentVariables } from '../../config/env.validation.js';
import { UsersModule } from '../users/users.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';

@Module({
  imports: [
    UsersModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvironmentVariables, true>) => ({
        secret: config.get('JWT_SECRET', { infer: true }),
        signOptions: {
          algorithm: 'HS256',
          expiresIn: config.get('JWT_EXPIRES_IN_SECONDS', { infer: true }),
        },
        verifyOptions: { algorithms: ['HS256'] },
      }),
    }),
  ],
  controllers: [AuthController],
  // APP_GUARD here applies JwtAuthGuard to every route in the app.
  providers: [AuthService, { provide: APP_GUARD, useClass: JwtAuthGuard }],
})
export class AuthModule {}
```

**File: `src/app.module.ts`** — import `AuthModule` from `./modules/auth/auth.module.js` and add it to `imports` right after `UsersModule`.

### 7 — Admin seed

**New file: `src/database/seeds/admin-user.seed.ts`**

```ts
import type { DataSource } from 'typeorm';
import { User } from '../../modules/users/entities/user.entity.js';
import { UserRole } from '../../modules/users/enums/user-role.enum.js';
import { hashPassword } from '../../modules/users/password-hasher.js';

/**
 * Creates the first admin and returns true, or false when the email is already taken.
 * Never changes an existing user's password or role.
 */
export async function seedAdminUser(
  dataSource: DataSource,
  email: string,
  password: string,
): Promise<boolean> {
  const repository = dataSource.getRepository(User);
  const normalized = email.trim().toLowerCase();
  if (await repository.existsBy({ email: normalized })) {
    return false;
  }
  await repository.insert({
    email: normalized,
    firstName: 'System',
    lastName: 'Admin',
    role: UserRole.Admin,
    passwordHash: await hashPassword(password),
  });
  return true;
}
```

**File: `src/database/seeds/run-seeds.ts`** — add `import 'reflect-metadata';` as the **first** import (with a comment: `env.validation`'s implicit number conversion needs decorator metadata; importing it before `data-source.js` otherwise turns `PORT` etc. into validation errors), then import `validateEnv` from `../../config/env.validation.js` and `seedAdminUser` from `./admin-user.seed.js`; inside the `try`, after the checklist:

```ts
  // data-source.ts has already loaded .env into process.env.
  const env = validateEnv(process.env);
  if (env.SEED_ADMIN_EMAIL && env.SEED_ADMIN_PASSWORD) {
    const created = await seedAdminUser(
      dataSource,
      env.SEED_ADMIN_EMAIL,
      env.SEED_ADMIN_PASSWORD,
    );
    console.log(`admin user: ${created ? 'created' : 'already exists'}`);
  } else {
    console.log('admin user: skipped (SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD not set)');
  }
```

### 8 — API contract (`contract/`, CLAUDE.md rule)

- **New `contract/auth.md`:** login / me / change-password with bodies, rules, real response examples and every error message; the token lifecycle (store the token, send `Authorization: Bearer`, on any 401 go to the login page; no refresh token, sign in again after `expiresIn`).
- **`contract/README.md`:** add the auth row to the module index; replace "no auth" with an **Authentication** section (header format, public routes, the two 401 messages); add 401 to the status table; Changelog line + "Last updated".
- **`contract/users.md`:** `password` on create (required) and update (optional), rules, `UserResponseDto` (no `passwordHash`), first admin via seed.
- **`contract/files.md`:** downloads need the token, so `<img src>` does not work; fetch with the header and use `URL.createObjectURL(blob)`.
- **`contract/trips.md`:** the QR url needs a token for now.
- **`contract/health.md`:** public.
- Regenerate `contract/openapi.json` (`curl -s http://localhost:3000/api/docs-json -o contract/openapi.json`).

### 9 — Plans

- New [00-overview.md](00-overview.md) for `auth`; add the `auth` row to [../00-index.md](../00-index.md).

---

## Edge Cases & Failure Modes

- **Existing users** have `password_hash = NULL`: login → 401 `Invalid email or password` until an admin sets one with `PATCH /users/:id { "password": … }`, or `npm run seed` creates the first admin. A fresh database has no users, so **the seed is the only way in**.
- **Bootstrap lock-out:** if `SEED_ADMIN_*` is not set and no user has a password, nobody can sign in. Fix: set the vars and run `npm run seed`.
- **Login enumeration:** unknown email, wrong password, null hash and inactive user all return the same 401 message; `verifyPassword` compares against `DUMMY_HASH` when there is no hash, so timing is similar.
- **Email case/whitespace:** login trims (DTO) and lower-cases (`normalizeEmail`), matching how users are stored.
- **Password length:** 8–72 characters. bcrypt reads at most 72 **bytes**; a 72-character password in Arabic (2 bytes/char) is silently cut to 36 characters. Accepted.
- **Passwords are not trimmed:** `" secret12 "` and `"secret12"` are different passwords.
- **Missing / malformed header:** no header, `Basic …`, `Bearer` without a token → 401 `Missing access token`. Scheme is case-insensitive.
- **Bad token:** wrong signature, malformed, `alg: none` / non-HS256 (rejected by `verifyOptions.algorithms`), expired → 401 `Invalid or expired access token`.
- **User deleted or deactivated after login** → next request 401 (`findActive` on every request). One indexed primary-key read per request; accepted.
- **Role or email changed after login** → the token's `role`/`email` claims are stale until it expires; the server never trusts them (it uses the re-loaded user). The front end should read `/auth/me`, not the token claims.
- **Password changed** (self or by an admin) → tokens already issued stay valid until they expire (no revocation in scope). Documented on the route.
- **`JWT_SECRET` missing or < 32 chars** → app, migrations and seeds refuse to start with `Invalid environment variables`. **Rotating it** signs every user out.
- **`passwordHash` leak:** `select: false` keeps it out of normal reads, but `create` / `update` / `verifyCredentials` return entities that do hold it in memory; `UserResponseDto` is the guard — every users and auth route must map through it.
- **`passwordHash` or `role` sent to `POST /auth/login` or `/auth/change-password`** → 400 (`forbidNonWhitelisted`). `passwordHash` in `POST/PATCH /users` → 400 `property passwordHash should not exist`.
- **Unknown routes** → still 404 (guards run only on matched routes).
- **Guard order:** the guard runs before `ValidationPipe`, so an unauthenticated request with a bad body gets 401, not 400.
- **Files:** `GET /files/:id/download` now needs the header; `<img src>` breaks. Front end fetches the blob (contract note). Making downloads public is an open question in the intake.
- **Trip QR codes:** the default QR url `/api/trips/:id` now returns 401 to a phone camera. Unchanged until a public trip page exists.
- **Swagger:** health and login also show a lock icon (global security requirement); they work without a token. Accepted.
- **Any signed-in user can manage users** (including creating admins); roles are not enforced yet — next story.

---

## Test Plan

No automated tests (project rule). Manual smoke tests against a running app (`BASE=http://localhost:3000/api`), after `npm run migration:run` and `npm run seed` with `SEED_ADMIN_EMAIL=admin@example.com`, `SEED_ADMIN_PASSWORD=ChangeMe123!`.

1. **Seed:** `npm run seed` → `admin user: created`; again → `admin user: already exists`.
2. **Public routes:** `GET $BASE/health` without a token → **200**.
3. **Login:** `POST $BASE/auth/login {"email":" Admin@Example.com ","password":"ChangeMe123!"}` → **200** `{ accessToken, tokenType: "Bearer", expiresIn: 3600, user }`; `user.role` is `admin`; no `passwordHash` anywhere. `TOKEN=<accessToken>`.
4. **Login failures:** wrong password, unknown email → **401** `Invalid email or password`; `{"email":"x"}` → **400**; extra property → **400**.
5. **Guard:** `GET $BASE/trips` → **401** `Missing access token`; with `Authorization: Bearer garbage` → **401** `Invalid or expired access token`; with `Bearer $TOKEN` → **200**; with lower-case `bearer $TOKEN` → **200**.
6. **Expiry:** restart with `JWT_EXPIRES_IN_SECONDS=60`, log in, wait > 60 s → **401** `Invalid or expired access token`. Restore.
7. **Me:** `GET $BASE/auth/me` → **200** the admin (`UserResponseDto` shape).
8. **Users:** `POST $BASE/users` without `password` → **400**; with `"password":"short"` → **400**; with a valid one → **201** without `passwordHash`. Log in as that user → **200**. `GET /users`, `GET /users/:id`, `PATCH /users/:id` → no `passwordHash`.
9. **Admin reset:** `PATCH $BASE/users/:id {"password":"NewPass123"}` → **200**; old password → 401; new password → 200.
10. **Change password:** as that user `POST $BASE/auth/change-password {"currentPassword":"wrong","newPassword":"Another123"}` → **401** `Current password is incorrect`; correct current → **204**; new password logs in, old one → 401.
11. **Deactivate / delete:** with that user's token, `PATCH /users/:id {"isActive":false}` (as admin) → the user's next request → **401**; login → **401**. `DELETE /users/:id` → token → **401**.
12. **Legacy user:** a user row with `password_hash NULL` (e.g. created before the migration) → login **401**.
13. **Bad config:** `JWT_SECRET=short` → app fails at boot with `Invalid environment variables`.
14. **Regression:** with `Bearer $TOKEN`, Story 11 Test Plan steps 1–6 pass; file download with the header → **200**, without → **401**.
15. **Swagger:** `/api/docs` shows **Authorize**; after pasting the token, "Try it out" on `GET /trips` → 200.

Clean up test users with `DELETE /users/:id`.

---

## Migration / Rollback

- **Up:** add `JWT_SECRET` to `.env`, then `npm run migration:run` (adds nullable `users.password_hash`; existing rows get `NULL`), then `npm run seed` for the first admin.
- **Rollback:** `npm run migration:revert` drops the column (all passwords are lost), revert the code, `npm uninstall @nestjs/jwt bcryptjs`. The API is open again. The `JWT_*` / `SEED_ADMIN_*` env vars can stay (unknown vars are ignored) or be removed. The seeded admin row stays as a normal user.

---

## Verification Steps

1. **Backend builds:** `npm run build` → no errors.
2. **Lint:** `npm run lint` → no errors.
3. **Migration:** `npm run migration:run` → `AddPasswordHashToUsers1793455200000` executed; `npm run migration:generate -- src/database/migrations/Check` → "No changes in database schema were found".
4. **Boundaries:**
   - `grep -rn "users/" src/modules/auth --include=*.ts` → only `users.module.js`, `users.service.js`, `dto/user-response.dto.js`, and **type** imports of `entities/user.entity.js` / `enums/user-role.enum.js`. Never `users.repository` or `password-hasher`.
   - `grep -rn "modules/auth" src --include=*.ts` → only `src/app.module.ts`.
   - `grep -rn "bcryptjs" src --include=*.ts` → only `src/modules/users/password-hasher.ts`.
   - `grep -rln "@Public()" src` → `health.controller.ts`, `auth.controller.ts` only.
5. **Backend runs:** `npm run start:dev` → `Mapped {/api/auth/login, POST}`, `{/api/auth/me, GET}`, `{/api/auth/change-password, POST}`; Test Plan steps 1–15 pass.
6. **Contract:** `contract/auth.md` exists; README, users, files, trips, health updated; `openapi.json` regenerated and contains `/api/auth/login` and a `bearer` security scheme.

---

## Done Criteria

**Implemented 2026-11-07** (`@nestjs/jwt` ^12.0.4, `bcryptjs` ^3.0.3). Verified: build, lint, `tsc --noEmit`, migration run + no schema drift, seed run twice (`created` / `already exists`), boundaries (step 4; the extra `@Public()` hit in `jwt-auth.guard.ts` is its doc comment). Test Plan: 43 scripted checks covering steps 2–5, 7–11, 14 (download 401 without / 200 with token; trip create + QR regenerate with a token) and 15 (bearer scheme in `/api/docs-json`); step 6 checked with a token signed already expired (401) instead of waiting; step 12 with a raw-SQL user with `password_hash NULL` (401, row removed); step 13 (`JWT_SECRET=short` → boot fails). Differences from the task blocks, now reflected above: `verifyPassword` uses `async/await`; `run-seeds.ts` needs `import 'reflect-metadata'` first. `src/` is the source of truth.

- [x] `@nestjs/jwt` and `bcryptjs` installed; `JWT_SECRET`, `JWT_EXPIRES_IN_SECONDS`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` validated and in `.env.example`.
- [x] Migration `1793455200000-AddPasswordHashToUsers` adds `users.password_hash varchar(255) NULL`; no drift.
- [x] Passwords are bcrypt-hashed in the users module; `passwordHash` is `select: false` and never in a response.
- [x] `POST /auth/login`, `GET /auth/me`, `POST /auth/change-password` work as specified, with the specified 401 messages.
- [x] Global `JwtAuthGuard` protects every route except `@Public()` health and login; deleted or inactive users are rejected on their next request.
- [x] Users routes return `UserResponseDto`; `POST /users` requires `password`, `PATCH /users/:id` may reset it.
- [x] `npm run seed` creates the first admin from `SEED_ADMIN_*` and never overwrites an existing user.
- [x] Swagger has a bearer Authorize button.
- [x] contract/ updated (`auth.md` new; README, users, files, trips, health; `openapi.json`), then `npm run sync:frontend`.
- [x] Auth overview and `00-index.md` updated.
- [x] `npm run build` and `npm run lint` pass; no test files.

**STOP HERE. Report to the user and wait for confirmation before proceeding to Story 13.**
