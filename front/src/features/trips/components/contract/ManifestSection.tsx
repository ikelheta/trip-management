import type { Company } from '../../../companies/index.ts'
import type { Driver } from '../../../drivers/index.ts'
import type { Vehicle } from '../../../vehicles/index.ts'
import type { Trip } from '../../types/trip.ts'
import { formatContractDate, formatContractTime, formatContractWeekday } from '../../utils/contractFormat.ts'
import { CONTRACT_TEXT } from '../../utils/contractText.ts'
import styles from './ContractDocument.module.css'

interface ManifestSectionProps {
  trip: Trip
  company: Company | undefined
  vehicle: Vehicle | undefined
  driver: Driver | undefined
}

/** Page 2 onwards: driver and every passenger. The passenger table's <thead> repeats on each printed page. */
export function ManifestSection({ trip, company, vehicle, driver }: ManifestSectionProps) {
  const text = CONTRACT_TEXT
  const driverColumns = text.driverColumns
  const passengerColumns = text.passengerColumns

  return (
    <section className={styles.manifest}>
      <p className={styles.line}>
        {text.manifest.time} <bdi dir="ltr">{formatContractTime(trip.time)}</bdi>
      </p>
      <div className={styles.row}>
        <span>
          {text.manifest.day} <bdi dir="ltr">{formatContractWeekday(trip.date)}</bdi>
        </span>
        <span>
          {text.manifest.entity} {trip.tripName ?? ''}
        </span>
        <span>
          {text.manifest.date} <bdi dir="ltr">{formatContractDate(trip.date)}</bdi>
        </span>
      </div>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>{driverColumns.identity}</th>
            <th>{driverColumns.name}</th>
            <th>{driverColumns.plate}</th>
            <th>{driverColumns.vehicleType}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <bdi dir="ltr">{driver?.identityId ?? ''}</bdi>
            </td>
            <td>{driver?.name ?? ''}</td>
            <td>
              <bdi>{vehicle?.plateNumber ?? ''}</bdi>
            </td>
            <td>{vehicle?.model ?? ''}</td>
          </tr>
        </tbody>
      </table>

      <h2 className={styles.heading}>{text.guestsHeading}</h2>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.indexCell}>{passengerColumns.index}</th>
            <th>{passengerColumns.name}</th>
            <th>{passengerColumns.docType}</th>
            <th>{passengerColumns.identityNumber}</th>
            <th>{passengerColumns.nationality}</th>
          </tr>
        </thead>
        <tbody>
          {trip.passengers.length === 0 ? (
            <tr>
              <td colSpan={5}>{text.noPassengers}</td>
            </tr>
          ) : (
            trip.passengers.map((passenger, index) => (
              <tr key={passenger.id}>
                <td>{index + 1}</td>
                <td className={styles.itemCell}>{passenger.name}</td>
                <td>
                  <bdi>{passenger.docType}</bdi>
                </td>
                <td>
                  <bdi dir="ltr">{passenger.identityNumber}</bdi>
                </td>
                <td>{passenger.nationality}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <div className={styles.note}>
        <h3 className={styles.noteHeading}>{text.noteHeading}</h3>
        <p className={styles.line}>{text.note}</p>
        <p className={styles.line}>
          {text.inquiries} <bdi dir="ltr">{company?.phoneNumber ?? ''}</bdi>
        </p>
        <p className={styles.line}>{text.bookingNumber}</p>
      </div>
    </section>
  )
}
