# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/crud-foundation/shared-crud-foundation-baserepository-baselistquerydto-pagination-users-as-refer/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):** CRUD Foundation — shared building blocks for all CRUD modules
- **Feature slug (folder under `plans/`):** `crud-foundation`

## Tracker (metadata only)

- **Tracker type:** `none`
- **Work item id:** `` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `Technical story`
- **Status:** `New`
- **Assignee:** ``
- **Labels:** `architecture, crud, shared`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```text
Shared CRUD foundation: BaseRepository, BaseListQueryDto, pagination (users as reference)
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

**Scope of this story:** build the shared CRUD building blocks once in `src/common/`, then refactor the existing `users` module (from Story 01) onto them so it becomes the reference implementation every future CRUD module copies. Future modules (categories, trips, …) are **separate stories** that reuse these pieces; they are not implemented here.

````markdown
# Story: Implement CRUD Operations Using Clean Modular Monolith Architecture

## 1. Objective

Implement complete CRUD operations for a given resource using NestJS, TypeORM, and PostgreSQL.

Follow the project's Clean Modular Monolith architecture, focusing on maintainability, simplicity, reusability, and separation of concerns.

**IMPORTANT: Do NOT apply Domain-Driven Design (DDD).**

Do not introduce unnecessary abstractions, architectural layers, or design patterns.

---

## 2. Architectural Principles

Follow these principles:

1. Organize the application by business features/modules.
2. Separate responsibilities between controllers, services, and repositories.
3. Keep business logic inside services.
4. Keep database operations inside repositories.
5. Use dependency injection appropriately.
6. Apply SOLID principles pragmatically.
7. Prefer simple and readable code over unnecessary abstractions.
8. Maintain clear module boundaries.
9. Avoid circular dependencies.
10. Reuse shared components whenever appropriate.

Do NOT introduce:
- Aggregates or aggregate roots.
- Bounded contexts.
- Value objects.
- Domain events.
- Domain factories.
- Rich domain models.
- Unnecessary repository interfaces.
- Generic base services.
- Unnecessary abstraction layers.

### Architecture Flow

Controller → Service → ModuleRepository → BaseRepository → TypeORM → PostgreSQL

---

## 3. Project Structure

Use the following structure, adapting it to existing project conventions:

src/
├── common/
│   ├── dto/
│   │   └── base-list-query.dto.ts
│   ├── repositories/
│   │   └── base.repository.ts
│   ├── decorators/
│   ├── filters/
│   ├── guards/
│   ├── interceptors/
│   ├── pipes/
│   ├── exceptions/
│   └── utils/
│
├── config/
│
├── database/
│   ├── migrations/
│   └── seeds/
│
├── modules/
│   ├── users/
│   │   ├── users.module.ts
│   │   ├── users.controller.ts
│   │   ├── users.service.ts
│   │   ├── users.repository.ts
│   │   ├── dto/
│   │   ├── entities/
│   │   ├── enums/
│   │   └── interfaces/
│   │
│   └── categories/
│       └── ...
│
├── app.module.ts
└── main.ts

Do not create unnecessary files or empty folders.

---

## 4. Layer Responsibilities

### Controller

- Handle HTTP requests and responses.
- Define REST endpoints.
- Validate and transform incoming requests using DTOs.
- Delegate operations to services.
- Use appropriate HTTP methods and status codes.
- Never contain business logic.

### Service

- Implement business logic and workflows.
- Coordinate repository operations.
- Validate business constraints.
- Handle resource existence checks.
- Handle transactions when required.
- Keep HTTP-specific concerns out of business logic.

### Module Repository

- Extend the shared BaseRepository.
- Handle module-specific database queries.
- Implement specialized filtering and search queries.
- Encapsulate TypeORM operations.
- Avoid implementing business workflows.

### Entity

- Represent database structures.
- Define columns, relations, indexes, and constraints.
- Follow existing TypeORM conventions.
- Do not expose entities directly through API responses.

---

## 5. Shared BaseListQueryDto

Create a reusable DTO:

`src/common/dto/base-list-query.dto.ts`

It must contain:

| Property | Type | Default | Validation |
|---|---|---|---|
| page | number | 1 | Integer, minimum 1 |
| limit | number | 10 | Integer, minimum 1, maximum 100 |
| search | string | undefined | Optional, non-empty if provided |

Example implementation:

```typescript
import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class BaseListQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 10;

  @IsOptional()
  @IsString()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @MinLength(1)
  @MaxLength(100)
  search?: string;
}
```

Requirements:

- Transform page and limit from query strings into numbers.
- Apply default values when parameters are omitted.
- Reject invalid pagination values.
- Trim search input.
- Allow search to be optional.
- Do not duplicate pagination and search properties in individual module DTOs.

---

## 6. Module-Specific List DTOs

Each module must extend BaseListQueryDto when additional filters are required.

Example:

```typescript
export class GetCategoriesQueryDto extends BaseListQueryDto {
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  isActive?: boolean;
}
```

Requirements:

- Reuse shared pagination and search properties.
- Add only module-specific filters.
- Implement search against relevant searchable fields.
- Do not automatically search every database column.
- Support filtering and sorting only when required by the resource.

---

## 7. Shared BaseRepository

Create a reusable generic repository:

`src/common/repositories/base.repository.ts`

The BaseRepository must use TypeORM's Repository internally.

### Required Methods

Implement reusable methods:

- `create(data)` – Create an entity.
- `findById(id)` – Find an entity by ID.
- `findOne(options)` – Find one entity using conditions.
- `findAll(options)` – Retrieve entities using conditions.
- `findAndCount(options)` – Retrieve entities and total count.
- `update(id, data)` – Update an entity by ID.
- `delete(id)` – Delete an entity by ID.
- `exists(options)` – Check whether an entity exists.
- `count(options)` – Count matching entities.

Requirements:

- Use TypeScript generics.
- Use appropriate TypeORM types.
- Keep the underlying TypeORM repository protected.
- Avoid hardcoding entity-specific fields or relationships.
- Do not put business rules inside BaseRepository.
- Support TypeORM EntityManager for transaction-related operations where appropriate.
- Avoid exposing unnecessary TypeORM implementation details.

### Example BaseRepository

```typescript
import {
  DeepPartial,
  FindManyOptions,
  FindOneOptions,
  FindOptionsWhere,
  Repository,
} from 'typeorm';

export class BaseRepository<T extends { id: string }> {
  constructor(
    protected readonly repository: Repository<T>,
  ) {}

  async create(data: DeepPartial<T>): Promise<T> {
    const entity = this.repository.create(data);
    return this.repository.save(entity);
  }

  async findById(id: string): Promise<T | null> {
    return this.repository.findOne({
      where: { id } as FindOptionsWhere<T>,
    });
  }

  async findOne(options: FindOneOptions<T>): Promise<T | null> {
    return this.repository.findOne(options);
  }

  async findAll(options?: FindManyOptions<T>): Promise<T[]> {
    return this.repository.find(options);
  }

  async findAndCount(
    options?: FindManyOptions<T>,
  ): Promise<[T[], number]> {
    return this.repository.findAndCount(options);
  }

  async update(
    id: string,
    data: DeepPartial<T>,
  ): Promise<T | null> {
    const entity = await this.findById(id);

    if (!entity) {
````

> ⚠️ **The pasted original was cut off at this point (inside `update()`).** Everything below, up to the end of the Description section, was **added to complete the story** and follows the intent of sections 1–7. Replace it with your original wording if it differs.

````markdown
      return null;
    }

    this.repository.merge(entity, data);
    return this.repository.save(entity);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete({ id } as FindOptionsWhere<T>);
    return (result.affected ?? 0) > 0;
  }

  async exists(where: FindOptionsWhere<T> | FindOptionsWhere<T>[]): Promise<boolean> {
    return this.repository.existsBy(where);
  }

  async count(options?: FindManyOptions<T>): Promise<number> {
    return this.repository.count(options);
  }
}
```

### Transactions (EntityManager)

- Write methods (`create`, `update`, `delete`) accept an optional last parameter
  `manager?: EntityManager`. When provided, the operation runs on
  `manager.getRepository(this.repository.target)` so it joins the caller's transaction.
- Services own transactions: inject `DataSource` and call
  `this.dataSource.transaction(async (manager) => { ... })`, passing `manager`
  to every repository call inside. Only do this when one workflow writes more than once.
- BaseRepository is NOT `@Injectable()` and is never registered as a provider.
  Each module repository is `@Injectable()`, extends it, and passes the injected
  TypeORM repository to `super()`:

```typescript
@Injectable()
export class UsersRepository extends BaseRepository<User> {
  constructor(@InjectRepository(User) repository: Repository<User>) {
    super(repository);
  }

  // module-specific queries only, e.g. findByEmail(), findPaginated(query)
}
```

---

## 8. Paginated Responses

All list endpoints return the same shape:

```json
{
  "data": [ ... ],
  "meta": { "page": 1, "limit": 10, "total": 42, "totalPages": 5 }
}
```

- Define a generic type for it in `src/common/` (e.g. `PaginatedResult<T>`).
- Provide small shared helpers in `src/common/utils/` to:
  - convert `page`/`limit` into TypeORM `skip`/`take`;
  - build the `{ data, meta }` result from `[items, total]` and the query.
- `totalPages` is `Math.ceil(total / limit)` (0 when total is 0).
- A page beyond the last page returns `data: []` with correct `meta`, not an error.

---

## 9. Search and Filtering

- Each module repository declares which columns are searchable (e.g. users:
  `email`, `firstName`, `lastName`). Never search all columns.
- Search is case-insensitive partial match using TypeORM `ILike`, OR-ed across the
  searchable columns, AND-ed with module filters (e.g. `isActive`).
- Escape `%`, `_` and `\` in the search term before building the `ILike` pattern,
  via a shared helper in `src/common/utils/`.
- Default sort is `createdAt DESC`. Add client-controlled sorting only when a
  module needs it (not needed for users).

---

## 10. API Responses (no entities in responses)

- Each module defines a response DTO in its `dto/` folder (e.g. `UserResponseDto`)
  with an explicit static `fromEntity(entity)` mapper. Controllers return response
  DTOs (or `PaginatedResult<ResponseDto>`), never entities.
- Mapping happens in the service or controller — pick one place and use it
  consistently across modules.
- Do not use `ClassSerializerInterceptor` / `@Exclude` magic; explicit mapping is
  the convention.

---

## 11. REST Endpoints (per CRUD module)

| Method | Path | Body / Query | Success | Errors |
|---|---|---|---|---|
| POST | `/api/<resource>` | Create DTO | 201 + response DTO | 400, 409 |
| GET | `/api/<resource>` | List query DTO | 200 + paginated result | 400 |
| GET | `/api/<resource>/:id` | — | 200 + response DTO | 400 (bad uuid), 404 |
| PATCH | `/api/<resource>/:id` | Update DTO (partial) | 200 + response DTO | 400, 404, 409 |
| DELETE | `/api/<resource>/:id` | — | 204 | 400, 404 |

---

## 12. Apply to the users module (reference implementation)

Refactor `src/modules/users/` (created in Story 01) onto the shared pieces:

- `UsersRepository` extends `BaseRepository<User>`; keeps only `findByEmail` and a
  paginated search/filter query.
- Add `GetUsersQueryDto extends BaseListQueryDto` with optional filters
  `isActive` (boolean) and `role` (`UserRole`).
- Add `UserResponseDto` with `fromEntity`.
- `GET /api/users` returns `PaginatedResult<UserResponseDto>`.
- `UsersService` keeps its business rules (email normalization, uniqueness → 409,
  not found → 404) and uses `BaseRepository` methods for the rest.
- No behavior change for create/read/update/delete other than response shape and
  the new list query parameters.

---

## 13. Reusable guide for future modules

Write a short developer guide at `docs/crud-module-guide.md`: the files a new CRUD
module needs, which shared pieces to extend/reuse, naming conventions, and the
checklist from the acceptance criteria below — using the users module as the
worked example.
````

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```text
Shared components
- [ ] src/common/dto/base-list-query.dto.ts: page (default 1, int ≥ 1), limit (default 10,
      int 1–100), search (optional, trimmed, 1–100 chars). Query strings are converted to numbers.
- [ ] src/common/repositories/base.repository.ts: generic BaseRepository<T extends { id: string }>
      with create, findById, findOne, findAll, findAndCount, update, delete, exists, count.
      Underlying TypeORM repository is protected. No entity-specific fields. No business rules.
- [ ] Write methods accept an optional EntityManager to participate in a transaction.
- [ ] BaseRepository is not @Injectable and not registered as a provider.
- [ ] Shared PaginatedResult<T> type and pagination helpers (skip/take + result builder).
- [ ] Shared helper that escapes LIKE wildcards in search terms.
- [ ] Only folders that contain files are created (no empty decorators/, guards/, pipes/,
      interceptors/, exceptions/, seeds/ folders).

Users module (reference implementation)
- [ ] UsersRepository extends BaseRepository<User>; contains only user-specific queries.
- [ ] GetUsersQueryDto extends BaseListQueryDto with isActive and role filters; no
      duplicated page/limit/search properties.
- [ ] GET /api/users?page=2&limit=5&search=jo&isActive=true&role=user returns
      { data, meta: { page, limit, total, totalPages } }.
- [ ] Search is case-insensitive, matches email/firstName/lastName only, and treats
      % and _ literally.
- [ ] Invalid query (page=0, limit=101, limit=abc, search=" ", isActive=yes) → 400.
- [ ] All endpoints return UserResponseDto, never the User entity.
- [ ] Status codes match the endpoint table (201 / 200 / 204 / 400 / 404 / 409).
- [ ] UsersModule still exports only UsersService.

Architecture
- [ ] No generic base service, no repository interfaces, no DDD constructs.
- [ ] No circular imports between modules or between common/ and modules/
      (common/ never imports from modules/).
- [ ] ESM preserved (.js suffix on relative imports).
- [ ] docs/crud-module-guide.md exists and describes how to add a new CRUD module.
- [ ] npm run build and npm run lint pass.
```

---

## Attachments

Place files in `attachments/` next to this `intake.md`, then list them here so the planner knows what to open.

| File (relative to this folder) | What it is |
| ------------------------------ | ---------- |

None.

---

## Dependencies

- **Blocked by / related ids:** Story 01 (`project-structure`) must be implemented first.
- **Depends on code areas or other stories:** `.squad/plans/project-structure/01-story-restructure-project-as-clean-modular-monolith-no-ddd-no-test-files.md` — creates `src/modules/users/*`, `src/common/filters/all-exceptions.filter.ts`, the global `ValidationPipe` (`transform: true`, `exposeUnsetFields: false`) in `src/main.ts`, and the `users` table migration. This story refactors those files; it does not recreate them.

## Extra notes (optional)

- This story is the template for most future modules. Each future module gets its own story (`squad new-story <module>`) that says "follow the CRUD foundation conventions" and lists only the resource's fields, searchable columns, filters, and unique constraints.

## Technical hints (optional)

- Repos/roots: `.`. Primary language: `typescript`.
- Stack: NestJS 12, TypeORM 1.x (`ILike`, `existsBy`, `findAndCount`, `merge`), PostgreSQL, class-validator 0.15, class-transformer 0.5, ESM (`"type": "module"`, `module: nodenext`).
- The global ValidationPipe does **not** enable implicit conversion, so query DTOs need `@Type(() => Number)` / explicit `@Transform` for numbers and booleans.

## Out of scope

- What this story explicitly does **not** cover:
  - Implementing categories or any other new module.
  - Generic base service or generic base controller.
  - Soft delete, auditing (createdBy/updatedBy), optimistic locking.
  - Client-controlled sorting (`sortBy`/`sortOrder`) — add per module only when needed.
  - Cursor pagination.
  - Seeds (`src/database/seeds/`).
  - Auth/guards, Swagger, tests.
