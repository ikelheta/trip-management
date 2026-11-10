import { defineMessages } from '../../shared/i18n/messages.ts'

export const filesMessages = defineMessages({
  en: {
    image: {
      none: 'No image',
      unavailable: 'Image unavailable',
      loading: 'Loading image…',
    },
    upload: {
      hint: (maxMb: number) => `JPEG, PNG or WebP, up to ${maxMb} MB`,
      uploading: 'Uploading…',
      remove: 'Remove image',
      failed: 'Upload failed. Please try again.',
      wrongType: 'Choose a JPEG, PNG or WebP image.',
      empty: 'The file is empty.',
      tooLarge: (maxMb: number) => `The file is larger than ${maxMb} MB.`,
    },
  },
  ar: {
    image: {
      none: 'لا توجد صورة',
      unavailable: 'الصورة غير متاحة',
      loading: 'جارٍ تحميل الصورة…',
    },
    upload: {
      hint: (maxMb: number) => `بصيغة JPEG أو PNG أو WebP، وبحجم أقصاه ${maxMb} ميغابايت`,
      uploading: 'جارٍ الرفع…',
      remove: 'إزالة الصورة',
      failed: 'تعذّر رفع الملف. يُرجى المحاولة مرة أخرى.',
      wrongType: 'اختر صورة بصيغة JPEG أو PNG أو WebP.',
      empty: 'الملف فارغ.',
      tooLarge: (maxMb: number) => `حجم الملف أكبر من ${maxMb} ميغابايت.`,
    },
  },
})

export type FilesMessages = (typeof filesMessages)['en']
