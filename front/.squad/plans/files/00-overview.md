# files — plan overview

Entry point for the **files** feature. Stories execute in order by their `NN` prefix.

## Stories

| NN | File | Title | Tracker id | Depends on |
|----|------|-------|------------|------------|
| 05 | [05-story-shared-file-upload-and-authenticated-images.md](05-story-shared-file-upload-and-authenticated-images.md) | Shared file upload and authenticated image display | — | [02](../app-foundation/02-story-app-shell-routing-api-client-and-shared-ui.md), [03](../authentication/03-story-login-session-and-protected-routes.md) |

## Dependency notes

- **Status:** Story 05 implemented 2026-11-07 (API checks through the dev proxy passed; browser checks of `AuthImage` / `ImageUploadField` run with Story 06).
- Covers backend Story 02 (`backend/contracts/files.md`). No page and no route: the feature is a toolkit for other features.
- Public API (`src/features/files/index.ts`): `uploadFile`, `FileMetadata`, `useFileObjectUrl`, `AuthImage`, `ImageUploadField`, `downloadFile`. Companies (Story 06) uses `ImageUploadField` and `AuthImage`; the trip QR code story uses `AuthImage` and `downloadFile`.
- Since backend Story 12 every download needs the Bearer token, so file urls are never used directly in `<img src>` / `<a href>`.
