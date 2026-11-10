import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import { ApiError } from '../services/httpClient.ts'

const FALLBACK_MESSAGE = 'Something went wrong. Please try again.'

/**
 * Puts API validation messages ("email must be an email") on the matching form field and
 * the rest (e.g. 409 "Email is already in use") on `root.server`, shown with <FormError>.
 */
export function applyServerErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
): void {
  const messages = error instanceof ApiError ? error.messages : [FALLBACK_MESSAGE]
  const unmatched: string[] = []
  for (const message of messages) {
    const field = fields.find((name) => message.startsWith(`${name} `))
    if (field) {
      setError(field, { type: 'server', message })
    } else {
      unmatched.push(message)
    }
  }
  if (unmatched.length > 0) {
    setError('root.server', { type: 'server', message: unmatched.join('\n') })
  }
}
