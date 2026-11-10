import { defineMessages } from '../../shared/i18n/messages.ts'

export const inspectionChecklistMessages = defineMessages({
  en: {
    page: {
      title: 'Inspection checklist',
      description: 'The pre-trip checklist: indicators and the checks under each one.',
      newIndicator: 'New indicator',
      info: 'Every new trip inspection must answer every check below. Changes apply to new inspections only; past inspections keep their copy of the names and order.',
      empty: 'No indicators yet. Add one to start the checklist.',
    },
    dialog: {
      newIndicator: 'New indicator',
      editIndicator: 'Edit indicator',
      newCheck: 'New check',
      editCheck: 'Edit check',
    },
    delete: {
      indicatorTitle: 'Delete indicator',
      checkTitle: 'Delete check',
      // The name sits between `before` and the `…After` text in bold.
      before: 'Delete ',
      indicatorAfter: '? An indicator can only be deleted once it has no checks.',
      checkAfter: '? New inspections will no longer include it.',
    },
    card: {
      order: (sortOrder: number) => `Order ${sortOrder}`,
      addCheck: 'Add check',
      noChecks: 'No checks yet.',
      columns: {
        order: 'Order',
        nameEn: 'English name',
        nameAr: 'Arabic name',
        actions: 'Actions',
      },
    },
    form: {
      indicator: 'Indicator',
      selectIndicator: 'Select an indicator',
      nameEn: 'English name',
      nameAr: 'Arabic name',
      sortOrder: 'Sort order',
      sortOrderHint: (min: number, max: number) => `${min}–${max}; lower comes first`,
    },
    validation: {
      sortOrder: (min: number, max: number) => `Enter a whole number from ${min} to ${max}`,
      indicatorRequired: 'Select an indicator',
    },
  },
  ar: {
    page: {
      title: 'قائمة الفحص',
      description: 'قائمة فحص ما قبل الرحلة: المؤشرات وبنود الفحص التابعة لكل منها.',
      newIndicator: 'مؤشر جديد',
      info: 'يجب أن يجيب كل فحص جديد للرحلة عن جميع البنود أدناه. تسري التغييرات على الفحوص الجديدة فقط، وتحتفظ الفحوص السابقة بنسختها من الأسماء والترتيب.',
      empty: 'لا توجد مؤشرات بعد. أضف مؤشرًا لبدء قائمة الفحص.',
    },
    dialog: {
      newIndicator: 'مؤشر جديد',
      editIndicator: 'تعديل المؤشر',
      newCheck: 'بند جديد',
      editCheck: 'تعديل البند',
    },
    delete: {
      indicatorTitle: 'حذف المؤشر',
      checkTitle: 'حذف البند',
      before: 'هل تريد حذف ',
      indicatorAfter: '؟ لا يمكن حذف المؤشر إلا بعد حذف جميع بنوده.',
      checkAfter: '؟ لن يُدرج هذا البند في الفحوص الجديدة.',
    },
    card: {
      order: (sortOrder: number) => `الترتيب ${sortOrder}`,
      addCheck: 'إضافة بند',
      noChecks: 'لا توجد بنود بعد.',
      columns: {
        order: 'الترتيب',
        nameEn: 'الاسم بالإنجليزية',
        nameAr: 'الاسم بالعربية',
        actions: 'الإجراءات',
      },
    },
    form: {
      indicator: 'المؤشر',
      selectIndicator: 'اختر مؤشرًا',
      nameEn: 'الاسم بالإنجليزية',
      nameAr: 'الاسم بالعربية',
      sortOrder: 'الترتيب',
      sortOrderHint: (min: number, max: number) => `من ${min} إلى ${max}؛ الأصغر يظهر أولًا`,
    },
    validation: {
      sortOrder: (min: number, max: number) => `أدخل عددًا صحيحًا من ${min} إلى ${max}`,
      indicatorRequired: 'اختر مؤشرًا',
    },
  },
})

export type InspectionChecklistMessages = (typeof inspectionChecklistMessages)['en']
