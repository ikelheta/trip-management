import { ROUTES } from '../../config/routes.ts'
import type { IconName } from '../../shared/components/ui/Icon.tsx'
import type { AppMessages } from '../appMessages.ts'

export interface NavItem {
  /** Key of the label in `appMessages.nav`. */
  labelKey: keyof AppMessages['nav']
  to: string
  icon: IconName
  /** Shown only to admins (filtered in the layout once authentication exists). */
  adminOnly?: boolean
}

// Users is always the last item.
export const NAV_ITEMS: NavItem[] = [
  { labelKey: 'trips', to: ROUTES.trips, icon: 'trips' },
  { labelKey: 'drivers', to: ROUTES.drivers, icon: 'drivers' },
  { labelKey: 'vehicles', to: ROUTES.vehicles, icon: 'vehicles' },
  { labelKey: 'companies', to: ROUTES.companies, icon: 'companies' },
  { labelKey: 'countries', to: ROUTES.countries, icon: 'countries' },
  { labelKey: 'inspectionChecklist', to: ROUTES.inspectionChecklist, icon: 'inspectionChecklist', adminOnly: true },
  { labelKey: 'users', to: ROUTES.users, icon: 'users', adminOnly: true },
]
