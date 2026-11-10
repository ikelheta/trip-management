# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/companies/add-companies-module-to-manage-leasing-company-profiles-with-header-and-footer-i/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):** Companies — Leasing Company Profiles
- **Feature slug (folder under `plans/`):** `companies`

## Tracker (metadata only)

- **Tracker type:** `none`
- **Work item id:** `` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `User story`
- **Status:** `New`
- **Assignee:** ``
- **Labels:** `companies, core-domain, files`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```text
Add Companies module to manage leasing company profiles with header and footer images
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```text
Product context: the core of this project is letting small leasing companies
manage their vehicles, drivers and trips. The company is the first business
module; vehicles, drivers and trips will belong to a company in later stories.

Add a `companies` module to the existing Clean Modular Monolith, following the
users reference module:
- Controller -> Service -> Repository. No DDD constructs.
- Controller handles HTTP only (DTOs, ParseUUIDPipe, multipart, status codes).
- Service holds the rules (uniqueness, image handling).
- Repository wraps TypeORM Repository<Company>.
- Keep ESM conventions (.js import suffixes, nodenext).
- Only create subfolders that hold something.

Company fields (all strings are trimmed before validation):
- name                required string, min 2, max 256
- registrationNumber  required string, min 2, max 256, unique among
                      non-deleted companies
- city                required string, min 2, max 256
- address             required string, min 2, max 256
- whatsAppNumber      required string, min 2, max 256
- phoneNumber         required string, min 2, max 256
- headerUrl           optional, url of an uploaded image (header on company documents)
- footerUrl           optional, url of an uploaded image (footer on company documents)

Image flow (upload first, then reference by url):
1. The client uploads each image with the existing POST /api/files, sending
   ownerType "companies" and NO ownerId (the company does not exist yet).
2. The upload response now includes `url` (the download path,
   /api/files/<id>/download).
3. The client sends that url as headerUrl / footerUrl in create or update company.
4. The companies service checks the url points to an existing, non-deleted
   image (jpeg/png/webp) uploaded with ownerType "companies" that is not linked
   to another company, saves the company, then links the file to the company
   (ownerId = company id) through FilesService.
5. Replacing or clearing (null) headerUrl/footerUrl on update soft-deletes the
   previous file. header and footer cannot be the same file.

Files module changes required by this flow (in this story):
- ownerId becomes optional on upload (column nullable). ownerType stays required.
  Listing still requires both ownerType and ownerId.
- FileEntity responses include a computed `url` (not a column).
- FilesService gains findByUrl(url) and attach(id, ownerType, ownerId), which
  links an unlinked file atomically (fails if already linked).

Target structure:

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

Endpoints (under the global /api prefix):
- POST   /companies                 JSON body -> 201 company
- GET    /companies                 -> list, newest first
- GET    /companies/:id             -> company
- PATCH  /companies/:id             partial JSON body -> company
- DELETE /companies/:id             -> 204, soft delete
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```text
Entity & migration
- [ ] Company entity (table "companies") extends the shared BaseEntity
      (id, createdAt, updatedAt) and adds: name, registrationNumber, city,
      address, whatsAppNumber, phoneNumber (varchar 256), headerUrl,
      footerUrl (varchar 512, nullable), deletedAt (@DeleteDateColumn).
- [ ] files.owner_id becomes nullable (migration).
- [ ] registrationNumber is unique among non-deleted rows (partial unique index).
- [ ] A TypeORM migration creates the table; synchronize stays disabled.

Validation
- [ ] All six text fields are required on create; each is a trimmed string of
      2-256 characters. Violations return 400 with the global error shape.
- [ ] PATCH accepts any subset of the same fields with the same rules.
- [ ] Unknown body fields return 400.

CRUD
- [ ] Duplicate registrationNumber on create or update returns 409.
- [ ] GET/PATCH/DELETE on an unknown or soft-deleted id return 404; a
      non-uuid id returns 400.
- [ ] DELETE soft-deletes and returns 204; the company disappears from lists.

Header / footer
- [ ] POST /api/files accepts ownerType without ownerId and returns `url`.
- [ ] headerUrl/footerUrl that is not a file url, points to an unknown or
      deleted file, a non-image, a file with another ownerType, or a file
      linked to another company -> 400. Same file for both -> 400.
- [ ] After create/update the referenced files have ownerId = company id.
- [ ] Replacing or clearing (null) an image soft-deletes the previous file.

Module boundaries
- [ ] CompaniesModule imports FilesModule and uses only FilesService; it never
      imports the files repository, storage provider or url helpers.
- [ ] Nothing outside src/modules/companies imports from it except app.module.ts.

Quality
- [ ] ESM setup preserved; `npm run build` and `npm run lint` pass.
- [ ] No test files added; nest-cli spec generation stays disabled.
```

---

## Attachments

Place files in `attachments/` next to this `intake.md`, then list them here so the planner knows what to open.

| File (relative to this folder) | What it is |
| ------------------------------ | ---------- |

None.

---

## Dependencies

- **Blocked by / related ids:** project-structure (Story 01), files (Story 02)
- **Depends on code areas or other stories:** src/common/entities/base.entity.ts,
  src/modules/files (FilesService public API), users module as the reference pattern.

## Extra notes (optional)

- The company will become the tenant boundary: later stories add vehicles,
  drivers and trips with a companyId, and link users to a company. None of that
  is in this story.
- Authorization (who can manage which company) arrives with the auth story.

## Technical hints (optional)

- Stack: NestJS 12, TypeScript 6, ESM, oxlint, prettier, TypeORM + pg.
- The url is a relative path (/api/files/<id>/download), so it survives host
  changes; it must match the global prefix in main.ts.
- The global exception filter already maps Postgres unique violations (23505) to 409.

## Out of scope

- What this story explicitly does **not** cover:
  - Vehicles, drivers, trips, and linking users to companies.
  - Pagination, filtering and sorting of the list (crud-foundation story).
  - Phone/WhatsApp format validation (E.164) beyond the 2-256 length rule.
  - Image dimension checks, resizing, thumbnails.
  - Cleanup of uploaded files that are never linked to an owner.
  - Absolute or signed (S3) urls.
  - Authorization rules, tests, Swagger, Docker, CI/CD.
