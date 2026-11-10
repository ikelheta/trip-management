import { DIRECTIONS, type Language, type TextDirection } from './language.ts'

export interface BilingualName {
  nameAr: string
  nameEn: string
}

/** The name in the current language (countries, inspection indicators and checks). */
export function localizedName(item: BilingualName, language: Language): string {
  return language === 'ar' ? item.nameAr : item.nameEn
}

/** "Primary — secondary", current language first. */
export function bilingualLabel(item: BilingualName, language: Language): string {
  return language === 'ar' ? `${item.nameAr} — ${item.nameEn}` : `${item.nameEn} — ${item.nameAr}`
}

export interface SecondaryName {
  text: string
  lang: Language
  dir: TextDirection
}

/**
 * The other language's name, shown as muted secondary text after `localizedName`.
 * Spread `lang` / `dir` onto its element: `<span className="muted" lang={…} dir={…}>`.
 */
export function secondaryName(item: BilingualName, language: Language): SecondaryName {
  const other: Language = language === 'ar' ? 'en' : 'ar'
  return { text: localizedName(item, other), lang: other, dir: DIRECTIONS[other] }
}
