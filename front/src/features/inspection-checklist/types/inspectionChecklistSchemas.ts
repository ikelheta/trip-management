import { z } from 'zod'
import type { CommonMessages } from '../../../shared/i18n/commonMessages.ts'
import type { InspectionChecklistMessages } from '../i18n.ts'

const NAME_MIN_LENGTH = 2
const NAME_MAX_LENGTH = 256
export const SORT_ORDER_MIN = 0
export const SORT_ORDER_MAX = 1000

export function createIndicatorSchema(m: InspectionChecklistMessages, common: CommonMessages) {
  const sortOrderMessage = m.validation.sortOrder(SORT_ORDER_MIN, SORT_ORDER_MAX)
  const name = z
    .string()
    .trim()
    .min(NAME_MIN_LENGTH, common.validation.atLeast(NAME_MIN_LENGTH))
    .max(NAME_MAX_LENGTH, common.validation.atMost(NAME_MAX_LENGTH))

  return z.object({
    nameEn: name,
    nameAr: name,
    // The input uses valueAsNumber, so an empty field arrives as NaN and fails here.
    sortOrder: z
      .number({ error: sortOrderMessage })
      .int(sortOrderMessage)
      .min(SORT_ORDER_MIN, sortOrderMessage)
      .max(SORT_ORDER_MAX, sortOrderMessage),
  })
}

export type IndicatorFormValues = z.infer<ReturnType<typeof createIndicatorSchema>>

export function createCheckSchema(m: InspectionChecklistMessages, common: CommonMessages) {
  return createIndicatorSchema(m, common).extend({
    indicatorId: z.string().min(1, m.validation.indicatorRequired),
  })
}

export type CheckFormValues = z.infer<ReturnType<typeof createCheckSchema>>
