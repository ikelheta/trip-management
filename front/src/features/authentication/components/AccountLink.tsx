import { NavLink } from 'react-router'
import { ROUTES } from '../../../config/routes.ts'
import { useMessages } from '../../../shared/i18n/messages.ts'
import { useAuth } from '../hooks/useAuth.ts'
import { authMessages } from '../i18n.ts'
import styles from './AccountLink.module.css'
import { UserAvatar } from './UserAvatar.tsx'

/** Top-bar button to the "My account" page. Active on /account and /account/password. */
export function AccountLink() {
  const { user } = useAuth()
  const m = useMessages(authMessages)
  if (!user) {
    return null
  }
  return (
    <NavLink
      to={ROUTES.account}
      title={m.account.openLabel}
      className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
    >
      <UserAvatar user={user} />
      <span className={styles.name}>{user.firstName}</span>
    </NavLink>
  )
}
