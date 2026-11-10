# app-foundation — plan overview

Entry point for the **app-foundation** feature. Stories execute in order by their `NN` prefix.

## Stories

| NN | File | Title | Tracker id | Depends on |
|----|------|-------|------------|------------|
| 02 | [02-story-app-shell-routing-api-client-and-shared-ui.md](02-story-app-shell-routing-api-client-and-shared-ui.md) | App shell, routing, API client and shared UI building blocks | — | [01](../project-structure/01-story-project-structure.md) |

## Dependency notes

- **Status:** implemented 2026-11-07.
- Adds the libraries every later story uses: `react-router` 8, `@tanstack/react-query` 5, `react-hook-form` 7 + `zod` 4 + `@hookform/resolvers`.
- Defines the shared contract for all feature stories: `httpClient.ts` (`apiRequest`, `apiBlob`, `ApiError`, `configureHttpClient`, `toApiPath`), `fetchAllPages`, `Paginated` / `ListQuery`, `useListParams`, UI components (`Field`, `FormError`, `ErrorAlert`, `LoadingState`, `EmptyState`, `Pagination`, `SearchInput`, `ConfirmDialog`, `Dialog`, `PageHeader`), `applyServerErrors`, date helpers, global CSS classes, `ROUTES`, `router.tsx` children and `NAV_ITEMS`.
- Feature stories add their own `ROUTES` keys, router children and sidebar items; nothing feature-specific lives here.
