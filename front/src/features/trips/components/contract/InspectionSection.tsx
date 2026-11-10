import type { Driver } from '../../../drivers/index.ts'
import type { Vehicle } from '../../../vehicles/index.ts'
import type { TripInspection } from '../../types/trip.ts'
import { formatInspectionMoment, sectionOrdinal } from '../../utils/contractFormat.ts'
import { CONTRACT_TEXT } from '../../utils/contractText.ts'
import styles from './ContractDocument.module.css'

interface InspectionSectionProps {
  inspection: TripInspection | null
  vehicle: Vehicle | undefined
  driver: Driver | undefined
}

const TICK = '✓'
const BOX = '☐'

/** Last page: the pre-trip inspection, one table per indicator. */
export function InspectionSection({ inspection, vehicle, driver }: InspectionSectionProps) {
  const text = CONTRACT_TEXT.inspection
  const moment = inspection ? formatInspectionMoment(inspection.inspectedAt) : null

  return (
    <section className={styles.inspection}>
      <table className={styles.table}>
        <tbody>
          <tr>
            <th>{text.time}</th>
            <td>
              <bdi dir="ltr">{moment?.time ?? ''}</bdi>
            </td>
            <th>{text.date}</th>
            <td>
              <bdi dir="ltr">{moment?.date ?? ''}</bdi>
            </td>
            <th>{text.plate}</th>
            <td>
              <bdi>{vehicle?.plateNumber ?? ''}</bdi>
            </td>
          </tr>
          <tr>
            <th>{text.driver}</th>
            <td colSpan={5}>{driver?.name ?? ''}</td>
          </tr>
        </tbody>
      </table>

      {inspection === null ? (
        <p className={styles.line}>{text.none}</p>
      ) : (
        inspection.indicators.map((indicator, index) => {
          const ordinal = sectionOrdinal(index + 1)
          return (
            <div key={indicator.indicatorId} className={styles.inspectionGroup}>
              <div className={styles.inspectionHeading}>
                <span>
                  {ordinal.ar} : {indicator.nameAr}
                </span>
                <span className={styles.english}>
                  {ordinal.en}: {indicator.nameEn}
                </span>
              </div>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>{text.item}</th>
                    <th>{text.sound}</th>
                    <th>{text.unsound}</th>
                    <th>{text.notes}</th>
                  </tr>
                </thead>
                <tbody>
                  {indicator.checks.map((check) => (
                    <tr key={check.checkId}>
                      <td className={styles.itemCell}>
                        {check.nameAr} - <bdi>{check.nameEn}</bdi>
                      </td>
                      <td>{check.status ? TICK : BOX}</td>
                      <td>{check.status ? BOX : TICK}</td>
                      <td>{check.note ?? ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        })
      )}
    </section>
  )
}
