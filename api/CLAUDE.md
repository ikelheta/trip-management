# CLAUDE.md

## Stories and plans live in `.squad/`

Always check `.squad/` before starting work, and keep it in step with the code.

- **Before any feature, bug fix or refactor:** read `.squad/plans/00-index.md`, then the relevant feature's `00-overview.md`, its `NN-story-*.md` plan, and the intake under `.squad/stories/<feature>/<story>/intake.md`. Follow the plan's conventions, constraints and out-of-scope list. If the code and a plan disagree, `src/` wins: say so and update the plan.
- **New work gets a story and a plan:** add an intake at `.squad/stories/<feature-slug>/<story-slug>/intake.md` (copy the template from an existing intake) and a plan at `.squad/plans/<feature-slug>/NN-story-<slug>.md` with its `00-overview.md`. Add a row to `.squad/plans/00-index.md` for a new feature.
- **Plan format:** follow the existing plans (for example `.squad/plans/countries/04-story-countries-reference-data-api.md`): Prerequisites, Story Goal, Context — Read These Files First, Implementation tasks, Edge Cases & Failure Modes, Test Plan, Migration / Rollback, Verification Steps, Done Criteria. Every path, symbol and line number must come from the real code.
- **Numbering:** `NN` is one global sequence across all features (`naming.globalSequence: true` in `.squad/config.yaml`). Re-read `00-index.md` right before picking a number; other sessions may be adding plans at the same time.
- **After changing code:** update the affected plan (code blocks, Done Criteria checkboxes) and overview so `.squad/` keeps matching `src/`.

## API contract lives in `contract/`

`contract/` documents every module's endpoints, request bodies, query parameters, rules, errors and response examples for the React front end. It must always match `src/`.

- **Every fix or feature that touches the HTTP surface** (route, controller, DTO, response DTO, validation rule, error message, default, env var that changes behaviour) **updates `contract/` in the same change**: the module's `<module>.md`, a new `<module>.md` plus a row in `contract/README.md` for a new module, and a Changelog line plus "Last updated" in `contract/README.md`.
- Regenerate `contract/openapi.json` with the app running in development: `curl -s http://localhost:3000/api/docs-json -o contract/openapi.json`.
- Take examples from real responses where possible; every field, message and rule must come from the code.
- A plan's Done Criteria in `.squad/` include "contract/ updated" for any story that changes the API.

## Mirror into the React project

The React project (`../frontend/trip-managment/`) keeps a read-only copy of the backend docs in `backend/`: `plans/` (from `.squad/plans`), `stories/` (from `.squad/stories`) and `contracts/` (from `contract/`).

- **After any change to `.squad/` or `contract/`**, run `npm run sync:frontend` (`scripts/sync-frontend-docs.mjs`). It replaces those three folders, so never edit the copies by hand.

## Deployment lives in `../deploy/`

Docker Compose (PostgreSQL, this API, Caddy serving the React app) and the server guide are in `../deploy/` (plan: `.squad/plans/deployment/`). Images are built and pushed to Docker Hub with `../deploy/build-and-push.ps1` (amd64 + arm64); the server only pulls them. A new required env variable goes into `../deploy/.env.example` in the same change.
