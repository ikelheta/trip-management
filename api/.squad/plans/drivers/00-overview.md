# drivers — plan overview

Entry point for the **drivers** feature. Stories execute in order by their `NN` prefix.

## Stories

| NN | File | Title | Tracker id | Depends on |
|----|------|-------|------------|------------|
| 07 | [07-story-driver-management-api.md](07-story-driver-management-api.md) | Add Drivers module with nationality and assigned vehicle | — | [04](../countries/04-story-countries-reference-data-api.md), [06](../vehicles/06-story-vehicle-management-api.md) |

## Dependency notes

- Copies the vehicles module ([Story 06](../vehicles/06-story-vehicle-management-api.md)): a CRUD module with foreign keys checked through the other module's public `exists`.
- **Needs countries and vehicles:** `nationality_id` → `countries.id` and `vehicle_id` → `vehicles.id`. The migration (`1793426400000`) sorts after both.
- **Planned after the code:** the module was implemented first and this plan documents it.
- **Blocks trips:** `trips.driver_id` is a FK to `drivers.id`. The [trips story](../trips/08-story-trip-management-api.md) adds the public `DriversService.exists(id)`; this story does not.
- Open product questions: whether `vehicleId` should be optional, and whether one vehicle may have several drivers (allowed today).
