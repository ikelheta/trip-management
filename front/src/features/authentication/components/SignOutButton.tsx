import { Icon } from '../../../shared/components/ui/Icon.tsx'
import { useMessages } from '../../../shared/i18n/messages.ts'
import { useAuth } from '../hooks/useAuth.ts'
import { authMessages } from '../i18n.ts'

interface SignOutButtonProps {
  className?: string
}

export function SignOutButton({ className = '' }: SignOutButtonProps) {
  const { logout } = useAuth()
  const m = useMessages(authMessages)
  return (
    <button type="button" className={`btn btn-secondary ${className}`} onClick={logout}>
      <Icon name="signOut" className="icon-mirror" />
      {m.account.signOut}
    </button>
  )
}
