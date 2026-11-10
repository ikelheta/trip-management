# vehicles — plan overview

Entry point for the **vehicles** feature. Stories execute in order by their `NN` prefix.

## Stories

| NN | File | Title | Tracker id | Depends on |
|----|------|-------|------------|------------|
| 06 | [06-story-vehicle-management-api.md](06-story-vehicle-management-api.md) | Add Vehicles module to register company vehicles with unique plate numbers | — | [01](../project-structure/01-story-restructure-project-as-clean-modular-monolith-no-ddd-no-test-files.md), [03](../companies/03-story-company-management-api.md) |

## Dependency notes

- Follows `crud-foundation` conventions using the shared pieces Story 03 created. Companies is the worked example; vehicles adds nothing to `src/common/`.
- **Touches the companies module once:** adds a public `CompaniesService.exists(id)` for the `companyId` check.
- **Planned after the code:** the module was implemented first and this plan documents it. `NN` 06 continues the global sequence, but the migration (`1793419200000`) runs **before** countries (`1793422800000`, Story 04).
- **Blocks drivers and trips:** `drivers.vehicle_id` ([Story 07](../drivers/07-story-driver-management-api.md)) and `trips.vehicle_id` ([Story 08](../trips/08-story-trip-management-api.md)) are FKs to `vehicles.id`; both modules call `VehiclesService.exists`.
- Open product questions: plate number normalization, and what happens to vehicles when their company is soft-deleted.
