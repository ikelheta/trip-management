import { Link, NavLink, Outlet } from 'react-router'
import { ROUTES } from '../../config/routes.ts'
import { AccountLink, SignOutButton } from '../../features/authentication/index.ts'
import { Icon } from '../../shared/components/ui/Icon.tsx'
import { LanguageSwitcher } from '../../shared/components/ui/LanguageSwitcher.tsx'
import { useMessages } from '../../shared/i18n/messages.ts'
import { appMessages } from '../appMessages.ts'
import styles from './AppLayout.module.css'
import { useNavItems } from './useNavItems.ts'

export function AppLayout() {
  const navItems = useNavItems()
  const m = useMessages(appMessages)
  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <Link to={ROUTES.home} className={styles.brand}>
          <span className={styles.brandMark}>
            <Icon name="trips" />
          </span>
          {m.brand}
        </Link>
        <nav className={styles.nav} aria-label={m.mainNavLabel}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ''}`}
            >
              <Icon name={item.icon} />
              {m.nav[item.labelKey]}
            </NavLink>
          ))}
        </nav>
        <div className={styles.sidebarFooter}>
          <SignOutButton className={styles.signOut} />
        </div>
      </aside>
      <div className={styles.main}>
        <header className={styles.header}>
          <LanguageSwitcher />
          <AccountLink />
        </header>
        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
