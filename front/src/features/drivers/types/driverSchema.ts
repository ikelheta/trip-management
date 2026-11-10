import { z } from 'zod'
import type { CommonMessages } from '../../../shared/i18n/commonMessages.ts'
import type { DriversMessages } from '../i18n.ts'

const NAME_MIN_LENGTH = 2
const NAME_MAX_LENGTH = 256
const IDENTITY_ID_MAX_LENGTH = 50

export function createDriverSchema(m: DriversMessages, common: CommonMessages) {
  return z.object({
    name: z
      .string()
      .trim()
      .min(NAME_MIN_LENGTH, common.validation.atLeast(NAME_MIN_LENGTH))
      .max(NAME_MAX_LENGTH, common.validation.atMost(NAME_MAX_LENGTH)),
    identityId: z
      .string()
      .trim()
      .min(1, m.validation.identityIdRequired)
      .max(IDENTITY_ID_MAX_LENGTH, common.validation.atMost(IDENTITY_ID_MAX_LENGTH)),
    nationalityId: z.string().min(1, m.validation.nationalityRequired),
    vehicleId: z.string().min(1, m.validation.vehicleRequired),
  })
}

export type DriverFormValues = z.infer<ReturnType<typeof createDriverSchema>>
