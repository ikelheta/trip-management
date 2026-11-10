// Fixed formats of the printed contract (the template's), independent of the UI language.

/** Inspection times are printed in Saudi time. */
export const CONTRACT_TIME_ZONE = 'Asia/Riyadh'

/** "2026-11-10" → "10-11-2026" */
export function formatContractDate(date: string): string {
  const [year, month, day] = date.split('-')
  return `${day}-${month}-${year}`
}

/** "00:10:00" → "12:10 AM" */
export function formatContractTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number)
  const period = hours < 12 ? 'AM' : 'PM'
  const hour12 = hours % 12 === 0 ? 12 : hours % 12
  return `${String(hour12).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${period}`
}

/** "2026-11-10" → "Tuesday" (English, as in the template). UTC so no time zone can shift the day. */
export function formatContractWeekday(date: string): string {
  return new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: 'UTC' }).format(
    new Date(`${date}T00:00:00Z`),
  )
}

const MOMENT_FORMAT = new Intl.DateTimeFormat('en-GB', {
  timeZone: CONTRACT_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})

/** UTC ISO timestamp → { date: "2026-11-10", time: "00:09:00" } in CONTRACT_TIME_ZONE. */
export function formatInspectionMoment(iso: string): { date: string; time: string } {
  const parts: Partial<Record<Intl.DateTimeFormatPartTypes, string>> = {}
  for (const part of MOMENT_FORMAT.formatToParts(new Date(iso))) {
    parts[part.type] = part.value
  }
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}:${parts.second}`,
  }
}

const ORDINALS_AR = ['أولاً', 'ثانياً', 'ثالثاً', 'رابعاً', 'خامساً', 'سادساً', 'سابعاً', 'ثامناً', 'تاسعاً', 'عاشراً']
const ORDINALS_EN = ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth', 'Ninth', 'Tenth']

/** 1 → { ar: "أولاً", en: "First" } … 10; after that the number itself. */
export function sectionOrdinal(position: number): { ar: string; en: string } {
  return {
    ar: ORDINALS_AR[position - 1] ?? String(position),
    en: ORDINALS_EN[position - 1] ?? String(position),
  }
}
