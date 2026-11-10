/** `meta` of every paginated list (backend/contracts/README.md "Lists and pagination"). */
export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface Paginated<T> {
  data: T[]
  meta: PaginationMeta
}

/**
 * Query accepted by every paginated list endpoint. A `type` alias, not an interface: interfaces
 * have no implicit index signature, so they cannot be passed as `RequestOptions['query']`.
 * Feature list queries extend it the same way: `type TripListQuery = ListQuery & { … }`.
 */
export type ListQuery = {
  page?: number
  limit?: number
  search?: string
}

/** Body of every error response. */
export interface ApiErrorBody {
  statusCode: number
  error: string
  message: string | string[]
  path: string
  timestamp: string
}
