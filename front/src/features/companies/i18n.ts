import { isolate, ltr } from '../../shared/i18n/bidi.ts'
import { defineMessages } from '../../shared/i18n/messages.ts'

export const companiesMessages = defineMessages({
  en: {
    list: {
      title: 'Companies',
      description: 'Leasing companies and their document header / footer images.',
      newCompany: 'New company',
      searchPlaceholder: 'Search by name, registration number or city',
      emptySearch: 'No companies match your search.',
      empty: 'No companies yet.',
      columns: {
        name: 'Name',
        registrationNumber: 'Registration number',
        city: 'City',
        phone: 'Phone',
        whatsApp: 'WhatsApp',
        actions: 'Actions',
      },
    },
    details: {
      fallbackTitle: 'Company',
      registrationNumber: 'Registration number',
      city: 'City',
      address: 'Address',
      phone: 'Phone',
      whatsApp: 'WhatsApp',
      created: 'Created',
      updated: 'Updated',
      headerImage: 'Header image',
      footerImage: 'Footer image',
      headerAlt: (name: string) => `${name} header`,
      footerAlt: (name: string) => `${name} footer`,
    },
    newPage: {
      title: 'New company',
      submit: 'Create company',
    },
    editPage: {
      title: 'Edit company',
      submit: 'Save changes',
    },
    form: {
      name: 'Name',
      registrationNumber: 'Registration number',
      registrationNumberHint: 'Must be unique.',
      city: 'City',
      address: 'Address',
      phoneNumber: 'Phone number',
      whatsAppNumber: 'WhatsApp number',
      headerImage: 'Header image',
      footerImage: 'Footer image',
    },
    delete: {
      title: 'Delete company',
      body: (name: string, registrationNumber: string) =>
        `Delete ${name} (${registrationNumber})? Its vehicles are not deleted.`,
    },
    select: {
      placeholder: 'Select a company',
      loading: 'Loading companies…',
      failed: 'Could not load companies',
      option: (name: string, registrationNumber: string) => `${name} (${registrationNumber})`,
    },
    validation: {
      textMin: (label: string, min: number) => `${label} needs at least ${min} characters`,
      textMax: (label: string, max: number) => `${label} can have at most ${max} characters`,
    },
  },
  ar: {
    list: {
      title: 'الشركات',
      description: 'شركات التأجير وصور الترويسة والتذييل لمستنداتها.',
      newCompany: 'شركة جديدة',
      searchPlaceholder: 'ابحث بالاسم أو رقم السجل التجاري أو المدينة',
      emptySearch: 'لا توجد شركات تطابق بحثك.',
      empty: 'لا توجد شركات بعد.',
      columns: {
        name: 'الاسم',
        registrationNumber: 'رقم السجل التجاري',
        city: 'المدينة',
        phone: 'الهاتف',
        whatsApp: 'واتساب',
        actions: 'الإجراءات',
      },
    },
    details: {
      fallbackTitle: 'الشركة',
      registrationNumber: 'رقم السجل التجاري',
      city: 'المدينة',
      address: 'العنوان',
      phone: 'الهاتف',
      whatsApp: 'واتساب',
      created: 'تاريخ الإنشاء',
      updated: 'تاريخ التحديث',
      headerImage: 'صورة الترويسة',
      footerImage: 'صورة التذييل',
      headerAlt: (name: string) => `صورة ترويسة ${isolate(name)}`,
      footerAlt: (name: string) => `صورة تذييل ${isolate(name)}`,
    },
    newPage: {
      title: 'شركة جديدة',
      submit: 'إنشاء الشركة',
    },
    editPage: {
      title: 'تعديل الشركة',
      submit: 'حفظ التغييرات',
    },
    form: {
      name: 'الاسم',
      registrationNumber: 'رقم السجل التجاري',
      registrationNumberHint: 'يجب ألّا يكون مستخدمًا لشركة أخرى.',
      city: 'المدينة',
      address: 'العنوان',
      phoneNumber: 'رقم الهاتف',
      whatsAppNumber: 'رقم واتساب',
      headerImage: 'صورة الترويسة',
      footerImage: 'صورة التذييل',
    },
    delete: {
      title: 'حذف الشركة',
      body: (name: string, registrationNumber: string) =>
        `هل تريد حذف ${isolate(name)} (${ltr(registrationNumber)})؟ لن تُحذف مركباتها.`,
    },
    select: {
      placeholder: 'اختر شركة',
      loading: 'جارٍ تحميل الشركات…',
      failed: 'تعذّر تحميل الشركات',
      option: (name: string, registrationNumber: string) => `${isolate(name)} (${ltr(registrationNumber)})`,
    },
    validation: {
      textMin: (label: string, min: number) => `${label}: يجب ألّا يقل عدد الأحرف عن ${min}`,
      textMax: (label: string, max: number) => `${label}: يجب ألّا يزيد عدد الأحرف على ${max}`,
    },
  },
})

export type CompaniesMessages = (typeof companiesMessages)['en']
