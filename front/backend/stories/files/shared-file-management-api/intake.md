# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/files/shared-file-management-api/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):** Files — Shared File Management API
- **Feature slug (folder under `plans/`):** `files`

## Tracker (metadata only)

- **Tracker type:** `none`
- **Work item id:** `` *(used in filenames and plan tables; fill manually if empty)*
- **Work item type:** `Technical story`
- **Status:** `New`
- **Assignee:** ``
- **Labels:** `files, shared-module, storage`

External tracker links are **not** followed by the planner. Keep the id for naming and traceability only.

---

## Title

*(Paste the work item title verbatim. Prefilled when `squad new-story` fetched from a tracker.)*

```text
Add shared Files module for upload, download, list and delete across all modules
```

---

## Description

*(Paste the full work item description. Prefilled when fetched from a tracker.)*

```text
Act as a Senior Staff Backend Engineer specialized in NestJS, TypeScript,
PostgreSQL and TypeORM.

Add a shared `files` module to the existing Clean Modular Monolith (see the
project-structure story). Any business module (users, trips, bookings, ...) must
be able to attach files to its own records without the files module knowing
anything about those modules.

Follow the same rules as the users reference module:
- Controller -> Service -> Repository. No DDD constructs.
- Controller handles HTTP only (multipart, DTOs, ParseUUIDPipe, status codes,
  streaming the response).
- Service holds the rules (validation of size/type, naming, linking to owner,
  soft delete) and coordinates storage + repository.
- Repository wraps TypeORM Repository<FileEntity>.
- Keep ESM conventions (.js import suffixes, nodenext).
- Only create subfolders that hold something.

Ownership model (generic, no foreign keys to other modules):
- Every file row has `ownerType` (string, e.g. "users", "trips") and `ownerId`
  (uuid of the record in that module).

Storage abstraction (the only interface in this story, justified because the
backend will change):
- `StorageProvider` interface: save(key, buffer) / getStream(key) / delete(key).
- Injected via a token (e.g. STORAGE_PROVIDER), provider chosen from config.
- Implement only `LocalStorageProvider` (writes under a configured base path).
- Stored key is generated (uuid + extension); never use the client filename on disk.

Target structure:

src/modules/files/
├── files.module.ts
├── files.controller.ts
├── files.service.ts
├── files.repository.ts
├── dto/
│   ├── upload-file.dto.ts        (ownerType, ownerId)
│   └── list-files-query.dto.ts   (ownerType, ownerId)
├── entities/
│   └── file.entity.ts
└── storage/
    ├── storage-provider.interface.ts
    ├── storage.constants.ts      (injection token)
    └── local-storage.provider.ts

Endpoints (under the global /api prefix):
- POST   /files                multipart field "file" + ownerType + ownerId -> 201 metadata
- GET    /files/:id            -> metadata
- GET    /files/:id/download   -> streamed content (StreamableFile, correct
                                  Content-Type and Content-Disposition)
- GET    /files?ownerType=&ownerId=  -> list of metadata
- DELETE /files/:id            -> 204, soft delete (row kept, file stays on disk)

Public API for other modules:
- FilesModule exports only FilesService.
- FilesService exposes: upload(file, ownerType, ownerId), findById(id),
  findByOwner(ownerType, ownerId), getStream(id), remove(id).
- Other modules import FilesModule and inject FilesService; they never touch
  the files repository or storage provider directly.
```

---

## Acceptance criteria

*(Checklist, bullets, Gherkin, etc. Prefilled for Azure DevOps when the work item has acceptance criteria.)*

```text
Entity & migration
- [ ] FileEntity (table "files") reuses the shared base entity (id, createdAt,
      updatedAt) and adds: ownerType, ownerId (uuid), originalName, storageKey
      (unique), mimeType, sizeBytes, checksum (sha256), deletedAt (@DeleteDateColumn).
- [ ] Index on (ownerType, ownerId).
- [ ] A TypeORM migration creates the table; synchronize stays disabled.

Config
- [ ] Typed, validated env added to existing config: STORAGE_DRIVER (only "local"
      allowed for now), STORAGE_LOCAL_PATH, FILE_MAX_SIZE_MB,
      FILE_ALLOWED_MIME_TYPES (comma-separated). App fails fast if invalid.
- [ ] .env.example updated; local storage folder is gitignored.

Upload
- [ ] Uses FileInterceptor from @nestjs/platform-express with memory storage and
      a size limit from config.
- [ ] Rejects missing/empty file (400), oversize file (413), disallowed MIME type
      (415 or 400 with clear message).
- [ ] Original filename is sanitized and stored only as metadata.
- [ ] If the DB insert fails after the file is saved, the stored file is deleted
      (no orphan files).

Read / download / list / delete
- [ ] GET by id and download return 404 for unknown or soft-deleted files.
- [ ] Download streams via StreamableFile with Content-Type and an encoded
      Content-Disposition filename.
- [ ] List requires both ownerType and ownerId (validated DTO) and excludes
      soft-deleted rows.
- [ ] DELETE soft-deletes and returns 204.

Module boundaries
- [ ] FilesModule exports only FilesService.
- [ ] StorageProvider is bound through an injection token chosen by config.
- [ ] No imports from other business modules inside src/modules/files.
- [ ] Errors use the global exception filter's response shape.

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

- **Blocked by / related ids:** project-structure (Clean Modular Monolith foundation)
- **Depends on code areas or other stories:** src/config, src/database, src/common
  (base entity, exception filter, ValidationPipe), users module as the reference pattern.

## Extra notes (optional)

- This module is infrastructure-like but lives under src/modules because it owns
  a table and HTTP endpoints.
- Authorization (who can read/delete which owner's files) arrives with the auth
  story; leave a single clearly marked place in FilesService where an access
  check will go, but do not implement it now.

## Technical hints (optional)

- Stack: NestJS 12, TypeScript 6, ESM, oxlint, prettier, TypeORM + pg.
- Add `@types/multer` as a devDependency if needed for Express.Multer.File typing.
- Use Node's `crypto` for sha256 and `fs/promises` + `createReadStream` for local storage.
- Prefer Nest's built-in exceptions (BadRequest, NotFound, PayloadTooLarge,
  UnsupportedMediaType).

## Out of scope

- What this story explicitly does **not** cover:
  - S3 / Azure / GCS providers (only the interface is prepared).
  - Hard delete / cleanup job for soft-deleted files.
  - Chunked or resumable uploads, presigned URLs.
  - Image resizing, thumbnails, virus scanning.
  - Authorization rules (auth story).
  - Tests of any kind, Swagger/OpenAPI, Docker, CI/CD.
