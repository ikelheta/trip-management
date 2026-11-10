# deployment — plan overview

Entry point for the **deployment** feature. Stories execute in order by their `NN` prefix.

## Stories

| NN | File | Title | Tracker id | Depends on |
|----|------|-------|------------|------------|
| 15 | [15-story-docker-compose-single-server.md](15-story-docker-compose-single-server.md) | Deploy the API, database and React app on one server with Docker Compose | — | 01–14, front-end 18 |
| 16 | [16-story-docker-hub-images.md](16-story-docker-hub-images.md) | Publish the images to Docker Hub; the server pulls instead of building | — | 15 |

## Dependency notes

- **Story 15 implemented 2026-11-10** (verified locally with Docker; not yet on a real server). Files outside `src/`: `Dockerfile`, `docker-entrypoint.sh`, `.dockerignore`, and `../deploy/` (shared with the React project, whose `Dockerfile` builds the web image).
- **Story 16 implemented 2026-11-10**: Caddyfile moved into the web image; compose uses Docker Hub images; `../deploy/build-and-push.ps1`. Verified locally; first real push pending.
- Any new required env variable must be added to `../deploy/.env.example` (and the compose `api` overrides if it is a container path / host).
- Follow-ups: object storage (needed for multi-server or PaaS hosting), CI/CD, scheduled off-site backups.
