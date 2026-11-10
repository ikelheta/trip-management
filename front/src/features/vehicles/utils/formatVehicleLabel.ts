import type { Vehicle } from '../types/vehicle.ts'

/** "ABC 1234 — Toyota Hiace 2024" */
export function formatVehicleLabel(vehicle: Vehicle): string {
  return `${vehicle.plateNumber} — ${vehicle.model}`
}
