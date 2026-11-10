# project-structure — plan overview

Entry point for the **project-structure** feature. Stories execute in order by their `NN` prefix.

## Stories

| NN | File | Title | Tracker id | Depends on |
|----|------|-------|------------|------------|
| 01 | [01-story-project-structure.md](01-story-project-structure.md) | Set up feature-based project structure and coding conventions | SEK-0001 | — |

## Dependency notes

- **Status:** Story 01 implemented 2026-11-07.
- Story 01 is the foundation for the whole frontend. It sets the `src/` layout (`app/`, `features/`, `shared/`, `assets/`, `config/`) and the conventions in `src/README.md`. Every later feature story (authentication, users, trips, ...) depends on it and must follow that layout.
- Story 01 adds no libraries. The first later story that needs a router, TanStack Query, a form/validation library or an HTTP client adds it, inside the folders Story 01 creates (`app/routes/`, `app/providers/`, `shared/services/`).
