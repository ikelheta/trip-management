import { useSyncExternalStore } from 'react'
import {
  DIRECTIONS,
  getLanguage,
  LOCALES,
  setLanguage,
  subscribeToLanguage,
  type Language,
  type TextDirection,
} from './language.ts'

export interface LanguageState {
  language: Language
  /** BCP 47 tag for Intl formatters. */
  locale: string
  dir: TextDirection
  setLanguage: (language: Language) => void
}

export function useLanguage(): LanguageState {
  const language = useSyncExternalStore(subscribeToLanguage, getLanguage)
  return { language, locale: LOCALES[language], dir: DIRECTIONS[language], setLanguage }
}
