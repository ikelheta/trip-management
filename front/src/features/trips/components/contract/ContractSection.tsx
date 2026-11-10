import type { Company } from '../../../companies/index.ts'
import type { Trip } from '../../types/trip.ts'
import { formatContractDate, formatContractTime } from '../../utils/contractFormat.ts'
import { CONTRACT_TEXT } from '../../utils/contractText.ts'
import { ContractBarcode } from './ContractBarcode.tsx'
import styles from './ContractDocument.module.css'

interface ContractSectionProps {
  trip: Trip
  company: Company | undefined
  qrImage: string | null
  onBarcodeReady: () => void
  onImageSettled: (src: string) => void
}

/** Page 1: the land transport contract. */
export function ContractSection({ trip, company, qrImage, onBarcodeReady, onImageSettled }: ContractSectionProps) {
  const date = formatContractDate(trip.date)
  const columns = CONTRACT_TEXT.tripColumns

  return (
    <section>
      <h1 className={styles.title}>{CONTRACT_TEXT.title}</h1>
      {/* RTL: the QR code sits on the right, the barcode on the left (as in the template). */}
      <div className={styles.codes}>
        {qrImage ? (
          <img
            className={styles.qr}
            src={qrImage}
            alt=""
            onLoad={() => onImageSettled(qrImage)}
            onError={() => onImageSettled(qrImage)}
          />
        ) : (
          <span />
        )}
        <ContractBarcode className={styles.barcode} value={trip.contractNumber} onReady={onBarcodeReady} />
      </div>
      <p className={styles.line}>
        {CONTRACT_TEXT.date} <bdi dir="ltr">{date}</bdi>
      </p>
      <p className={styles.paragraph}>{CONTRACT_TEXT.legal}</p>
      <p className={styles.line}>
        {CONTRACT_TEXT.firstParty} {company?.name ?? ''}
      </p>
      <p className={styles.line}>
        {CONTRACT_TEXT.registration} <bdi>{company?.registrationNumber ?? ''}</bdi>
      </p>
      <p className={styles.line}>{CONTRACT_TEXT.secondParty}</p>
      <p className={styles.paragraph}>{CONTRACT_TEXT.agreement}</p>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>{columns.origin}</th>
            <th>{columns.destination}</th>
            <th>{columns.tripNumber}</th>
            <th>{columns.time}</th>
            <th>{columns.date}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{trip.origin ?? ''}</td>
            <td>{trip.destination ?? ''}</td>
            <td>
              <bdi dir="ltr">{trip.contractNumber}</bdi>
            </td>
            <td>
              <bdi dir="ltr">{formatContractTime(trip.time)}</bdi>
            </td>
            <td>
              <bdi dir="ltr">{date}</bdi>
            </td>
          </tr>
        </tbody>
      </table>
      <p className={styles.paragraph}>{CONTRACT_TEXT.agreement}</p>
      <h2 className={styles.heading}>{CONTRACT_TEXT.manifestHeading}</h2>
    </section>
  )
}
