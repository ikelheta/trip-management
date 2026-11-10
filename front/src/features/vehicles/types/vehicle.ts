import type { ListQuery } from '../../../shared/types/api.ts'

/** backend/contracts/vehicles.md `Vehicle`. */
export interface Vehicle {
  id: string
  plateNumber: string
  model: string
  type: string
  companyId: string
  createdAt: string
  updatedAt: string
}

/** Body of POST /vehicles and PATCH /vehicles/:id (all fields sent). */
export interface VehicleRequest {
  plateNumber: string
  model: string
  type: string
  companyId: string
}

// A type alias (not an interface) so it stays assignable to RequestOptions['query'].
export type VehicleListQuery = ListQuery & {
  companyId?: string
}
