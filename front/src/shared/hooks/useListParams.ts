import { useSearchParams } from 'react-router'

export interface ListParams {
  page: number
  search: string
  getFilter: (key: string) => string
  setPage: (page: number) => void
  setSearch: (search: string) => void
  /** Empty string removes the filter. Changing a filter goes back to page 1. */
  setFilter: (key: string, value: string) => void
}

export function useListParams(): ListParams {
  const [searchParams, setSearchParams] = useSearchParams()
  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const search = searchParams.get('search') ?? ''

  function update(changes: Record<string, string>, resetPage: boolean): void {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current)
        for (const [key, value] of Object.entries(changes)) {
          if (value) {
            next.set(key, value)
          } else {
            next.delete(key)
          }
        }
        if (resetPage) {
          next.delete('page')
        }
        return next
      },
      { replace: true },
    )
  }

  return {
    page,
    search,
    getFilter: (key) => searchParams.get(key) ?? '',
    setPage: (nextPage) => update({ page: nextPage > 1 ? String(nextPage) : '' }, false),
    setSearch: (nextSearch) => update({ search: nextSearch }, true),
    setFilter: (key, value) => update({ [key]: value }, true),
  }
}
