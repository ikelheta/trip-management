import { useMessages } from '../../../shared/i18n/messages.ts'
import { useLanguage } from '../../../shared/i18n/useLanguage.ts'
import { formatDateTime } from '../../../shared/utils/formatDate.ts'
import { tripsMessages } from '../i18n.ts'
import type { TripInspection } from '../types/trip.ts'
import { InspectionBadge } from './InspectionBadge.tsx'
import { InspectionName } from './InspectionName.tsx'
import styles from './TripSections.module.css'

interface TripInspectionViewProps {
  inspection: TripInspection | null
}

export function TripInspectionView({ inspection }: TripInspectionViewProps) {
  const { locale } = useLanguage()
  const m = useMessages(tripsMessages)
  return (
    <section className="card stack">
      <div className={styles.sectionHeader}>
        <h2>{m.inspection.title}</h2>
        <InspectionBadge inspection={inspection} />
      </div>
      {!inspection && <p className="muted">{m.inspection.createdBeforeInspections}</p>}
      {inspection && (
        <p className="muted">{m.inspection.inspected(formatDateTime(inspection.inspectedAt, locale))}</p>
      )}
      {inspection?.indicators.map((indicator) => (
        <div key={indicator.indicatorId} className="stack">
          <div className={styles.sectionHeader}>
            <h3>
              <InspectionName item={indicator} />
            </h3>
            <span className={`badge ${indicator.passed ? 'badge-success' : 'badge-danger'}`}>
              {indicator.passed ? m.outcome.passed : m.outcome.failed}
            </span>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{m.inspection.columns.check}</th>
                  <th>{m.inspection.columns.result}</th>
                  <th>{m.inspection.columns.note}</th>
                </tr>
              </thead>
              <tbody>
                {indicator.checks.map((check) => (
                  <tr key={check.checkId}>
                    <td>
                      <InspectionName item={check} />
                    </td>
                    <td>
                      <span className={`badge ${check.status ? 'badge-success' : 'badge-danger'}`}>
                        {check.status ? m.results.good : m.results.faulty}
                      </span>
                    </td>
                    <td>{check.note ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </section>
  )
}
