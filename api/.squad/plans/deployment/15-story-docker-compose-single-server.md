# Story 15 — Deploy the API, database and React app on one server with Docker Compose

## Prerequisites

- Stories 01–14 implemented (latest migration `1793462400000-AddContractNumberToTrips`). Front end through Story 18.
- Intake: [../../stories/deployment/docker-compose-single-server/intake.md](../../stories/deployment/docker-compose-single-server/intake.md).
- Docker with Compose v2 on the target server (and locally for the test run).

---

## Story Goal

1. `trip-management/Dockerfile` + `docker-entrypoint.sh`: production API image that migrates, seeds and starts.
2. `frontend/trip-managment/Dockerfile`: React build served by Caddy.
3. `../deploy/` (next to both projects): `docker-compose.yml`, `Caddyfile`, `.env.example`, `.gitignore`, `README.md`.
4. HTTP on the server IP now; a domain in `SITE_ADDRESS` later gives automatic HTTPS.

**Not in scope:** managed platforms, CI/CD, registries, object storage, automated off-site backups.

---

## Context — Read These Files First

1. `src/main.ts` — global prefix `api`, Swagger only when `NODE_ENV` is not `production`.
2. `src/database/data-source.ts` — `process.loadEnvFile()` is optional (no `.env` in the container: variables come from Compose).
3. `src/database/database.options.ts` — `synchronize: false`; migrations from `dist/database/migrations/*.js`.
4. `src/database/seeds/run-seeds.ts` — idempotent seeds (countries, checklist, admin only if missing).
5. `src/config/env.validation.ts` — every variable the API needs (`DB_*`, `STORAGE_*`, `FILE_*`, `TRIP_QR_BASE_URL`, `JWT_*`, `SEED_ADMIN_*`).
6. `../frontend/trip-managment/src/config/env.ts` — `API_BASE_URL` defaults to `/api` (same origin behind Caddy).

---

## Implementation tasks

### 1 — API image

`Dockerfile`: `node:24-alpine` build stage (`npm ci`, `npm run build`, `npm prune --omit=dev`) → runtime stage with `node_modules`, `dist`, `package.json`, `docker-entrypoint.sh`; `/app/storage` owned by `node`; runs as `node`.

`docker-entrypoint.sh`:

```sh
node node_modules/typeorm/cli.js migration:run -d dist/database/data-source.js
node dist/database/seeds/run-seeds.js
exec node dist/main.js
```

`.dockerignore`: `node_modules`, `dist`, `storage`, `.env`, `*.tsbuildinfo`, `.squad`, `contract`.

### 2 — Web image

`../frontend/trip-managment/Dockerfile`: `node:24-alpine` build (`npm ci`, `npm run build`) → `caddy:2-alpine` with `dist` in `/srv`. `.dockerignore`: `node_modules`, `dist`, `.squad`, `backend`, `*.tsbuildinfo`.

### 3 — Compose and Caddy (`../deploy/`)

- `db`: `postgres:17-alpine`, volume `db-data`, `pg_isready` health check; not published.
- `api`: `env_file: .env`, overrides `NODE_ENV=production`, `PORT=3000`, `DB_HOST=db`, `DB_PORT=5432`, `STORAGE_LOCAL_PATH=/app/storage`; volume `api-storage`; waits for a healthy `db`.
- `web`: ports `${HTTP_PORT:-80}:80`, `${HTTPS_PORT:-443}:443` (+ UDP for HTTP/3); `SITE_ADDRESS` (default `:80`); mounts `Caddyfile`; volumes `caddy-data`, `caddy-config`.
- `Caddyfile`: `{$SITE_ADDRESS::80}` → `/api/*` to `api:3000`; everything else from `/srv` with `try_files {path} /index.html`; long cache on `/assets/*`; gzip / zstd.
- `.env.example` documents every value; `.gitignore` excludes `.env`.

### 4 — Guide

`../deploy/README.md`: Oracle Always Free VM (Ubuntu, Ampere A1), security list + iptables for 80 / 443, Docker install, copy with `tar` + `scp`, fill `.env`, `docker compose up -d --build`, domain + HTTPS, updates, backups (`pg_dump`, storage volume tar), common commands.

---

## Edge Cases & Failure Modes

- **HTTP before a domain:** passwords travel unencrypted — the guide says so and suggests a free subdomain for immediate HTTPS.
- **QR codes** encode `TRIP_QR_BASE_URL` at generation time; after switching to the domain, regenerate per trip.
- **Oracle "out of capacity"** for A1 shapes: retry / other availability domain; E2.1.Micro (1 GB) as fallback.
- **ARM servers:** all images are multi-arch; `bcryptjs` is pure JS (no native build).
- **`docker compose down -v`** deletes the volumes (all data) — called out in the guide.
- **Migration failure on start:** the API container exits and restarts (`restart: unless-stopped`); `docker compose logs api` shows the error.

---

## Test Plan

Local run with `-p trip-deploy-test`, `HTTP_PORT=8080`, a test `.env` (removed afterwards with `down -v --rmi local`).

---

## Verification Steps

1. `docker compose -p trip-deploy-test up -d --build` in `deploy/`.
2. `curl localhost:8080/api/health` → `{"status":"ok"}`; API log: 17 migrations, `countries: inserted 249`, `inspection indicators: inserted 3`, `admin user: created`.
3. `/trips/abc` → 200 (index.html); `/api/docs` → 404.
4. Contract-page browser smoke test against `http://localhost:8080`.
5. `docker compose restart` → "No migrations are pending", seeds skip, an uploaded file downloads (200).

---

## Done Criteria

- [x] API image + entrypoint (migrate, seed, start) and `.dockerignore`.
- [x] Web image (React build + Caddy) and `.dockerignore`.
- [x] `deploy/docker-compose.yml`, `Caddyfile`, `.env.example`, `.gitignore`, `README.md`.
- [x] Local run: fresh start, seeds, SPA routing, docs hidden, restart persistence verified.
- [x] Browser smoke test passes against the stack.

## Implementation notes (2026-11-10)

- Verified locally on Docker 29 (linux/amd64): 17 migrations on a fresh database, seeds as above; front-end contract smoke test 32/32 against `http://localhost:8080` (uploads included); after `restart` no pending migrations, seeds skipped, an uploaded PNG downloaded (200). Images: API 421 MB, web 93 MB. Test stack, volumes and images removed afterwards.
- `typeorm migration:run` logs every query on start (CLI default); harmless.
- Not yet run on a real server, behind a domain, or on ARM.

**STOP HERE. Report to the user and wait for confirmation before proceeding.**
