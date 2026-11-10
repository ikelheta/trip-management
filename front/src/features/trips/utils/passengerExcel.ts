import { MAX_PASSENGERS, type PassengerFormValues } from '../types/tripSchemas.ts'

export type PassengerColumn = keyof PassengerFormValues

/** Column order in the template. */
export const PASSENGER_COLUMNS: PassengerColumn[] = ['name', 'identityNumber', 'docType', 'nationality']

export const EXCEL_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
export const MAX_IMPORT_FILE_SIZE_MB = 5

const BYTES_PER_MB = 1024 * 1024
const COLUMN_WIDTHS = [32, 20, 18, 24]

// Header text after normaliseHeader() → column. English and Arabic, so a template in either language imports.
const HEADER_ALIASES = new Map<string, PassengerColumn>([
  ['name', 'name'],
  ['fullname', 'name'],
  ['passengername', 'name'],
  ['الاسم', 'name'],
  ['اسمالراكب', 'name'],
  ['identitynumber', 'identityNumber'],
  ['idnumber', 'identityNumber'],
  ['رقمالهوية', 'identityNumber'],
  ['doctype', 'docType'],
  ['documenttype', 'docType'],
  ['نوعالوثيقة', 'docType'],
  ['nationality', 'nationality'],
  ['الجنسية', 'nationality'],
])

type Cell = string | number | boolean | Date | null

/** Why a file was rejected. Kept as data, not text, so the message follows a language switch. */
export type ImportProblem =
  | { kind: 'wrongType' }
  | { kind: 'tooLarge' }
  | { kind: 'unreadable' }
  | { kind: 'noRows' }
  | { kind: 'missingColumns'; columns: PassengerColumn[] }
  | { kind: 'tooMany'; inFile: number; available: number }

export type ImportResult =
  | { ok: true; passengers: PassengerFormValues[]; unreadableIdentityNumbers: number }
  | { ok: false; problem: ImportProblem }

// `unknown` in: the library's cell type describes dates as a constructor, so it is narrowed here instead of cast.
function toCell(value: unknown): Cell {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value
  }
  return value instanceof Date ? value : null
}

function normaliseHeader(cell: Cell): string {
  return String(cell ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '')
}

function cellToText(cell: Cell): string {
  if (cell === null) {
    return ''
  }
  if (cell instanceof Date) {
    return cell.toISOString().slice(0, 10)
  }
  return String(cell).trim()
}

function isExcelFile(file: File): boolean {
  // Some browsers report an empty type, so the extension decides as well.
  return file.type === EXCEL_MIME_TYPE || file.name.toLowerCase().endsWith('.xlsx')
}

/**
 * Reads passengers from the first sheet of an .xlsx file. The first row is the header row.
 * `existingCount`: passengers already in the form (the total may not exceed MAX_PASSENGERS).
 */
export async function readPassengerFile(file: File, existingCount: number): Promise<ImportResult> {
  if (!isExcelFile(file)) {
    return { ok: false, problem: { kind: 'wrongType' } }
  }
  if (file.size > MAX_IMPORT_FILE_SIZE_MB * BYTES_PER_MB) {
    return { ok: false, problem: { kind: 'tooLarge' } }
  }

  let rows: Cell[][]
  try {
    const { readSheet } = await import('read-excel-file/browser')
    rows = (await readSheet(file)).map((row) => row.map(toCell))
  } catch {
    return { ok: false, problem: { kind: 'unreadable' } }
  }

  const [header = [], ...dataRows] = rows
  const columnIndex = new Map<PassengerColumn, number>()
  header.forEach((cell, index) => {
    const column = HEADER_ALIASES.get(normaliseHeader(cell))
    if (column && !columnIndex.has(column)) {
      columnIndex.set(column, index)
    }
  })
  const missing = PASSENGER_COLUMNS.filter((column) => !columnIndex.has(column))
  if (missing.length > 0) {
    return { ok: false, problem: { kind: 'missingColumns', columns: missing } }
  }

  let unreadableIdentityNumbers = 0
  const passengers: PassengerFormValues[] = []
  for (const row of dataRows) {
    const read = (column: PassengerColumn): Cell => row[columnIndex.get(column) ?? -1] ?? null
    const identityCell = read('identityNumber')
    // Above 2^53 Excel's number has already lost digits; leave it empty so the form asks for it.
    const identityLost = typeof identityCell === 'number' && !Number.isSafeInteger(identityCell)
    const passenger: PassengerFormValues = {
      name: cellToText(read('name')),
      identityNumber: identityLost ? '' : cellToText(identityCell),
      docType: cellToText(read('docType')),
      nationality: cellToText(read('nationality')),
    }
    if (Object.values(passenger).every((value) => value === '') && !identityLost) {
      continue
    }
    if (identityLost) {
      unreadableIdentityNumbers += 1
    }
    passengers.push(passenger)
  }

  if (passengers.length === 0) {
    return { ok: false, problem: { kind: 'noRows' } }
  }
  const available = MAX_PASSENGERS - existingCount
  if (passengers.length > available) {
    return { ok: false, problem: { kind: 'tooMany', inFile: passengers.length, available } }
  }
  return { ok: true, passengers, unreadableIdentityNumbers }
}

/** Downloads an empty template; `headers` are the column labels in the current language. */
export async function downloadPassengerTemplate(
  headers: Record<PassengerColumn, string>,
  fileName: string,
): Promise<void> {
  const { default: writeExcelFile } = await import('write-excel-file/browser')
  const headerRow = PASSENGER_COLUMNS.map((column) => ({ value: headers[column], fontWeight: 'bold' as const }))
  // '@' = Text, so Excel keeps leading zeros in identity numbers typed into the template.
  const emptyRow = PASSENGER_COLUMNS.map((column) =>
    column === 'identityNumber' ? { type: String, value: '', format: '@' } : null,
  )
  const dataRows = Array.from({ length: MAX_PASSENGERS }, () => emptyRow)
  await writeExcelFile([headerRow, ...dataRows], {
    columns: COLUMN_WIDTHS.map((width) => ({ width })),
  }).toFile(fileName)
}
