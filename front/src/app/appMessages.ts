import { defineMessages } from '../shared/i18n/messages.ts'

export const appMessages = defineMessages({
  en: {
    brand: 'Trip Management',
    mainNavLabel: 'Main',
    nav: {
      trips: 'Trips',
      drivers: 'Drivers',
      vehicles: 'Vehicles',
      companies: 'Companies',
      countries: 'Countries',
      inspectionChecklist: 'Inspection checklist',
      users: 'Users',
    },
    notFound: {
      message: 'This page does not exist.',
      homeLink: 'Go to the home page',
    },
    routeError: {
      title: 'The page failed to load.',
      homeLink: 'Go to the home page',
    },
  },
  ar: {
    brand: 'إدارة الرحلات',
    mainNavLabel: 'القائمة الرئيسية',
    nav: {
      trips: 'الرحلات',
      drivers: 'السائقون',
      vehicles: 'المركبات',
      companies: 'الشركات',
      countries: 'الدول',
      inspectionChecklist: 'قائمة الفحص',
      users: 'المستخدمون',
    },
    notFound: {
      message: 'هذه الصفحة غير موجودة.',
      homeLink: 'الانتقال إلى الصفحة الرئيسية',
    },
    routeError: {
      title: 'تعذّر تحميل الصفحة.',
      homeLink: 'الانتقال إلى الصفحة الرئيسية',
    },
  },
})

export type AppMessages = (typeof appMessages)['en']
