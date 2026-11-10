import { commonMessages } from '../../../shared/i18n/commonMessages.ts'
import type { Language } from '../../../shared/i18n/language.ts'
import { localizedName, secondaryName } from '../../../shared/i18n/localizedName.ts'
import { useMessages } from '../../../shared/i18n/messages.ts'
import { useLanguage } from '../../../shared/i18n/useLanguage.ts'
import { inspectionChecklistMessages } from '../i18n.ts'
import type { InspectionCheck, InspectionIndicator } from '../types/inspectionChecklist.ts'
import styles from './IndicatorCard.module.css'

type NameColumn = 'nameEn' | 'nameAr'

// The current language's name column comes first.
const NAME_COLUMNS: Record<Language, NameColumn[]> = {
  en: ['nameEn', 'nameAr'],
  ar: ['nameAr', 'nameEn'],
}

const ARABIC_CELL = { lang: 'ar', dir: 'rtl' } as const

interface IndicatorCardProps {
  indicator: InspectionIndicator
  onEdit: () => void
  onDelete: () => void
  onAddCheck: () => void
  onEditCheck: (check: InspectionCheck) => void
  onDeleteCheck: (check: InspectionCheck) => void
}

export function IndicatorCard({
  indicator,
  onEdit,
  onDelete,
  onAddCheck,
  onEditCheck,
  onDeleteCheck,
}: IndicatorCardProps) {
  const { language } = useLanguage()
  const m = useMessages(inspectionChecklistMessages)
  const common = useMessages(commonMessages)
  const secondary = secondaryName(indicator, language)
  const nameColumns = NAME_COLUMNS[language]

  return (
    <section className="card" aria-labelledby={`indicator-${indicator.id}`}>
      <div className={styles.header}>
        <div>
          <h2 id={`indicator-${indicator.id}`} className={styles.title}>
            {localizedName(indicator, language)}
          </h2>
          <p className="muted" dir={secondary.dir} lang={secondary.lang}>
            {secondary.text}
          </p>
          <span className="badge">{m.card.order(indicator.sortOrder)}</span>
        </div>
        <div className={styles.actions}>
          <button type="button" className="btn btn-primary btn-small" onClick={onAddCheck}>
            {m.card.addCheck}
          </button>
          <button type="button" className="btn btn-secondary btn-small" onClick={onEdit}>
            {common.actions.edit}
          </button>
          <button type="button" className="btn btn-danger btn-small" onClick={onDelete}>
            {common.actions.delete}
          </button>
        </div>
      </div>

      {indicator.checks.length === 0 ? (
        <p className="muted">{m.card.noChecks}</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>{m.card.columns.order}</th>
                {nameColumns.map((column) => (
                  <th key={column}>{m.card.columns[column]}</th>
                ))}
                <th>
                  <span className="visually-hidden">{m.card.columns.actions}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {indicator.checks.map((check) => (
                <tr key={check.id}>
                  <td>{check.sortOrder}</td>
                  {nameColumns.map((column) => (
                    <td key={column} {...(column === 'nameAr' ? ARABIC_CELL : undefined)}>
                      {check[column]}
                    </td>
                  ))}
                  <td>
                    <div className="table-actions">
                      <button
                        type="button"
                        className="btn btn-secondary btn-small"
                        onClick={() => onEditCheck(check)}
                      >
                        {common.actions.edit}
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger btn-small"
                        onClick={() => onDeleteCheck(check)}
                      >
                        {common.actions.delete}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
