import { useAuth } from '../../features/authentication/index.ts'
import { NAV_ITEMS, type NavItem } from './navigation.ts'

export function useNavItems(): NavItem[] {
  const { user } = useAuth()
  return NAV_ITEMS.filter((item) => !item.adminOnly || user?.role === 'admin')
}
