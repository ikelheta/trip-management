import { z } from 'zod'
import type { CommonMessages } from '../../../shared/i18n/commonMessages.ts'
import type { TripsMessages } from '../i18n.ts'

export const MAX_PASSENGERS = 100
export const NOTE_MAX_LENGTH = 500

const NAME_MIN_LENGTH = 2
const NAME_MAX_LENGTH = 256
const IDENTITY_NUMBER_MIN_DIGITS = 1
const IDENTITY_NUMBER_MAX_DIGITS = 50
const DOC_TYPE_MAX_LENGTH = 50
const SECRET_CODE_MAX_LENGTH = 50

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/
// Keep in step with IDENTITY_NUMBER_MIN_DIGITS / IDENTITY_NUMBER_MAX_DIGITS.
const IDENTITY_NUMBER_PATTERN = /^\d{1,50}$/

export function createTripFormSchema(m: TripsMessages, common: CommonMessages) {
  const nameMessage = common.validation.lengthBetween(NAME_MIN_LENGTH, NAME_MAX_LENGTH)

  const passengerSchema = z.object({
    name: z.string().trim().min(NAME_MIN_LENGTH, nameMessage).max(NAME_MAX_LENGTH, nameMessage),
    identityNumber: z
      .string()
      .trim()
      .regex(
        IDENTITY_NUMBER_PATTERN,
        common.validation.digitsOnly(IDENTITY_NUMBER_MIN_DIGITS, IDENTITY_NUMBER_MAX_DIGITS),
      ),
    docType: z
      .string()
      .trim()
      .min(1, m.validation.docTypeRequired)
      .max(DOC_TYPE_MAX_LENGTH, common.validation.atMost(DOC_TYPE_MAX_LENGTH)),
    nationality: z.string().trim().min(NAME_MIN_LENGTH, nameMessage).max(NAME_MAX_LENGTH, nameMessage),
  })

  const resultSchema = z.object({
    checkId: z.string(),
    // '' = not answered yet (new trips start unanswered). The `: boolean` return type stops TypeScript
    // inferring a type guard, which would make zod narrow the output type and split form input / output types.
    status: z.enum(['', 'good', 'faulty']).refine((status): boolean => status !== '', m.validation.answerCheck),
    note: z.string().trim().max(NOTE_MAX_LENGTH, common.validation.atMost(NOTE_MAX_LENGTH)),
  })

  return z.object({
    origin: z
      .string()
      .trim()
      .min(1, m.validation.originRequired)
      .min(NAME_MIN_LENGTH, nameMessage)
      .max(NAME_MAX_LENGTH, nameMessage),
    destination: z
      .string()
      .trim()
      .min(1, m.validation.destinationRequired)
      .min(NAME_MIN_LENGTH, nameMessage)
      .max(NAME_MAX_LENGTH, nameMessage),
    tripName: z
      .string()
      .trim()
      .refine(
        (name) => name === '' || (name.length >= NAME_MIN_LENGTH && name.length <= NAME_MAX_LENGTH),
        common.validation.lengthBetweenOrEmpty(NAME_MIN_LENGTH, NAME_MAX_LENGTH),
      ),
    secretCode: z.string().trim().max(SECRET_CODE_MAX_LENGTH, common.validation.atMost(SECRET_CODE_MAX_LENGTH)),
    vehicleId: z.string().min(1, m.validation.vehicleRequired),
    driverId: z.string().min(1, m.validation.driverRequired),
    date: z.string().regex(DATE_PATTERN, m.validation.dateRequired),
    time: z.string().regex(TIME_PATTERN, m.validation.timeRequired),
    passengers: z
      .array(passengerSchema)
      .max(MAX_PASSENGERS, m.validation.maxPassengers(MAX_PASSENGERS))
      .superRefine((passengers, ctx) => {
        const seen = new Set<string>()
        passengers.forEach((passenger, index) => {
          if (seen.has(passenger.identityNumber)) {
            ctx.addIssue({
              code: 'custom',
              message: m.validation.duplicateIdentity,
              path: [index, 'identityNumber'],
            })
          }
          seen.add(passenger.identityNumber)
        })
      }),
    /** <input type="datetime-local"> value, '' = server default (now) / unchanged. */
    inspectedAt: z.string(),
    /** Same order as the inspection groups shown in the form. */
    results: z.array(resultSchema),
  })
}

export type TripFormValues = z.infer<ReturnType<typeof createTripFormSchema>>
export type PassengerFormValues = TripFormValues['passengers'][number]
