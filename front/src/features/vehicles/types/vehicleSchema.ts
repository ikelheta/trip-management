import { z } from 'zod'
import type { CommonMessages } from '../../../shared/i18n/commonMessages.ts'
import type { VehiclesMessages } from '../i18n.ts'

const PLATE_NUMBER_MAX_LENGTH = 50
const TEXT_MAX_LENGTH = 256

export function createVehicleSchema(m: VehiclesMessages, common: CommonMessages) {
  function requiredText(requiredMessage: string, maxLength: number) {
    return z.string().trim().min(1, requiredMessage).max(maxLength, common.validation.atMost(maxLength))
  }

  return z.object({
    plateNumber: requiredText(m.validation.plateNumberRequired, PLATE_NUMBER_MAX_LENGTH),
    model: requiredText(m.validation.modelRequired, TEXT_MAX_LENGTH),
    type: requiredText(m.validation.typeRequired, TEXT_MAX_LENGTH),
    companyId: z.string().min(1, m.validation.companyRequired),
  })
}

export type VehicleFormValues = z.infer<ReturnType<typeof createVehicleSchema>>
