import { Link, useRouteError } from 'react-router'
import { ROUTES } from '../../config/routes.ts'
import { ErrorAlert } from '../../shared/components/ui/ErrorAlert.tsx'
import { useMessages } from '../../shared/i18n/messages.ts'
import { appMessages } from '../appMessages.ts'

export function RouteErrorPage() {
  const error = useRouteError()
  const m = useMessages(appMessages)
  return (
    <main className="stack" style={{ padding: 'var(--space-5)' }}>
      <ErrorAlert error={error} title={m.routeError.title} />
      <Link to={ROUTES.home}>{m.routeError.homeLink}</Link>
    </main>
  )
}
