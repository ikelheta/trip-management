# countries — plan overview

Entry point for the **countries** feature. Stories execute in order by their `NN` prefix.

## Stories

| NN | File | Title | Tracker id | Depends on |
|----|------|-------|------------|------------|
| 04 | [04-story-countries-reference-data-api.md](04-story-countries-reference-data-api.md) | Add Countries module with Arabic and English names and a seeder for all countries | — | [01](../project-structure/01-story-restructure-project-as-clean-modular-monolith-no-ddd-no-test-files.md), [03](../companies/03-story-company-management-api.md) |

## Dependency notes

- Follows `crud-foundation` conventions using the shared pieces Story 03 created (`BaseRepository`, `BaseListQueryDto`, pagination and LIKE-escape helpers). Companies is the worked example; countries adds nothing to `src/common/`.
- Introduces the project's first seeder (`src/database/seeds/`, `npm run seed`). Later reference-data seeds add one call to `run-seeds.ts`.
- **Blocks drivers:** `drivers.nationality_id` is a FK to `countries.id` (migration `1793426400000` runs after `1793422800000`), and `DriversModule` imports `CountriesModule` to call `CountriesService.exists`.
- Independent of vehicles; its migration timestamp only sorts after vehicles'.
