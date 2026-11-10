import type { Paginated } from '../types/api.ts'

export const MAX_PAGE_SIZE = 100

/** Loads page 1, then the remaining pages in parallel, and returns all rows in order. */
export async function fetchAllPages<T>(
  fetchPage: (page: number, limit: number) => Promise<Paginated<T>>,
): Promise<T[]> {
  const first = await fetchPage(1, MAX_PAGE_SIZE)
  const rest = await Promise.all(
    Array.from({ length: first.meta.totalPages - 1 }, (_, index) => fetchPage(index + 2, MAX_PAGE_SIZE)),
  )
  return [first, ...rest].flatMap((page) => page.data)
}
