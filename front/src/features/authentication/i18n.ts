import { defineMessages } from '../../shared/i18n/messages.ts'

export const authMessages = defineMessages({
  en: {
    login: {
      title: 'Sign in',
      email: 'Email',
      password: 'Password',
      submit: 'Sign in',
      submitting: 'Signing in…',
    },
    changePassword: {
      title: 'Change password',
      saved: 'Password changed. Other devices stay signed in until their session expires.',
      currentPassword: 'Current password',
      newPassword: 'New password',
      newPasswordHint: (min: number, max: number) => `${min}–${max} characters`,
      confirmPassword: 'Confirm new password',
      submit: 'Change password',
      backToAccount: 'Back to my account',
    },
    account: {
      title: 'My account',
      description: 'Your profile details and sign-in settings.',
      openLabel: 'Open my account',
      profileTitle: 'Profile',
      email: 'Email',
      role: 'Role',
      memberSince: 'Member since',
      passwordTitle: 'Password',
      passwordText: 'Change the password you use to sign in.',
      changePassword: 'Change password',
      signOutTitle: 'Sign out',
      signOutText: 'End your session on this device. You will need your password to sign in again.',
      signOut: 'Sign out',
      roles: {
        admin: 'Admin',
        user: 'User',
      },
    },
    session: {
      loading: 'Loading your session…',
      loadFailed: 'Could not load your account.',
    },
    validation: {
      passwordRequired: 'Enter your password',
      currentPasswordRequired: 'Enter your current password',
      passwordsMismatch: 'Passwords do not match',
    },
  },
  ar: {
    login: {
      title: 'تسجيل الدخول',
      email: 'البريد الإلكتروني',
      password: 'كلمة المرور',
      submit: 'تسجيل الدخول',
      submitting: 'جارٍ تسجيل الدخول…',
    },
    changePassword: {
      title: 'تغيير كلمة المرور',
      saved: 'تم تغيير كلمة المرور. تظل الأجهزة الأخرى مسجّلة الدخول حتى تنتهي جلساتها.',
      currentPassword: 'كلمة المرور الحالية',
      newPassword: 'كلمة المرور الجديدة',
      newPasswordHint: (min: number, max: number) => `من ${min} إلى ${max} حرفًا`,
      confirmPassword: 'تأكيد كلمة المرور الجديدة',
      submit: 'تغيير كلمة المرور',
      backToAccount: 'العودة إلى حسابي',
    },
    account: {
      title: 'حسابي',
      description: 'بيانات ملفك الشخصي وإعدادات تسجيل الدخول.',
      openLabel: 'فتح حسابي',
      profileTitle: 'الملف الشخصي',
      email: 'البريد الإلكتروني',
      role: 'الدور',
      memberSince: 'عضو منذ',
      passwordTitle: 'كلمة المرور',
      passwordText: 'غيّر كلمة المرور التي تستخدمها لتسجيل الدخول.',
      changePassword: 'تغيير كلمة المرور',
      signOutTitle: 'تسجيل الخروج',
      signOutText: 'أنهِ جلستك على هذا الجهاز. ستحتاج إلى كلمة المرور لتسجيل الدخول مرة أخرى.',
      signOut: 'تسجيل الخروج',
      roles: {
        admin: 'مسؤول',
        user: 'مستخدم',
      },
    },
    session: {
      loading: 'جارٍ تحميل جلستك…',
      loadFailed: 'تعذّر تحميل بيانات حسابك.',
    },
    validation: {
      passwordRequired: 'أدخل كلمة المرور',
      currentPasswordRequired: 'أدخل كلمة المرور الحالية',
      passwordsMismatch: 'كلمتا المرور غير متطابقتين',
    },
  },
})

export type AuthMessages = (typeof authMessages)['en']
