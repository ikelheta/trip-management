# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/project-structure/restructure-project-as-clean-modular-monolith-no-ddd-no-test-files/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):** Project Structure — Clean Modular Monolith
- **Feature slug (folder under `plans/`):** `project-structure`

## Tracker (metadata only)

- **Tracker type:** `none`
- **Work item id:** `` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `Technical story`
- **Status:** `New`
- **Assignee:** ``
- **Labels:** `architecture, setup`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```
Restructure project as Clean Modular Monolith (no DDD, no test files)
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```
Act as a Senior Staff Backend Engineer specialized in Node.js, NestJS, TypeScript,
PostgreSQL, and scalable backend architecture.

Design and implement the foundation of a production-ready NestJS Modular Monolith
for the trip-management backend, using pragmatic Clean Architecture, SOLID, and
industry best practices.

IMPORTANT: Do NOT apply Domain-Driven Design (DDD). Do not introduce:
- Aggregates or aggregate roots
- Bounded contexts
- Domain events or domain-driven event modeling
- Value objects
- Domain factories
- Rich domain models
- Repository abstractions purely for DDD purposes
- Unnecessary domain services or domain layers

Architectural principles:
- Organize the application by business features/modules.
- Separate responsibilities between controllers, services, and data access.
- Keep business logic inside application services.
- Keep controllers responsible only for HTTP concerns.
- Keep database operations inside repositories or dedicated data-access classes.
- Use dependency injection and dependency inversion where beneficial.
- Apply SOLID pragmatically; avoid unnecessary interfaces, abstractions, and patterns.
- Prefer straightforward, readable code over architectural complexity.
- Modules have clear boundaries and communicate only through their public APIs
  (exported providers of the Nest module).

Target structure:

src/
├── common/
├── config/
├── database/
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
│   ├── auth/      (later story)
│   └── orders/    (later story)
├── app.module.ts
└── main.ts

Layer responsibilities:
- Controller: handle HTTP requests/responses, validate and transform input,
  call services, never contain business logic.
- Service: implement business rules and workflows, coordinate operations,
  handle transactions through appropriate abstractions, stay independent of HTTP.
- Repository: database queries and persistence, encapsulate TypeORM queries,
  provide reusable data-access methods, no business workflows.
- Entity: represent database structures (columns, relations, indexes,
  constraints), no complex business behavior.

Implementation philosophy:
- Use the simplest architecture that solves the actual problem.
- For standard CRUD, Controller -> Service -> Repository is sufficient.
- Introduce extra layers/abstractions only when complexity justifies them.
- Do not create unnecessary files, interfaces, factories, classes, or folders
  just to satisfy a pattern (only create dto/ entities/ enums/ interfaces/
  subfolders when they hold something).

Also in this story: remove all test files and test tooling from the generated
Nest project — the project must not contain test files, and the Nest CLI must
not generate spec files going forward.
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```
Test removal
- [ ] src/app.controller.spec.ts and the test/ folder are deleted.
- [ ] vitest.config.ts and vitest.config.e2e.ts are deleted.
- [ ] test, test:watch, test:cov, test:debug, test:e2e scripts removed from package.json.
- [ ] Test-only devDependencies removed (vitest, @vitest/coverage-v8, @nestjs/testing,
      supertest, @types/supertest, vite-tsconfig-paths).
- [ ] "vitest/globals" removed from tsconfig.json "types"; lint/format scripts no
      longer reference test/.
- [ ] nest-cli.json sets "generateOptions": { "spec": false } so `nest g` creates no specs.

Structure & infrastructure
- [ ] src/common/, src/config/, src/database/, src/modules/ exist with real content
      (no empty placeholder folders).
- [ ] Config: @nestjs/config with a typed, validated env config (app port, DB connection);
      app fails fast on invalid/missing env; .env.example committed, .env gitignored.
- [ ] Database: TypeORM + PostgreSQL wired via TypeOrmModule.forRootAsync using config;
      synchronize disabled; migrations folder + migration scripts in package.json.
- [ ] Common: global ValidationPipe (whitelist, forbidNonWhitelisted, transform),
      a global exception filter with a consistent error response shape, and a shared
      base entity (id uuid, createdAt, updatedAt) only if it is reused.
- [ ] main.ts: global prefix (e.g. /api), validation pipe, shutdown hooks, port from config.
- [ ] Default AppController/AppService are removed or replaced by a minimal health endpoint.

Reference module (users)
- [ ] src/modules/users implements CRUD with Controller -> Service -> Repository.
- [ ] Controller only handles HTTP (DTOs with class-validator, ParseUUIDPipe, status codes).
- [ ] Service holds business rules (e.g. unique email check, NotFound handling).
- [ ] Repository wraps TypeORM Repository<User> with reusable query methods.
- [ ] UsersModule exports only UsersService as its public API.
- [ ] No DDD constructs (aggregates, value objects, domain events, factories, etc.).

Quality
- [ ] Project keeps ESM setup ("type": "module", .js import suffixes, nodenext).
- [ ] `npm run build` and `npm run lint` pass; app starts with a valid .env and a
      running PostgreSQL instance.
```

---

## Attachments

Place files in `attachments/` next to this `intake.md`, then list them here so the planner knows what to open.

| File (relative to this folder) | What it is |
| ------------------------------ | ---------- |

None.

---

## Dependencies

- **Blocked by / related ids:** none
- **Depends on code areas or other stories:** Freshly generated NestJS 12 project in repo root (`src/`, `package.json`, `nest-cli.json`, `tsconfig.json`).

## Extra notes (optional)

- This is the foundation story; all later feature modules (auth, trips, bookings, etc.) will follow the users module as the reference pattern.

## Technical hints (optional)

- Repos/roots: `.`. Primary language: `typescript`.
- Stack: NestJS 12, TypeScript 6, ESM (`"type": "module"`, `module: nodenext`), oxlint, prettier.
- Persistence: PostgreSQL via `@nestjs/typeorm` + `typeorm` + `pg`.
- Validation: `class-validator` + `class-transformer`.
- Config: `@nestjs/config` (validate env with class-validator or a simple validate function — no extra schema library unless justified).

## Out of scope

- What this story explicitly does **not** cover:
  - Auth module (JWT, guards, password hashing) — separate story.
  - Orders / trips / any other business modules — separate stories.
  - Writing tests of any kind.
  - Docker, CI/CD, deployment configuration.
  - Swagger/OpenAPI docs.
