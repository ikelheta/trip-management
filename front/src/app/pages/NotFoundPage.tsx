import { Link } from 'react-router'
import { ROUTES } from '../../config/routes.ts'
import { EmptyState } from '../../shared/components/ui/EmptyState.tsx'
import { useMessages } from '../../shared/i18n/messages.ts'
import { appMessages } from '../appMessages.ts'

export function NotFoundPage() {
  const m = useMessages(appMessages)
  return (
    <EmptyState message={m.notFound.message}>
      <Link to={ROUTES.home}>{m.notFound.homeLink}</Link>
    </EmptyState>
  )
}
