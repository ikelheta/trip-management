# companies — plan overview

Entry point for the **companies** feature. Stories execute in order by their `NN` prefix.

## Stories

| NN | File | Title | Tracker id | Depends on |
|----|------|-------|------------|------------|
| 03 | [03-story-company-management-api.md](03-story-company-management-api.md) | Add Companies module to manage leasing company profiles with header and footer images | — | [01](../project-structure/01-story-restructure-project-as-clean-modular-monolith-no-ddd-no-test-files.md), [02](../files/02-story-shared-file-management-api.md) |

## Dependency notes

- Builds on Story 01 (users module pattern, `ValidationPipe`, `AllExceptionsFilter` 23505 → 409) and Story 02 (`BaseEntity`, `FilesModule`/`FilesService` for header and footer images).
- **Changes the files feature's contract:** upload without `ownerId`, `url` on every file response, and new `FilesService.findByUrl` / `attach` for the upload-first flow. Later modules (vehicles, drivers) reuse the same flow for their documents.
- First business module. Vehicles, drivers and trips (later stories) will reference a company by `companyId`; the company becomes the tenant boundary once auth links users to companies.
- Follows `crud-foundation` conventions: Story 03 created the shared `BaseRepository`, `BaseListQueryDto`, pagination and LIKE-escape helpers in `src/common/`, and companies is the first module on them (paginated list, `CompanyResponseDto`).
