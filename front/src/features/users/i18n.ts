import { isolate, ltr } from '../../shared/i18n/bidi.ts'
import { defineMessages } from '../../shared/i18n/messages.ts'

export const usersMessages = defineMessages({
  en: {
    list: {
      title: 'Users',
      description: 'People who can sign in.',
      newUser: 'New user',
      searchPlaceholder: 'Search by name or email',
      emptySearch: 'No users match your search.',
      empty: 'No users yet.',
      you: ' (you)',
      columns: {
        name: 'Name',
        email: 'Email',
        role: 'Role',
        status: 'Status',
        created: 'Created',
        actions: 'Actions',
      },
    },
    delete: {
      title: 'Delete user',
      body: (name: string, email: string) =>
        `Delete ${name} (${email})? Users are deleted permanently and are signed out on their next request.`,
    },
    newPage: {
      title: 'New user',
      submit: 'Create user',
    },
    editPage: {
      title: 'Edit user',
      submit: 'Save changes',
    },
    form: {
      firstName: 'First name',
      lastName: 'Last name',
      email: 'Email',
      role: 'Role',
      roleHint: 'Admins see user management.',
      roleHintSelf: 'You cannot change your own role.',
      active: 'Active',
      activeHint: 'Inactive users cannot sign in and are signed out on their next request.',
      activeHintSelf: 'You cannot deactivate yourself.',
      password: 'Password',
      newPassword: 'New password',
      passwordHint: (min: number, max: number) => `${min}–${max} characters`,
      newPasswordHint: (min: number, max: number) =>
        `Leave empty to keep the current password. ${min}–${max} characters.`,
    },
    /** Options of the role select. */
    roleOptions: {
      admin: 'Admin',
      user: 'User',
    },
    /** Role badge in the list (lower case, as the API value). */
    roles: {
      admin: 'admin',
      user: 'user',
    },
    status: {
      active: 'Active',
      inactive: 'Inactive',
    },
    validation: {
      firstNameRequired: 'Enter a first name',
      lastNameRequired: 'Enter a last name',
    },
  },
  ar: {
    list: {
      title: 'المستخدمون',
      description: 'الأشخاص الذين يمكنهم تسجيل الدخول.',
      newUser: 'مستخدم جديد',
      searchPlaceholder: 'ابحث بالاسم أو البريد الإلكتروني',
      emptySearch: 'لا يوجد مستخدمون يطابقون بحثك.',
      empty: 'لا يوجد مستخدمون بعد.',
      you: ' (أنت)',
      columns: {
        name: 'الاسم',
        email: 'البريد الإلكتروني',
        role: 'الدور',
        status: 'الحالة',
        created: 'تاريخ الإنشاء',
        actions: 'الإجراءات',
      },
    },
    delete: {
      title: 'حذف المستخدم',
      body: (name: string, email: string) =>
        `هل تريد حذف ${isolate(name)} (${ltr(email)})؟ يُحذف المستخدمون نهائيًا، ويُسجَّل خروجهم عند طلبهم التالي.`,
    },
    newPage: {
      title: 'مستخدم جديد',
      submit: 'إنشاء المستخدم',
    },
    editPage: {
      title: 'تعديل المستخدم',
      submit: 'حفظ التغييرات',
    },
    form: {
      firstName: 'الاسم الأول',
      lastName: 'اسم العائلة',
      email: 'البريد الإلكتروني',
      role: 'الدور',
      roleHint: 'يرى المسؤولون صفحة إدارة المستخدمين.',
      roleHintSelf: 'لا يمكنك تغيير دورك.',
      active: 'نشط',
      activeHint: 'لا يستطيع المستخدمون غير النشطين تسجيل الدخول، ويُسجَّل خروجهم عند طلبهم التالي.',
      activeHintSelf: 'لا يمكنك إلغاء تنشيط حسابك.',
      password: 'كلمة المرور',
      newPassword: 'كلمة المرور الجديدة',
      passwordHint: (min: number, max: number) => `من ${min} إلى ${max} حرفًا`,
      newPasswordHint: (min: number, max: number) =>
        `اتركها فارغة للإبقاء على كلمة المرور الحالية. من ${min} إلى ${max} حرفًا.`,
    },
    roleOptions: {
      admin: 'مسؤول',
      user: 'مستخدم',
    },
    roles: {
      admin: 'مسؤول',
      user: 'مستخدم',
    },
    status: {
      active: 'نشط',
      inactive: 'غير نشط',
    },
    validation: {
      firstNameRequired: 'أدخل الاسم الأول',
      lastNameRequired: 'أدخل اسم العائلة',
    },
  },
})

export type UsersMessages = (typeof usersMessages)['en']
