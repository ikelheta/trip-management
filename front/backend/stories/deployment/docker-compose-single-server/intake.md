# Story intake

- Folder: `.squad/stories/deployment/docker-compose-single-server/intake.md`

---

## Feature

- **Feature name (display):** Deployment
- **Feature slug (folder under `plans/`):** `deployment`

## Tracker (metadata only)

- **Tracker type:** `none`
- **Work item id:** ``
- **Work item type:** `User story`
- **Status:** `Done`
- **Labels:** `deployment, docker`

---

## Title

```
Deploy the API, database and React app on one server with Docker Compose
```

## Description

```
Other users must be able to use the app over the internet, for free or at
minimum cost, with the owner's domain connected later.

- One Linux server (Oracle Cloud Always Free VM, or a ~€4/month VPS).
- Docker Compose: PostgreSQL, the API, and Caddy serving the React build and
  proxying /api to the API (same origin, so no CORS change).
- The API applies migrations and runs the (idempotent) seeds on every start.
- Uploaded files and the database live in named volumes.
- Works on the server IP over HTTP first; setting SITE_ADDRESS to a domain
  makes Caddy get and renew HTTPS certificates.
- A step-by-step README (server, firewall, copy, start, domain, update,
  backups).
```

## Acceptance criteria

```
- [ ] docker compose up -d --build starts all three containers on a clean machine.
- [ ] Fresh database: all migrations run, countries / checklist / admin seeded.
- [ ] Restart: no pending migrations, seeds skip existing rows, uploads still served.
- [ ] App routes (/trips/...) load index.html; /api/docs is not served (production).
- [ ] The existing browser smoke test (contract page) passes against the stack.
```

## Out of scope

- Managed / serverless platforms (free tiers sleep and lose local files; would need object storage).
- CI/CD, container registry, multiple servers, automated off-site backups.
