import { ltr } from '../../shared/i18n/bidi.ts'
import { defineMessages } from '../../shared/i18n/messages.ts'

export const vehiclesMessages = defineMessages({
  en: {
    list: {
      title: 'Vehicles',
      description: 'Vehicles owned by the leasing companies.',
      newVehicle: 'New vehicle',
      searchPlaceholder: 'Search plate, model or type…',
      companyFilter: 'Filter by company',
      allCompanies: 'All companies',
      emptyFiltered: 'No vehicles match these filters.',
      empty: 'No vehicles yet.',
      deletedCompany: 'Deleted company',
      columns: {
        plateNumber: 'Plate number',
        model: 'Model',
        type: 'Type',
        company: 'Company',
        updated: 'Last updated',
        actions: 'Actions',
      },
    },
    delete: {
      title: 'Delete vehicle',
      // The plate sits between the two parts in bold.
      before: 'Delete ',
      after: '? Drivers and trips that use it keep it, but it can no longer be chosen for new ones.',
    },
    newPage: {
      title: 'New vehicle',
    },
    editPage: {
      title: (plateNumber: string) => `Edit vehicle ${plateNumber}`,
      back: 'Back to vehicles',
    },
    form: {
      plateNumber: 'Plate number',
      company: 'Company',
      model: 'Model',
      type: 'Type',
      typeHint: 'For example Bus, Van or Car',
      loadingCompanies: 'Loading companies…',
      companiesFailed: 'Could not load companies.',
    },
    select: {
      placeholder: 'Select a vehicle',
      loading: 'Loading vehicles…',
      failed: 'Could not load vehicles',
    },
    validation: {
      plateNumberRequired: 'Enter the plate number',
      modelRequired: 'Enter the model',
      typeRequired: 'Enter the type',
      companyRequired: 'Select a company',
    },
  },
  ar: {
    list: {
      title: 'المركبات',
      description: 'المركبات المملوكة لشركات التأجير.',
      newVehicle: 'مركبة جديدة',
      searchPlaceholder: 'ابحث برقم اللوحة أو الطراز أو النوع…',
      companyFilter: 'التصفية حسب الشركة',
      allCompanies: 'كل الشركات',
      emptyFiltered: 'لا توجد مركبات تطابق عوامل التصفية هذه.',
      empty: 'لا توجد مركبات بعد.',
      deletedCompany: 'شركة محذوفة',
      columns: {
        plateNumber: 'رقم اللوحة',
        model: 'الطراز',
        type: 'النوع',
        company: 'الشركة',
        updated: 'آخر تحديث',
        actions: 'الإجراءات',
      },
    },
    delete: {
      title: 'حذف المركبة',
      before: 'هل تريد حذف المركبة ',
      after: '؟ يحتفظ بها السائقون والرحلات التي تستخدمها، لكن لن يعود بالإمكان اختيارها لسائقين أو رحلات جديدة.',
    },
    newPage: {
      title: 'مركبة جديدة',
    },
    editPage: {
      title: (plateNumber: string) => `تعديل المركبة ${ltr(plateNumber)}`,
      back: 'العودة إلى المركبات',
    },
    form: {
      plateNumber: 'رقم اللوحة',
      company: 'الشركة',
      model: 'الطراز',
      type: 'النوع',
      typeHint: 'مثل: حافلة أو فان أو سيارة',
      loadingCompanies: 'جارٍ تحميل الشركات…',
      companiesFailed: 'تعذّر تحميل الشركات.',
    },
    select: {
      placeholder: 'اختر مركبة',
      loading: 'جارٍ تحميل المركبات…',
      failed: 'تعذّر تحميل المركبات',
    },
    validation: {
      plateNumberRequired: 'أدخل رقم اللوحة',
      modelRequired: 'أدخل الطراز',
      typeRequired: 'أدخل النوع',
      companyRequired: 'اختر شركة',
    },
  },
})

export type VehiclesMessages = (typeof vehiclesMessages)['en']
