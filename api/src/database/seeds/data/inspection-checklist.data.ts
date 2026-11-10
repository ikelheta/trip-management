export interface InspectionCheckSeed {
  nameAr: string;
  nameEn: string;
  sortOrder: number;
}

export interface InspectionIndicatorSeed extends InspectionCheckSeed {
  checks: readonly InspectionCheckSeed[];
}

// Default pre-trip checklist: 3 indicators, 16 checks.
export const INSPECTION_CHECKLIST: readonly InspectionIndicatorSeed[] = [
  {
    nameAr: 'فحص مؤشرات لوحة القيادة',
    nameEn: 'Dashboard Indicators',
    sortOrder: 1,
    checks: [
      { nameAr: 'مؤشر الوقود', nameEn: 'Fuel gauge', sortOrder: 1 },
      { nameAr: 'مؤشر الحرارة', nameEn: 'Temperature gauge', sortOrder: 2 },
      { nameAr: 'مؤشر ضغط الزيت', nameEn: 'Oil pressure gauge', sortOrder: 3 },
      { nameAr: 'لمبة فحص المحرك', nameEn: 'Check engine light', sortOrder: 4 },
      { nameAr: 'لمبة ABS', nameEn: 'ABS Light', sortOrder: 5 },
      { nameAr: 'لمبات التحذير', nameEn: 'Warning Light', sortOrder: 6 },
    ],
  },
  {
    nameAr: 'الفحص الخارجي',
    nameEn: 'External Inspection',
    sortOrder: 2,
    checks: [
      {
        nameAr: 'الإطارات وضغط الهواء',
        nameEn: 'Tires and Air pressure',
        sortOrder: 1,
      },
      {
        nameAr: 'الأنوار الأمامية والخلفية',
        nameEn: 'Headlights and Taillights',
        sortOrder: 2,
      },
      { nameAr: 'الإشارات التحذيرية', nameEn: 'Warning Signals', sortOrder: 3 },
      { nameAr: 'الزجاج والمرايا', nameEn: 'Glass and Mirrors', sortOrder: 4 },
      { nameAr: 'عدم وجود تسربات', nameEn: 'No leaks', sortOrder: 5 },
    ],
  },
  {
    nameAr: 'أدوات السلامة',
    nameEn: 'Safety Requirements',
    sortOrder: 3,
    checks: [
      {
        nameAr: 'طفاية حريق سارية الصلاحية',
        nameEn: 'Valid Fire Extinguisher',
        sortOrder: 1,
      },
      { nameAr: 'مثلث تحذيري', nameEn: 'Warning Triangle', sortOrder: 2 },
      { nameAr: 'حقيبة إسعافات أولية', nameEn: 'First Aid Kit', sortOrder: 3 },
      {
        nameAr: 'مطرقة كسر الزجاج',
        nameEn: 'Glass Breaker Hammer',
        sortOrder: 4,
      },
      { nameAr: 'أحزمة الأمان', nameEn: 'Safety Belts', sortOrder: 5 },
    ],
  },
];
