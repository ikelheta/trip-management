export const LANGUAGES = ['en', 'ar'] as const
export type Language = (typeof LANGUAGES)[number]
export type TextDirection = 'ltr' | 'rtl'

const STORAGE_KEY = 'trip-management.language'

/** English keeps the browser's English region (en-US, en-GB, …) so dates read as they did before. */
function englishLocale(): string {
  const browser = navigator.language
  return browser.toLowerCase().startsWith('en') ? browser : 'en-GB'
}

/** Arabic keeps the Gregorian calendar and Latin digits so dates match the date inputs, plates and IDs. */
export const LOCALES: Record<Language, string> = {
  en: englishLocale(),
  ar: 'ar-SA-u-ca-gregory-nu-latn',
}

export const DIRECTIONS: Record<Language, TextDirection> = { en: 'ltr', ar: 'rtl' }

/** Each language's own name, shown on the switcher. */
export const LANGUAGE_NAMES: Record<Language, string> = { en: 'English', ar: 'العربية' }

const APP_TITLES: Record<Language, string> = { en: 'Trip Management', ar: 'إدارة الرحلات' }

const listeners = new Set<() => void>()

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value)
}

/** The remembered choice; null when there is none, it is not a known language, or storage is blocked. */
export function readStoredLanguage(): Language | null {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return isLanguage(stored) ? stored : null
  } catch {
    return null
  }
}

/** First visit: Arabic for an Arabic browser, otherwise English. */
export function detectLanguage(): Language {
  return navigator.language.toLowerCase().startsWith('ar') ? 'ar' : 'en'
}

let current: Language = readStoredLanguage() ?? detectLanguage()

function notify(): void {
  for (const listener of listeners) {
    listener()
  }
}

function applyToDocument(language: Language): void {
  document.documentElement.lang = language
  document.documentElement.dir = DIRECTIONS[language]
  document.title = APP_TITLES[language]
}

/** The useSyncExternalStore snapshot (a string, so it is stable). */
export function getLanguage(): Language {
  return current
}

export function setLanguage(language: Language): void {
  if (language === current) {
    return
  }
  current = language
  try {
    window.localStorage.setItem(STORAGE_KEY, language)
  } catch {
    // Storage blocked: the choice still applies to this page.
  }
  applyToDocument(language)
  notify()
}

/** For useSyncExternalStore. */
export function subscribeToLanguage(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Call once before rendering: sets <html lang dir> and the title, and follows other tabs. */
export function initLanguage(): void {
  applyToDocument(current)
  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY && event.key !== null) {
      return
    }
    const stored = readStoredLanguage()
    if (stored && stored !== current) {
      current = stored
      applyToDocument(stored)
      notify()
    }
  })
}
