import { defineMessages } from '../../shared/i18n/messages.ts'

export const countriesMessages = defineMessages({
  en: {
    list: {
      title: 'Countries',
      description: 'Nationalities for drivers, in English and Arabic.',
      newCountry: 'New country',
      searchPlaceholder: 'Search English or Arabic name…',
      emptySearch: 'No countries match your search.',
      empty: 'No countries yet.',
      columns: {
        nameEn: 'English name',
        nameAr: 'Arabic name',
        updated: 'Last updated',
        actions: 'Actions',
      },
    },
    dialog: {
      newTitle: 'New country',
      editTitle: 'Edit country',
    },
    form: {
      nameEn: 'English name',
      nameAr: 'Arabic name',
    },
    delete: {
      title: 'Delete country',
      // The name sits between the two parts in bold.
      before: 'Delete ',
      after: '? Drivers with this nationality keep it, but it can no longer be chosen.',
    },
    select: {
      placeholder: 'Select a country',
      loading: 'Loading countries…',
      failed: 'Could not load countries',
    },
  },
  ar: {
    list: {
      title: 'الدول',
      description: 'جنسيات السائقين، بالعربية والإنجليزية.',
      newCountry: 'دولة جديدة',
      searchPlaceholder: 'ابحث بالاسم العربي أو الإنجليزي…',
      emptySearch: 'لا توجد دول تطابق بحثك.',
      empty: 'لا توجد دول بعد.',
      columns: {
        nameEn: 'الاسم بالإنجليزية',
        nameAr: 'الاسم بالعربية',
        updated: 'آخر تحديث',
        actions: 'الإجراءات',
      },
    },
    dialog: {
      newTitle: 'دولة جديدة',
      editTitle: 'تعديل الدولة',
    },
    form: {
      nameEn: 'الاسم بالإنجليزية',
      nameAr: 'الاسم بالعربية',
    },
    delete: {
      title: 'حذف الدولة',
      before: 'هل تريد حذف ',
      after: '؟ يحتفظ السائقون الذين يحملون هذه الجنسية بها، لكن لن يعود بالإمكان اختيارها.',
    },
    select: {
      placeholder: 'اختر دولة',
      loading: 'جارٍ تحميل الدول…',
      failed: 'تعذّر تحميل الدول',
    },
  },
})

export type CountriesMessages = (typeof countriesMessages)['en']
