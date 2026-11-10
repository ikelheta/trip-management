# Story 16 — Publish the images to Docker Hub; the server pulls instead of building

## Prerequisites

- Story 15 (Docker Compose single server) implemented.

## Story Goal

Build the API and web images on the developer PC, push them to Docker Hub, and run the server from `docker-compose.yml` + `.env` only (no source code on the server).

## Changes

1. `../frontend/trip-managment/Caddyfile` (moved from `../deploy/Caddyfile`) is copied into the web image at `/etc/caddy/Caddyfile`; the compose bind mount is gone.
2. Both Dockerfiles run the build stage with `--platform=$BUILDPLATFORM` (the output is platform-independent: static files / pure-JS `node_modules`, no native modules), so arm64 images build without emulation.
3. `../deploy/docker-compose.yml`: `api` / `web` use `image: ${DOCKERHUB_USER}/trip-management-{api,web}:${IMAGE_TAG:-latest}` instead of `build:`.
4. `../deploy/.env.example`: `DOCKERHUB_USER`, `IMAGE_TAG`.
5. `../deploy/build-and-push.ps1 -User <name> [-Platforms ...] [-Tag ...]`: creates the `trip-builder` buildx builder (docker-container driver) and pushes `<tag>` (default `yyyyMMdd-HHmm`) + `latest` for `linux/amd64,linux/arm64`.
6. `../deploy/README.md`: steps 3 (build & push), 4 (copy compose + env with scp), 5 (pull & start), update and rollback.

7. Target server is **aaPanel on an Oracle Ampere (ARM64) VM**: aaPanel's Nginx owns 80/443 and does Let's Encrypt. Compose ports are `${HTTP_BIND:-80}` / `${HTTPS_BIND:-443}`; `.env.example` sets `HTTP_BIND=127.0.0.1:8080`, `HTTPS_BIND=127.0.0.1:8443`, `SITE_ADDRESS=:80`, and the aaPanel site reverse-proxies to `http://127.0.0.1:8080` (cache off). The README is written for this setup; standalone Caddy HTTPS is an appendix. The API reads no forwarded headers (QR links come from `TRIP_QR_BASE_URL`), so the double proxy needs no app change.

## Edge Cases

- New Docker Hub repositories are public: images contain code but no secrets (`.env` excluded by `.dockerignore`). Private repos need `docker login` on the server.
- Rollback via `IMAGE_TAG` does not revert applied migrations.
- If a native npm dependency is ever added to the API, drop `--platform=$BUILDPLATFORM` from its build stage.

## Done Criteria

- [x] Caddyfile in the web image, compose pulls images, env + script + guide updated.
- [x] Local run from images only (separate folder with just compose + `.env`, `--pull never`): health ok, SPA route 200, `/api/docs` 404, admin login ok, seeds ran. Test stack, volumes and images removed.
- [x] Multi-arch build (amd64 + arm64) succeeds for both images via `trip-builder` (cache-only output).
- [ ] First real push to Docker Hub and run on the VPS (needs the user's Docker Hub login).
