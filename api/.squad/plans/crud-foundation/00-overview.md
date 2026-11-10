# crud-foundation — plan overview

Entry point for the **crud-foundation** feature. Stories execute in order by their `NN` prefix.

## Stories

| NN | File | Title | Tracker id | Depends on |
|----|------|-------|------------|------------|
| _add rows as stories are planned_ |

## Dependency notes

- **Partly delivered by Story 03** ([companies](../companies/03-story-company-management-api.md)): `src/common/dto/base-list-query.dto.ts`, `src/common/repositories/base.repository.ts`, `src/common/utils/pagination.util.ts`, `src/common/utils/escape-like.util.ts` exist and match the intake. `CompaniesRepository` is the first module on them. Response DTOs are mapped in the **controller** (the intake asks to pick one place).
- **Still open** for the crud-foundation story: refactor `users` onto these pieces (`GetUsersQueryDto`, `UserResponseDto`, paginated `GET /api/users`) and write `docs/crud-module-guide.md`. Reuse the existing shared files; do not recreate them.
