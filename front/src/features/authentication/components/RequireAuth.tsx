import { Navigate, Outlet, useLocation } from 'react-router'
import { ROUTES } from '../../../config/routes.ts'
import { ErrorAlert } from '../../../shared/components/ui/ErrorAlert.tsx'
import { LoadingState } from '../../../shared/components/ui/LoadingState.tsx'
import { commonMessages } from '../../../shared/i18n/commonMessages.ts'
import { useMessages } from '../../../shared/i18n/messages.ts'
import { useAuth } from '../hooks/useAuth.ts'
import { authMessages } from '../i18n.ts'

/** Layout route: renders its children only for a signed-in user. */
export function RequireAuth() {
  const { status, error, retry } = useAuth()
  const location = useLocation()
  const m = useMessages(authMessages)
  const common = useMessages(commonMessages)

  if (status === 'anonymous') {
    return (
      <Navigate
        to={ROUTES.login}
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    )
  }
  if (status === 'loading') {
    return (
      <main className="page-center">
        <LoadingState label={m.session.loading} />
      </main>
    )
  }
  if (status === 'error') {
    return (
      <main className="page-center">
        <div className="stack">
          <ErrorAlert error={error} title={m.session.loadFailed} />
          <button type="button" className="btn btn-primary" onClick={retry}>
            {common.actions.retry}
          </button>
        </div>
      </main>
    )
  }
  return <Outlet />
}
