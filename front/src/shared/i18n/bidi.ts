// Unicode isolates for data inside a dictionary sentence (the text equivalent of `<span className="ltr">`).
// Without them a name, plate or email next to Arabic punctuation can reorder ("(Ui User (ui@x.com؟").
// Use them only in the `ar` dictionary so English text stays byte-for-byte the same.

const FIRST_STRONG_ISOLATE = '\u2068'
const LEFT_TO_RIGHT_ISOLATE = '\u2066'
const POP_DIRECTIONAL_ISOLATE = '\u2069'

/** Data of unknown direction (names typed by users): its own first letter decides. */
export function isolate(text: string): string {
  return `${FIRST_STRONG_ISOLATE}${text}${POP_DIRECTIONAL_ISOLATE}`
}

/** Always left-to-right data: emails, plates, identity numbers, codes. */
export function ltr(text: string): string {
  return `${LEFT_TO_RIGHT_ISOLATE}${text}${POP_DIRECTIONAL_ISOLATE}`
}
