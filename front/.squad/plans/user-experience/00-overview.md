# user-experience — plan overview

Entry point for the **user-experience** feature. Stories execute in order by their `NN` prefix.

## Stories

| NN | File | Title | Tracker id | Depends on |
|----|------|-------|------------|------------|
| 15 | [15-story-styling-refresh-and-account-page.md](15-story-styling-refresh-and-account-page.md) | Refreshed styling and a separate "My account" page for the signed-in user | — | 01–14 |

## Dependency notes

- **Status:** Story 15 implemented 2026-11-08 (global CSS refresh, `Icon`, sidebar icons + sign out, account button, `/account` page; build and lint pass; browser check in English, Arabic, dark mode and 390px width).
- No backend change, no new dependency. Page markup is unchanged: the new look comes from `shared/styles/index.css`.
