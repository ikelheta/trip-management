import { commonMessages } from '../../i18n/commonMessages.ts'
import { useMessages } from '../../i18n/messages.ts'
import type { PaginationMeta } from '../../types/api.ts'

interface PaginationProps {
  meta: PaginationMeta
  onPageChange: (page: number) => void
}

export function Pagination({ meta, onPageChange }: PaginationProps) {
  const m = useMessages(commonMessages)
  if (meta.totalPages <= 1) {
    return null
  }
  return (
    <nav className="pagination" aria-label={m.pagination.ariaLabel}>
      <button
        type="button"
        className="btn btn-secondary btn-small"
        disabled={meta.page <= 1}
        onClick={() => onPageChange(meta.page - 1)}
      >
        {m.pagination.previous}
      </button>
      <span>{m.pagination.summary(meta.page, meta.totalPages, meta.total)}</span>
      <button
        type="button"
        className="btn btn-secondary btn-small"
        disabled={meta.page >= meta.totalPages}
        onClick={() => onPageChange(meta.page + 1)}
      >
        {m.pagination.next}
      </button>
    </nav>
  )
}
