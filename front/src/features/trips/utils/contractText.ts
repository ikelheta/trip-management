// Fixed text of the printed trip contract, copied verbatim from the company's template
// (.squad/stories/trips/trip-contract-print-page/attachments). Not in i18n.ts: the contract is
// always Arabic, whatever the UI language.
export const CONTRACT_TEXT = {
  title: 'عقد نقل على الطريق البريه',
  date: 'تاريخ',
  legal:
    'تم ابرام هذا العقد بين المتعاقدين بناء على الماده( 39 ) التاسعه والثلاثون من اللائحه المنظمة للنشاط النقل المتخصص وتأجير وتوجيه الحافلات وبناء على الفقره ( 1) من المادة ( 39 ) والتي تنص على ان يجب على الناقل ابرام عقد نقل مع الاطراف المحددين في الماده( 40 ) قبل تنفيذ عمليات النقل على الطرق البرية بما لا يخالف احكام هذه اللائحه ووفقا للتليه التي تحددها هئة النقل. وبناء على ماسبق تم ابرام عقد بين الاطراف الاتيه:',
  firstParty: 'الطرف الاول:',
  registration: 'سجل رقم:',
  secondParty: 'الطرف الثاني:',
  agreement:
    'اتفق الطرفان على ان ينفذ الطرف الاول عمليه نقل للطرف الثاني مع مرافقيه وذويهم من الموقع المحدد مسبقا من الطرف الثاني وتوصيلهم الى الجهه المحدده بالعقد.',
  tripColumns: {
    origin: 'النقل من',
    destination: 'وصولا إلى',
    tripNumber: 'رقم الرحلة',
    time: 'وقت الرحلة',
    date: 'تاريخ الرحلة',
  },
  manifestHeading: 'بيان الركاب',

  manifest: {
    time: 'الوقت:',
    day: 'اليوم:',
    entity: 'اسم الجهة:',
    date: 'التاريخ:',
  },
  driverColumns: {
    identity: 'رقم الهويه',
    name: 'اسم السائق',
    plate: 'رقم اللوحه',
    // The template prints the two words reversed ("السيارة نوع").
    vehicleType: 'نوع السيارة',
  },
  guestsHeading: 'معلومات الضيوف',
  passengerColumns: {
    index: 'الرقم',
    name: 'اسم المعتمرين',
    docType: 'نوع التاشيره',
    identityNumber: 'رقم جواز السفر رقم التاشيرهة',
    nationality: 'الجنسية',
  },
  noPassengers: 'لا يوجد ركاب',
  noteHeading: '(ملاحظه هامة)',
  note: 'في حال عدم تطابق بيانات الضيوف مع الاثباتات نكن عرضه للجزاء وهذه تعهد منا بذلك.',
  inquiries: 'للأستفسارات:',
  bookingNumber: 'رقم الحجز:',

  inspection: {
    time: 'وقت الفحص:',
    date: 'التاريخ:',
    plate: 'لوحة المركبة:',
    driver: 'إسم السائق:',
    item: 'البند - ITEM',
    sound: 'SOUND',
    unsound: 'UNSOUND',
    notes: 'NOTES',
    none: 'لم يتم تسجيل فحص لهذه الرحلة',
  },
} as const
