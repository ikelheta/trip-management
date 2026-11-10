# files — plan overview

Entry point for the **files** feature. Stories execute in order by their `NN` prefix.

## Stories

| NN | File | Title | Tracker id | Depends on |
|----|------|-------|------------|------------|
| 02 | [02-story-shared-file-management-api.md](02-story-shared-file-management-api.md) | Add shared Files module for upload, download, list and delete across all modules | — | [01](../project-structure/01-story-restructure-project-as-clean-modular-monolith-no-ddd-no-test-files.md) |

## Dependency notes

- Builds on Story 01 (`project-structure`): config validation, `DatabaseModule`, `AllExceptionsFilter`, global `ValidationPipe`, and the users module pattern.
- Introduces the shared `BaseEntity` in `src/common/entities/`; later entities should extend it.
- Independent of `crud-foundation`: `FilesRepository` does not extend `BaseRepository` (files need soft delete).
- Business modules (trips, bookings, …) depend on this feature by importing `FilesModule` and injecting `FilesService` only.
