// Explicit fields rather than dateStyle 'medium': the same English output, but Arabic gets month
// names ("31 أكتوبر 2026") instead of the all-digit "31/10/2026".
const DATE_OPTIONS: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }
const DATE_TIME_OPTIONS: Intl.DateTimeFormatOptions = { ...DATE_OPTIONS, hour: 'numeric', minute: '2-digit' }

const dateTimeFormats = new Map<string, Intl.DateTimeFormat>()
const dateFormats = new Map<string, Intl.DateTimeFormat>()

// One formatter per locale: creating Intl formatters is slow and tables call these per row.
function cachedFormat(
  cache: Map<string, Intl.DateTimeFormat>,
  locale: string,
  options: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
  let format = cache.get(locale)
  if (!format) {
    format = new Intl.DateTimeFormat(locale, options)
    cache.set(locale, format)
  }
  return format
}

/** ISO timestamp ("2026-10-31T18:44:48.228Z") in the user's timezone. `locale` from `useLanguage()`. */
export function formatDateTime(iso: string, locale: string): string {
  return cachedFormat(dateTimeFormats, locale, DATE_TIME_OPTIONS).format(new Date(iso))
}

/** Date part of an ISO timestamp, in the user's timezone (e.g. "31 Oct 2026"). */
export function formatTimestampDate(iso: string, locale: string): string {
  return cachedFormat(dateFormats, locale, DATE_OPTIONS).format(new Date(iso))
}

/** "YYYY-MM-DD" wall-clock date (no timezone shift). `locale` from `useLanguage()`. */
export function formatDate(date: string, locale: string): string {
  const [year, month, day] = date.split('-').map(Number)
  return cachedFormat(dateFormats, locale, DATE_OPTIONS).format(new Date(year, month - 1, day))
}

/** "HH:mm:ss" -> "HH:mm". */
export function formatTime(time: string): string {
  return time.slice(0, 5)
}
