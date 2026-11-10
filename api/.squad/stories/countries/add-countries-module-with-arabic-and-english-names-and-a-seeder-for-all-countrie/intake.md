# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/countries/add-countries-module-with-arabic-and-english-names-and-a-seeder-for-all-countrie/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):** Countries — Reference Data
- **Feature slug (folder under `plans/`):** `countries`

## Tracker (metadata only)

- **Tracker type:** `none`
- **Work item id:** `` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `User story`
- **Status:** `Done`
- **Assignee:** ``
- **Labels:** `countries, reference-data, crud, seed`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```text
Add Countries module with Arabic and English names and a seeder for all countries
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```text
Product context: drivers (and later other records) need a nationality / country
picked from a fixed list. The UI is bilingual, so every country has an Arabic
and an English name. The list must be pre-filled so nobody types 249 countries
by hand, but admins can still add, rename or remove entries.

Add a `countries` module to the existing Clean Modular Monolith. Follow the
crud-foundation conventions exactly (BaseRepository, BaseListQueryDto,
PaginatedResult, escapeLike, response DTO mapped in the controller), using the
companies module as the worked example:
- Controller -> Service -> Repository. No DDD constructs.
- Controller handles HTTP only (DTOs, ParseUUIDPipe, status codes, mapping
  entities to CountryResponseDto).
- Service holds the rules (uniqueness -> 409, not found -> 404).
- CountriesRepository extends BaseRepository<Country> and adds only the
  paginated search query and softDelete.
- Keep ESM conventions (.js import suffixes, nodenext).
- Only create subfolders that hold something.

Country fields (strings are trimmed before validation):
- nameAr   required string, min 2, max 256, unique among non-deleted countries
- nameEn   required string, min 2, max 256, unique among non-deleted countries

Endpoints (under the global /api prefix):
- POST   /countries        JSON body -> 201 country
- GET    /countries        BaseListQueryDto (page, limit, search) -> { data, meta },
                           newest first; search matches nameAr and nameEn
- GET    /countries/:id    -> country
- PATCH  /countries/:id    partial JSON body -> country
- DELETE /countries/:id    -> 204, soft delete

CountriesService exposes exists(id) so other modules (drivers.nationalityId)
can check a country id without importing the repository.

Seeder:
- First seeder in the project. Lives in src/database/seeds/ (the folder the
  crud-foundation story reserved for seeds).
- Inserts every ISO 3166-1 country/territory (249 rows) with Arabic and English
  names. The data is a typed TS array, not a JSON/CSV file.
- Run with `npm run seed` (builds, then runs the compiled seeder with the same
  .env / DataSource as the migrations).
- Idempotent: re-running inserts only what is missing. A country is skipped when
  its Arabic OR English name already exists, including soft-deleted rows, so a
  country an admin deleted is not brought back.
- All inserts run in one transaction.
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```text
Entity & migration
- [ ] Country entity (table "countries") extends BaseEntity and adds nameAr
      (name_ar), nameEn (name_en) as varchar(256) NOT NULL, and deletedAt
      (@DeleteDateColumn).
- [ ] Partial unique indexes on name_ar and on name_en where deleted_at IS NULL.
- [ ] A hand-written TypeORM migration creates the table; synchronize stays
      disabled; migration:generate reports no drift.

Validation
- [ ] nameAr and nameEn are required on create; each is a trimmed string of
      2-256 characters. Violations return 400 with the global error shape.
- [ ] PATCH accepts any subset of the same fields with the same rules; null for
      either field returns 400 (not 500).
- [ ] Unknown body fields return 400.
- [ ] Invalid list query (page=0, limit=101, limit=abc, search=" ") returns 400.

CRUD
- [ ] Duplicate nameAr or nameEn on create or update returns 409.
- [ ] GET /api/countries?page=&limit=&search= returns
      { data, meta: { page, limit, total, totalPages } }, newest first, with a
      stable order across pages.
- [ ] Search is case-insensitive, matches nameAr/nameEn only, and treats % and _
      literally.
- [ ] GET/PATCH/DELETE on an unknown or soft-deleted id return 404; a non-uuid
      id returns 400.
- [ ] DELETE soft-deletes and returns 204; the country disappears from lists.
- [ ] All endpoints return CountryResponseDto, never the Country entity.
- [ ] CountriesModule exports only CountriesService.

Seeder
- [ ] `npm run seed` on an empty table inserts 249 countries; running it again
      inserts 0.
- [ ] The seed data has no duplicate nameAr or nameEn and every name passes the
      create DTO rules (trimmed, 2-256 chars).
- [ ] Soft-deleted countries are not re-inserted by the seeder.
- [ ] README documents `npm run seed`.

Quality
- [ ] ESM preserved; `npm run build` and `npm run lint` pass.
- [ ] No test files added.
```

---

## Attachments

Place files in `attachments/` next to this `intake.md`, then list them here so the planner knows what to open.

| File (relative to this folder) | What it is |
| ------------------------------ | ---------- |

None.

---

## Dependencies

- **Blocked by / related ids:** project-structure (Story 01), companies (Story 03 — created the shared crud-foundation pieces).
- **Depends on code areas or other stories:** src/common/{dto,repositories,utils}
  (crud-foundation pieces), src/common/entities/base.entity.ts, companies module as
  the reference pattern, src/database/data-source.ts (reused by the seeder).
- **Blocks:** drivers — `drivers.nationality_id` is a foreign key to `countries.id`
  and `DriversService` calls `CountriesService.exists`.

## Extra notes (optional)

- The list includes territories (e.g. Greenland, Hong Kong, Puerto Rico) because it
  follows ISO 3166-1. Remove entries from the data file if the product wants UN
  member states only.
- Arabic names are stored without diacritics (e.g. "عمان", not "عُمان") so plain
  ILIKE search finds them.

## Technical hints (optional)

- Stack: NestJS 12, TypeScript 6, ESM, oxlint, prettier, TypeORM 1.x + pg.
- The global exception filter already maps Postgres unique violations (23505) to 409.
- `PartialType(..., { skipNullProperties: false })` is needed so null is
  validated instead of reaching NOT NULL columns.
- TypeORM's primary key name is `"PK_" + sha1("<table>_id").substring(0, 27)`.

## Out of scope

- What this story explicitly does **not** cover:
  - ISO codes, phone codes, flags, currencies or any column beyond the two names.
  - Case-insensitive or diacritic-insensitive uniqueness.
  - Cities/regions, and linking countries to companies or trips.
  - Blocking deletion of a country still used by drivers (soft delete does not
    trigger the FK).
  - A generic seeding framework, seed versioning, or running seeds on app start.
  - Authorization rules, tests, Docker, CI/CD.
