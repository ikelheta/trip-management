import { z } from 'zod'
import type { CommonMessages } from '../../../shared/i18n/commonMessages.ts'
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '../../../shared/types/user.ts'
import type { AuthMessages } from '../i18n.ts'

// Schema factories: the messages come from the current language's dictionaries.
// Build them with `useMemo(() => createXSchema(m, common), [m, common])`.

export function createLoginSchema(m: AuthMessages, common: CommonMessages) {
  return z.object({
    email: z.string().trim().pipe(z.email(common.validation.email)),
    password: z.string().min(1, m.validation.passwordRequired).max(PASSWORD_MAX_LENGTH),
  })
}

export type LoginFormValues = z.infer<ReturnType<typeof createLoginSchema>>

export function createChangePasswordSchema(m: AuthMessages, common: CommonMessages) {
  return z
    .object({
      currentPassword: z.string().min(1, m.validation.currentPasswordRequired).max(PASSWORD_MAX_LENGTH),
      newPassword: z
        .string()
        .min(PASSWORD_MIN_LENGTH, common.validation.atLeast(PASSWORD_MIN_LENGTH))
        .max(PASSWORD_MAX_LENGTH, common.validation.atMost(PASSWORD_MAX_LENGTH)),
      confirmPassword: z.string(),
    })
    .refine((values) => values.newPassword === values.confirmPassword, {
      error: m.validation.passwordsMismatch,
      path: ['confirmPassword'],
    })
}

export type ChangePasswordFormValues = z.infer<ReturnType<typeof createChangePasswordSchema>>
