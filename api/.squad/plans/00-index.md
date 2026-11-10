# Plans index

One row per feature folder under `.squad/plans/`. `NN` continues as a global execution sequence across all features when `naming.globalSequence` is `true` in `config.yaml`.

| Feature | Overview | NN range |
|---------|----------|----------|
| [project-structure](project-structure/00-overview.md) | Clean Modular Monolith foundation: no tests, config, TypeORM/PostgreSQL, users reference module | 01 |
| [files](files/00-overview.md) | Shared Files module: upload/download/list/soft-delete with pluggable storage (local) | 02 |
| [companies](companies/00-overview.md) | Leasing company profiles: CRUD, unique registration number, header/footer images via Files | 03 |
| [countries](countries/00-overview.md) | Country reference data: CRUD with Arabic/English names, seeder for all 249 ISO 3166-1 countries | 04 |
| [vehicles](vehicles/00-overview.md) | Company vehicles: CRUD, unique plate number, companyId FK checked through CompaniesService.exists | 06 |
| [drivers](drivers/00-overview.md) | Drivers: CRUD, unique identity id, nationality (countries FK) and assigned vehicle (vehicles FK) | 07 |
| [trips](trips/00-overview.md) | Trips (vehicle + driver + date/time) with nested passengers and the required pre-trip inspection: CRUD, FK checks, one transaction per write; QR code per trip; origin / destination; contract number | 08, 10, 11, 13, 14 |
| [vehicle-inspections](vehicle-inspections/00-overview.md) | Pre-trip inspection per trip against an admin-managed, seeded checklist (3 indicators, 16 checks) with snapshotted results | 09 |
| [auth](auth/00-overview.md) | JWT login with email + bcrypt password, global guard with `@Public()` opt-out, `/auth/me`, change password, seeded first admin | 12 |
| [deployment](deployment/00-overview.md) | One-server deployment: Docker images for the API and the React app, Docker Compose with PostgreSQL and Caddy (HTTPS once a domain is set), guide in ../deploy/README.md | 15 |
