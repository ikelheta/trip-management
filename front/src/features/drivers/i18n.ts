import { isolate, ltr } from '../../shared/i18n/bidi.ts'
import { defineMessages } from '../../shared/i18n/messages.ts'

export const driversMessages = defineMessages({
  en: {
    list: {
      title: 'Drivers',
      description: 'Drivers with their nationality and assigned vehicle.',
      newDriver: 'New driver',
      searchPlaceholder: 'Search name or identity number…',
      nationalityFilter: 'Filter by nationality',
      allNationalities: 'All nationalities',
      vehicleFilter: 'Filter by vehicle',
      allVehicles: 'All vehicles',
      emptyFiltered: 'No drivers match these filters.',
      empty: 'No drivers yet.',
      deletedCountry: 'Deleted country',
      deletedVehicle: 'Deleted vehicle',
      columns: {
        name: 'Name',
        identityId: 'Identity number',
        nationality: 'Nationality',
        vehicle: 'Vehicle',
        updated: 'Last updated',
        actions: 'Actions',
      },
    },
    delete: {
      title: 'Delete driver',
      // The name sits between the two parts in bold.
      before: 'Delete ',
      after: '? Trips that use this driver keep them, but they can no longer be chosen for new trips.',
    },
    newPage: {
      title: 'New driver',
    },
    editPage: {
      title: (name: string) => `Edit driver ${name}`,
      back: 'Back to drivers',
    },
    form: {
      name: 'Name',
      identityId: 'Identity number',
      identityIdHint: 'National ID or iqama',
      nationality: 'Nationality',
      vehicle: 'Vehicle',
      loadingOptions: 'Loading countries and vehicles…',
      optionsFailed: 'Could not load the form options.',
    },
    select: {
      placeholder: 'Select a driver',
      loading: 'Loading drivers…',
      failed: 'Could not load drivers',
      /** "Mohammed Ali (1010101010)" */
      option: (name: string, identityId: string) => `${name} (${identityId})`,
    },
    validation: {
      identityIdRequired: 'Enter the identity number',
      nationalityRequired: 'Select a nationality',
      vehicleRequired: 'Select a vehicle',
    },
  },
  ar: {
    list: {
      title: 'السائقون',
      description: 'السائقون مع جنسياتهم والمركبات المخصّصة لهم.',
      newDriver: 'سائق جديد',
      searchPlaceholder: 'ابحث بالاسم أو رقم الهوية…',
      nationalityFilter: 'التصفية حسب الجنسية',
      allNationalities: 'كل الجنسيات',
      vehicleFilter: 'التصفية حسب المركبة',
      allVehicles: 'كل المركبات',
      emptyFiltered: 'لا يوجد سائقون يطابقون عوامل التصفية هذه.',
      empty: 'لا يوجد سائقون بعد.',
      deletedCountry: 'دولة محذوفة',
      deletedVehicle: 'مركبة محذوفة',
      columns: {
        name: 'الاسم',
        identityId: 'رقم الهوية',
        nationality: 'الجنسية',
        vehicle: 'المركبة',
        updated: 'آخر تحديث',
        actions: 'الإجراءات',
      },
    },
    delete: {
      title: 'حذف السائق',
      before: 'هل تريد حذف السائق ',
      after: '؟ تحتفظ به الرحلات التي تستخدمه، لكن لن يعود بالإمكان اختياره لرحلات جديدة.',
    },
    newPage: {
      title: 'سائق جديد',
    },
    editPage: {
      title: (name: string) => `تعديل السائق ${isolate(name)}`,
      back: 'العودة إلى السائقين',
    },
    form: {
      name: 'الاسم',
      identityId: 'رقم الهوية',
      identityIdHint: 'الهوية الوطنية أو الإقامة',
      nationality: 'الجنسية',
      vehicle: 'المركبة',
      loadingOptions: 'جارٍ تحميل الدول والمركبات…',
      optionsFailed: 'تعذّر تحميل خيارات النموذج.',
    },
    select: {
      placeholder: 'اختر سائقًا',
      loading: 'جارٍ تحميل السائقين…',
      failed: 'تعذّر تحميل السائقين',
      option: (name: string, identityId: string) => `${isolate(name)} (${ltr(identityId)})`,
    },
    validation: {
      identityIdRequired: 'أدخل رقم الهوية',
      nationalityRequired: 'اختر الجنسية',
      vehicleRequired: 'اختر مركبة',
    },
  },
})

export type DriversMessages = (typeof driversMessages)['en']
