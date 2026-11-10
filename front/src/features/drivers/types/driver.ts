import type { ListQuery } from '../../../shared/types/api.ts'

/** backend/contracts/drivers.md `Driver`. */
export interface Driver {
  id: string
  name: string
  identityId: string
  /** Country id. */
  nationalityId: string
  vehicleId: string
  createdAt: string
  updatedAt: string
}

/** Body of POST /drivers and PATCH /drivers/:id (all fields sent). */
export interface DriverRequest {
  name: string
  identityId: string
  nationalityId: string
  vehicleId: string
}

// A type alias (not an interface) so it stays assignable to RequestOptions['query'].
export type DriverListQuery = ListQuery & {
  nationalityId?: string
  vehicleId?: string
}
