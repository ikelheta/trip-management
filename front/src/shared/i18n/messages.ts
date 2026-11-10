import type { Language } from './language.ts'
import { useLanguage } from './useLanguage.ts'

export type Messages<T> = Record<Language, T>

/**
 * English is the source of the shape; `NoInfer` makes TypeScript check Arabic against it,
 * so a missing, extra or wrongly typed Arabic entry fails the build.
 */
export function defineMessages<T>(messages: { en: T; ar: NoInfer<T> }): Messages<T> {
  return messages
}

/** The current language's dictionary. Re-renders the component when the language changes. */
export function useMessages<T>(messages: Messages<T>): T {
  return messages[useLanguage().language]
}
