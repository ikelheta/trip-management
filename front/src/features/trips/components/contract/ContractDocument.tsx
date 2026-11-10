import '@fontsource/cairo/400.css'
import '@fontsource/cairo/700.css'
import type { Company } from '../../../companies/index.ts'
import type { Driver } from '../../../drivers/index.ts'
import type { Vehicle } from '../../../vehicles/index.ts'
import type { Trip } from '../../types/trip.ts'
import { ContractPageFooter } from './ContractPageFooter.tsx'
import { ContractPageHeader } from './ContractPageHeader.tsx'
import { ContractSection } from './ContractSection.tsx'
import styles from './ContractDocument.module.css'
import { InspectionSection } from './InspectionSection.tsx'
import { ManifestSection } from './ManifestSection.tsx'

export interface ContractDocumentProps {
  trip: Trip
  /** undefined when not found (deleted): the fields print empty. */
  company: Company | undefined
  vehicle: Vehicle | undefined
  driver: Driver | undefined
  /** Object URLs of the protected images, or null (no image / failed → fallback). */
  headerImage: string | null
  footerImage: string | null
  qrImage: string | null
  onBarcodeReady: () => void
  onImageSettled: (src: string) => void
}

/**
 * The trip contract as printed (A4, Arabic, RTL in any UI language): contract, passenger manifest,
 * inspection. The company header and footer are fixed elements, so print repeats them on every page;
 * the frame table's <thead> / <tfoot> keep room for them on each page.
 */
export function ContractDocument(props: ContractDocumentProps) {
  const { trip, company, vehicle, driver, headerImage, footerImage, qrImage, onBarcodeReady, onImageSettled } =
    props

  return (
    <article className={styles.document} dir="rtl" lang="ar">
      <ContractPageHeader company={company} image={headerImage} onImageSettled={onImageSettled} />
      <table className={styles.frame} role="presentation">
        <thead>
          <tr>
            <td>
              <div className={styles.headerSpace} />
            </td>
          </tr>
        </thead>
        <tfoot>
          <tr>
            <td>
              <div className={styles.footerSpace} />
            </td>
          </tr>
        </tfoot>
        <tbody>
          <tr>
            <td className={styles.content}>
              <ContractSection
                trip={trip}
                company={company}
                qrImage={qrImage}
                onBarcodeReady={onBarcodeReady}
                onImageSettled={onImageSettled}
              />
              <ManifestSection trip={trip} company={company} vehicle={vehicle} driver={driver} />
              <InspectionSection inspection={trip.inspection} vehicle={vehicle} driver={driver} />
            </td>
          </tr>
        </tbody>
      </table>
      <ContractPageFooter company={company} image={footerImage} onImageSettled={onImageSettled} />
    </article>
  )
}
