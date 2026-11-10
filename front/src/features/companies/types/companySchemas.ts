import { z } from 'zod'
import type { CompaniesMessages } from '../i18n.ts'

const TEXT_MIN_LENGTH = 2
const TEXT_MAX_LENGTH = 256

export function createCompanyFormSchema(m: CompaniesMessages) {
  function requiredText(label: string) {
    return z
      .string()
      .trim()
      .min(TEXT_MIN_LENGTH, m.validation.textMin(label, TEXT_MIN_LENGTH))
      .max(TEXT_MAX_LENGTH, m.validation.textMax(label, TEXT_MAX_LENGTH))
  }

  return z.object({
    name: requiredText(m.form.name),
    registrationNumber: requiredText(m.form.registrationNumber),
    city: requiredText(m.form.city),
    address: requiredText(m.form.address),
    whatsAppNumber: requiredText(m.form.whatsAppNumber),
    phoneNumber: requiredText(m.form.phoneNumber),
    headerUrl: z.string().nullable(),
    footerUrl: z.string().nullable(),
  })
}

export type CompanyFormValues = z.infer<ReturnType<typeof createCompanyFormSchema>>

export const COMPANY_FORM_FIELDS = [
  'name',
  'registrationNumber',
  'city',
  'address',
  'whatsAppNumber',
  'phoneNumber',
  'headerUrl',
  'footerUrl',
] as const
