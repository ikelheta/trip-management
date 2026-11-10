import type { Language } from './language.ts'

/**
 * Exact English API (and client fallback) message → Arabic. Strings from backend/contracts/*.md,
 * httpClient.ts and formErrors.ts. A message not listed here is shown in English.
 */
const ARABIC_API_MESSAGES: Record<string, string> = {
  // Client fallbacks (httpClient.ts, formErrors.ts, ErrorAlert)
  'Something went wrong. Please try again.': 'حدث خطأ ما. يُرجى المحاولة مرة أخرى.',
  'Cannot reach the server. Check your connection and try again.':
    'تعذّر الاتصال بالخادم. تحقّق من اتصالك ثم حاول مرة أخرى.',
  'Request failed': 'تعذّر تنفيذ الطلب',
  // README.md
  'Validation failed (uuid is expected)': 'المعرّف غير صالح.',
  'Resource already exists': 'هذا السجل موجود مسبقًا.',
  'Internal server error': 'حدث خطأ في الخادم.',
  // auth.md
  'Missing access token': 'انتهت جلستك. يُرجى تسجيل الدخول مرة أخرى.',
  'Invalid or expired access token': 'انتهت جلستك. يُرجى تسجيل الدخول مرة أخرى.',
  'Invalid email or password': 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
  'Current password is incorrect': 'كلمة المرور الحالية غير صحيحة',
  // users.md
  'Email is already in use': 'البريد الإلكتروني مستخدم بالفعل',
  // companies.md
  'Registration number is already in use': 'رقم السجل التجاري مستخدم بالفعل',
  'headerUrl and footerUrl must be different files': 'يجب أن تكون صورة الترويسة مختلفة عن صورة التذييل',
  'headerUrl must be the url of a file uploaded with ownerType "companies" and not used by another company':
    'صورة الترويسة غير صالحة أو مستخدمة لدى شركة أخرى',
  'footerUrl must be the url of a file uploaded with ownerType "companies" and not used by another company':
    'صورة التذييل غير صالحة أو مستخدمة لدى شركة أخرى',
  'headerUrl must point to a JPEG, PNG or WebP image': 'يجب أن تكون صورة الترويسة بصيغة JPEG أو PNG أو WebP',
  'footerUrl must point to a JPEG, PNG or WebP image': 'يجب أن تكون صورة التذييل بصيغة JPEG أو PNG أو WebP',
  // countries.md, inspection-checklist.md
  'Arabic name is already in use': 'الاسم العربي مستخدم بالفعل',
  'English name is already in use': 'الاسم الإنجليزي مستخدم بالفعل',
  'Inspection indicator still has checks; delete or move them first':
    'لا يزال مؤشر الفحص يحتوي على بنود فحص؛ احذفها أو انقلها أولًا',
  'Arabic name is already used by another check in this indicator':
    'الاسم العربي مستخدم لبند فحص آخر في هذا المؤشر',
  'English name is already used by another check in this indicator':
    'الاسم الإنجليزي مستخدم لبند فحص آخر في هذا المؤشر',
  // drivers.md
  'Identity id is already in use': 'رقم الهوية مستخدم بالفعل',
  // vehicles.md
  'Plate number is already in use': 'رقم اللوحة مستخدم بالفعل',
  // trips.md
  'No inspection checks are configured': 'لم تُضبط أي بنود فحص بعد',
  'dateFrom must be on or before dateTo': 'يجب ألّا يكون تاريخ البداية بعد تاريخ النهاية',
  'passengers must not repeat an identityNumber': 'لا يجوز تكرار رقم هوية الراكب',
  // files.md
  'A non-empty "file" is required': 'يجب اختيار ملف غير فارغ',
  'File exceeds the 10 MB limit': 'يتجاوز حجم الملف الحد المسموح به (10 ميغابايت)',
}

/** API resource names used in "<Resource> <id> not found" / "<Resource> <id> does not exist". */
const ARABIC_RESOURCES: Record<string, string> = {
  Trip: 'الرحلة',
  Company: 'الشركة',
  Country: 'الدولة',
  Driver: 'السائق',
  Vehicle: 'المركبة',
  User: 'المستخدم',
  File: 'الملف',
  'Inspection indicator': 'مؤشر الفحص',
  'Inspection check': 'بند الفحص',
}

const RESOURCE_PATTERN = Object.keys(ARABIC_RESOURCES).join('|')

/** Messages that carry an id or a value: pattern → Arabic built from the captured parts. */
const ARABIC_API_PATTERNS: { pattern: RegExp; translate: (match: RegExpExecArray) => string }[] = [
  {
    pattern: new RegExp(`^(${RESOURCE_PATTERN}) \\S+ not found$`),
    translate: (match) => `${ARABIC_RESOURCES[match[1]]} غير موجود${feminineSuffix(match[1])}`,
  },
  {
    pattern: new RegExp(`^(${RESOURCE_PATTERN}) \\S+ does not exist$`),
    translate: (match) => `${ARABIC_RESOURCES[match[1]]} المحدد${feminineSuffix(match[1])} غير موجود${feminineSuffix(match[1])}`,
  },
  { pattern: /^Trip \S+ has no inspection$/, translate: () => 'لا يوجد فحص مسجّل لهذه الرحلة' },
  { pattern: /^Unknown or deleted checks: (.+)$/, translate: (match) => `بنود فحص غير معروفة أو محذوفة: ${match[1]}` },
  { pattern: /^Missing results for checks: (.+)$/, translate: (match) => `لم تُسجَّل نتائج لبنود الفحص التالية: ${match[1]}` },
  {
    pattern: /^Checks not part of this inspection: (.+)$/,
    translate: (match) => `بنود فحص ليست ضمن هذا الفحص: ${match[1]}`,
  },
  { pattern: /^File type "(.+)" is not allowed$/, translate: (match) => `نوع الملف "${match[1]}" غير مسموح به` },
]

// Grammatical gender of the Arabic resource name ("الرحلة غير موجودة" / "السائق غير موجود").
const FEMININE_RESOURCES = new Set(['Trip', 'Company', 'Country', 'Vehicle'])

function feminineSuffix(resource: string): string {
  return FEMININE_RESOURCES.has(resource) ? 'ة' : ''
}

/** Translates a known API message; anything else (e.g. class-validator text) is returned unchanged. */
export function translateApiMessage(message: string, language: Language): string {
  if (language === 'en') {
    return message
  }
  if (Object.hasOwn(ARABIC_API_MESSAGES, message)) {
    return ARABIC_API_MESSAGES[message]
  }
  for (const { pattern, translate } of ARABIC_API_PATTERNS) {
    const match = pattern.exec(message)
    if (match) {
      return translate(match)
    }
  }
  return message
}
