import type { Company } from '../../../companies/index.ts'
import styles from './ContractDocument.module.css'

interface ContractPageFooterProps {
  company: Company | undefined
  /** Object URL of the company's footer image, or null for the text fallback. */
  image: string | null
  onImageSettled: (src: string) => void
}

/** Bottom of every printed page: the company's footer image, or its address and numbers. */
export function ContractPageFooter({ company, image, onImageSettled }: ContractPageFooterProps) {
  return (
    <footer className={styles.pageFooter}>
      {image ? (
        <img
          className={styles.edgeImage}
          src={image}
          alt=""
          onLoad={() => onImageSettled(image)}
          onError={() => onImageSettled(image)}
        />
      ) : (
        <div className={styles.footerFallback}>
          {company ? (
            <span>
              {company.address} – {company.city} | <bdi dir="ltr">{company.phoneNumber}</bdi> |{' '}
              <bdi>{company.registrationNumber}</bdi>
            </span>
          ) : (
            '—'
          )}
        </div>
      )}
    </footer>
  )
}
