import { useRef, useState } from 'react'
import { useMessages } from '../../../shared/i18n/messages.ts'
import { useLanguage } from '../../../shared/i18n/useLanguage.ts'
import { tripsMessages, type TripsMessages } from '../i18n.ts'
import { MAX_PASSENGERS, type PassengerFormValues } from '../types/tripSchemas.ts'
import {
  downloadPassengerTemplate,
  EXCEL_MIME_TYPE,
  MAX_IMPORT_FILE_SIZE_MB,
  PASSENGER_COLUMNS,
  readPassengerFile,
  type ImportProblem,
  type PassengerColumn,
} from '../utils/passengerExcel.ts'
import styles from './TripSections.module.css'

interface PassengerImportProps {
  /** Passengers already in the form. */
  existingCount: number
  onImport: (passengers: PassengerFormValues[]) => void
}

// Data, not text: the message follows a language switch.
type Outcome =
  | { kind: 'added'; count: number; fileName: string; identityNumbersLost: number }
  | { kind: 'problem'; problem: ImportProblem }
  | { kind: 'templateFailed' }

function describeProblem(
  problem: ImportProblem,
  m: TripsMessages,
  listColumns: (columns: PassengerColumn[]) => string,
): string {
  const texts = m.passengers.import.problems
  switch (problem.kind) {
    case 'wrongType':
      return texts.wrongType
    case 'unreadable':
      return texts.unreadable
    case 'noRows':
      return texts.noRows
    case 'tooLarge':
      return texts.tooLarge(MAX_IMPORT_FILE_SIZE_MB)
    case 'missingColumns':
      return texts.missingColumns(listColumns(problem.columns))
    case 'tooMany':
      return texts.tooMany(problem.inFile, problem.available, MAX_PASSENGERS)
  }
}

export function PassengerImport({ existingCount, onImport }: PassengerImportProps) {
  const m = useMessages(tripsMessages)
  const { locale } = useLanguage()
  const input = useRef<HTMLInputElement>(null)
  const [reading, setReading] = useState(false)
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const labels: Record<PassengerColumn, string> = {
    name: m.passengers.name,
    identityNumber: m.passengers.identityNumber,
    docType: m.passengers.docType,
    nationality: m.passengers.nationality,
  }
  const listFormat = new Intl.ListFormat(locale, { type: 'conjunction' })
  const listColumns = (columns: PassengerColumn[]): string => listFormat.format(columns.map((column) => labels[column]))

  async function handleFile(file: File | undefined): Promise<void> {
    setOutcome(null)
    if (!file) {
      return
    }
    setReading(true)
    const result = await readPassengerFile(file, existingCount)
    setReading(false)
    if (result.ok) {
      onImport(result.passengers)
      setOutcome({
        kind: 'added',
        count: result.passengers.length,
        fileName: file.name,
        identityNumbersLost: result.unreadableIdentityNumbers,
      })
    } else {
      setOutcome({ kind: 'problem', problem: result.problem })
    }
    // Allow importing the same file again (e.g. after fixing it in Excel).
    if (input.current) {
      input.current.value = ''
    }
  }

  async function handleTemplate(): Promise<void> {
    setOutcome(null)
    try {
      await downloadPassengerTemplate(labels, m.passengers.import.templateFileName)
    } catch {
      setOutcome({ kind: 'templateFailed' })
    }
  }

  return (
    <div className="stack">
      <div className={styles.importActions}>
        <input
          ref={input}
          type="file"
          accept={`.xlsx,${EXCEL_MIME_TYPE}`}
          hidden
          onChange={(event) => void handleFile(event.target.files?.[0])}
        />
        <button
          type="button"
          className="btn btn-secondary btn-small"
          disabled={reading || existingCount >= MAX_PASSENGERS}
          onClick={() => input.current?.click()}
        >
          {reading ? m.passengers.import.reading : m.passengers.import.button}
        </button>
        <button type="button" className="btn btn-secondary btn-small" onClick={() => void handleTemplate()}>
          {m.passengers.import.template}
        </button>
      </div>
      <p className="field-hint">{m.passengers.import.hint(listColumns(PASSENGER_COLUMNS))}</p>
      {outcome?.kind === 'added' && (
        <div className="alert alert-success" role="status">
          <p>{m.passengers.import.added(outcome.count, outcome.fileName)}</p>
          {outcome.identityNumbersLost > 0 && (
            <p>{m.passengers.import.identityNumbersLost(outcome.identityNumbersLost)}</p>
          )}
        </div>
      )}
      {outcome?.kind === 'problem' && (
        <div className="alert alert-error" role="alert">
          <p>{describeProblem(outcome.problem, m, listColumns)}</p>
        </div>
      )}
      {outcome?.kind === 'templateFailed' && (
        <div className="alert alert-error" role="alert">
          <p>{m.passengers.import.templateFailed}</p>
        </div>
      )}
    </div>
  )
}
