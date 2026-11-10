import { z } from 'zod'
import type { CommonMessages } from '../../../shared/i18n/commonMessages.ts'
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '../../../shared/types/user.ts'
import type { UsersMessages } from '../i18n.ts'

const EMAIL_MAX_LENGTH = 255
const NAME_MAX_LENGTH = 100

function createUserFields(m: UsersMessages, common: CommonMessages) {
  return {
    email: z
      .string()
      .trim()
      .max(EMAIL_MAX_LENGTH, common.validation.atMost(EMAIL_MAX_LENGTH))
      .pipe(z.email(common.validation.email)),
    firstName: z
      .string()
      .trim()
      .min(1, m.validation.firstNameRequired)
      .max(NAME_MAX_LENGTH, common.validation.atMost(NAME_MAX_LENGTH)),
    lastName: z
      .string()
      .trim()
      .min(1, m.validation.lastNameRequired)
      .max(NAME_MAX_LENGTH, common.validation.atMost(NAME_MAX_LENGTH)),
    role: z.enum(['admin', 'user']),
    isActive: z.boolean(),
  }
}

export function createNewUserSchema(m: UsersMessages, common: CommonMessages) {
  return z.object({
    ...createUserFields(m, common),
    password: z
      .string()
      .min(PASSWORD_MIN_LENGTH, common.validation.atLeast(PASSWORD_MIN_LENGTH))
      .max(PASSWORD_MAX_LENGTH, common.validation.atMost(PASSWORD_MAX_LENGTH)),
  })
}

// Empty = keep the current password.
export function createEditUserSchema(m: UsersMessages, common: CommonMessages) {
  return z.object({
    ...createUserFields(m, common),
    password: z
      .string()
      .max(PASSWORD_MAX_LENGTH, common.validation.atMost(PASSWORD_MAX_LENGTH))
      .refine((value) => value === '' || value.length >= PASSWORD_MIN_LENGTH, {
        error: common.validation.atLeastOrEmpty(PASSWORD_MIN_LENGTH),
      }),
  })
}

export type UserFormValues = z.infer<ReturnType<typeof createNewUserSchema>>
