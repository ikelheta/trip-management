import { z } from 'zod'
import type { CommonMessages } from '../../../shared/i18n/commonMessages.ts'

const NAME_MIN_LENGTH = 2
const NAME_MAX_LENGTH = 256

// Only generic messages, so the factory needs just the common dictionary.
export function createCountrySchema(common: CommonMessages) {
  const countryName = z
    .string()
    .trim()
    .min(NAME_MIN_LENGTH, common.validation.atLeast(NAME_MIN_LENGTH))
    .max(NAME_MAX_LENGTH, common.validation.atMost(NAME_MAX_LENGTH))

  return z.object({
    nameEn: countryName,
    nameAr: countryName,
  })
}

export type CountryFormValues = z.infer<ReturnType<typeof createCountrySchema>>
