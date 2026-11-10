# CLAUDE.md

React front end (Vite + React 19 + TypeScript strict) for the trip-management backend in `../../trip-management/`.

## Read before any work

1. **`.squad/`** — this project's stories and plans. Read `.squad/plans/00-index.md`, the feature's `00-overview.md`, its `NN-story-*.md` plan and the intake under `.squad/stories/<feature>/<story>/intake.md`. New work gets an intake and a plan first (copy an existing one); `NN` is one global sequence (re-read `00-index.md` before picking a number). After changing code, update the plan (code blocks, Done Criteria) and the overview so `.squad/` matches `src/`.
2. **`backend/contracts/`** — the API contract: every endpoint, body, query parameter, rule, error message and response example, plus `openapi.json`. API types and calls must match it exactly.
3. **`src/README.md`** — folder layout and coding conventions (feature folders, `index.ts` public API, naming, no `any`).

## Language

English / Arabic (right-to-left). **Every new user-visible text goes through a typed dictionary with English and Arabic** (`defineMessages` in the feature's `i18n.ts`, or `commonMessages`); see the Language section of `src/README.md`.

## `backend/` is a read-only mirror

`backend/` (`contracts/`, `plans/`, `stories/`) is copied from the backend by `npm run sync:frontend` in `trip-management/`. **Never edit it here**; it is overwritten on every sync. If the API must change, change the backend (its own `.squad` story, `contract/`, then the sync).

## Running

- Backend: `npm run start:dev` in `trip-management/` (port 3000, needs its PostgreSQL container `trip-management-postgres`). Seeded admin: `admin@example.com` / `ChangeMe123!`.
- Front end: `npm run dev` (port 5173); Vite proxies `/api` to `http://localhost:3000`.
- Checks: `npm run build` and `npm run lint` must pass. No test runner yet.
