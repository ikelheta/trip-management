import { Link } from 'react-router'
import { ROUTES } from '../../../config/routes.ts'
import { PageHeader } from '../../../shared/components/layout/PageHeader.tsx'
import { Icon } from '../../../shared/components/ui/Icon.tsx'
import { useMessages } from '../../../shared/i18n/messages.ts'
import { useLanguage } from '../../../shared/i18n/useLanguage.ts'
import { formatTimestampDate } from '../../../shared/utils/formatDate.ts'
import { SignOutButton } from '../components/SignOutButton.tsx'
import { UserAvatar } from '../components/UserAvatar.tsx'
import { useAuth } from '../hooks/useAuth.ts'
import { authMessages } from '../i18n.ts'
import styles from './AccountPage.module.css'

export function AccountPage() {
  const { user } = useAuth()
  const { locale } = useLanguage()
  const m = useMessages(authMessages)
  // RequireAuth renders this page only once the user is loaded.
  if (!user) {
    return null
  }
  return (
    <>
      <PageHeader title={m.account.title} description={m.account.description} />
      <div className={styles.layout}>
        <section className="card" aria-labelledby="profile-title">
          <h2 id="profile-title">{m.account.profileTitle}</h2>
          <div className={styles.identity}>
            <UserAvatar user={user} size="large" />
            <div>
              <p className={styles.fullName}>
                {user.firstName} {user.lastName}
              </p>
              <span className="badge">{m.account.roles[user.role]}</span>
            </div>
          </div>
          <dl className="details">
            <dt>{m.account.email}</dt>
            <dd className="ltr">{user.email}</dd>
            <dt>{m.account.role}</dt>
            <dd>{m.account.roles[user.role]}</dd>
            <dt>{m.account.memberSince}</dt>
            <dd>{formatTimestampDate(user.createdAt, locale)}</dd>
          </dl>
        </section>

        <div className="stack">
          <section className={`card ${styles.action}`} aria-labelledby="password-title">
            <h2 id="password-title">{m.account.passwordTitle}</h2>
            <p className="muted">{m.account.passwordText}</p>
            <Link to={ROUTES.changePassword} className="btn btn-secondary">
              <Icon name="key" />
              {m.account.changePassword}
            </Link>
          </section>
          <section className={`card ${styles.action}`} aria-labelledby="sign-out-title">
            <h2 id="sign-out-title">{m.account.signOutTitle}</h2>
            <p className="muted">{m.account.signOutText}</p>
            <SignOutButton />
          </section>
        </div>
      </div>
    </>
  )
}
