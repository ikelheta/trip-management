import { defineMessages } from './messages.ts'

/** Text shared by many features. Use with `useMessages(commonMessages)`. */
export const commonMessages = defineMessages({
  en: {
    actions: {
      save: 'Save',
      saving: 'Saving…',
      cancel: 'Cancel',
      delete: 'Delete',
      deleting: 'Deleting…',
      working: 'Working…',
      edit: 'Edit',
      create: 'Create',
      back: 'Back',
      close: 'Close',
      confirm: 'Confirm',
      retry: 'Try again',
    },
    states: {
      loading: 'Loading…',
      empty: 'Nothing here yet.',
      notSet: '—',
    },
    pagination: {
      previous: 'Previous',
      next: 'Next',
      summary: (page: number, totalPages: number, total: number) =>
        `Page ${page} of ${totalPages} (${total} total)`,
      ariaLabel: 'Pagination',
    },
    search: {
      placeholder: 'Search…',
      ariaLabel: 'Search',
      button: 'Search',
    },
    errors: {
      generic: 'Something went wrong. Please try again.',
      network: 'Cannot reach the server. Check your connection and try again.',
    },
    validation: {
      required: 'This field is required',
      lengthBetween: (min: number, max: number) => `Use ${min}–${max} characters`,
      atMost: (max: number) => `Use at most ${max} characters`,
      atLeast: (min: number) => `Use at least ${min} characters`,
      atLeastOrEmpty: (min: number) => `Use at least ${min} characters, or leave it empty`,
      lengthBetweenOrEmpty: (min: number, max: number) => `Use ${min}–${max} characters, or leave it empty`,
      digitsOnly: (min: number, max: number) => `Use ${min}–${max} digits only`,
      email: 'Enter a valid email address',
      choose: (what: string) => `Choose ${what}`,
    },
    language: {
      change: 'Change language',
    },
  },
  ar: {
    actions: {
      save: 'حفظ',
      saving: 'جارٍ الحفظ…',
      cancel: 'إلغاء',
      delete: 'حذف',
      deleting: 'جارٍ الحذف…',
      working: 'جارٍ التنفيذ…',
      edit: 'تعديل',
      create: 'إنشاء',
      back: 'رجوع',
      close: 'إغلاق',
      confirm: 'تأكيد',
      retry: 'إعادة المحاولة',
    },
    states: {
      loading: 'جارٍ التحميل…',
      empty: 'لا توجد بيانات بعد.',
      notSet: '—',
    },
    pagination: {
      previous: 'السابق',
      next: 'التالي',
      summary: (page: number, totalPages: number, total: number) =>
        `الصفحة ${page} من ${totalPages} (الإجمالي: ${total})`,
      ariaLabel: 'التنقل بين الصفحات',
    },
    search: {
      placeholder: 'بحث…',
      ariaLabel: 'بحث',
      button: 'بحث',
    },
    errors: {
      generic: 'حدث خطأ ما. يُرجى المحاولة مرة أخرى.',
      network: 'تعذّر الاتصال بالخادم. تحقّق من اتصالك ثم حاول مرة أخرى.',
    },
    validation: {
      required: 'هذا الحقل مطلوب',
      lengthBetween: (min: number, max: number) => `يجب أن يكون عدد الأحرف بين ${min} و${max}`,
      atMost: (max: number) => `يجب ألّا يزيد عدد الأحرف على ${max}`,
      atLeast: (min: number) => `يجب ألّا يقل عدد الأحرف عن ${min}`,
      atLeastOrEmpty: (min: number) => `يجب ألّا يقل عدد الأحرف عن ${min}، أو اترك الحقل فارغًا`,
      lengthBetweenOrEmpty: (min: number, max: number) =>
        `يجب أن يكون عدد الأحرف بين ${min} و${max}، أو اترك الحقل فارغًا`,
      digitsOnly: (min: number, max: number) => `أدخل أرقامًا فقط، بطول يتراوح بين ${min} و${max}`,
      email: 'أدخل بريدًا إلكترونيًا صحيحًا',
      choose: (what: string) => `اختر ${what}`,
    },
    language: {
      change: 'تغيير اللغة',
    },
  },
})

export type CommonMessages = (typeof commonMessages)['en']
