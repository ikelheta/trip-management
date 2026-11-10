import type { Company } from '../../../companies/index.ts'
import styles from './ContractDocument.module.css'

interface ContractPageHeaderProps {
  company: Company | undefined
  /** Object URL of the company's header image, or null for the text fallback. */
  image: string | null
  onImageSettled: (src: string) => void
}

/** Top of every printed page: the company's header image, or its name. */
export function ContractPageHeader({ company, image, onImageSettled }: ContractPageHeaderProps) {
  return (
    <header className={styles.pageHeader}>
      {image ? (
        <img
          className={styles.edgeImage}
          src={image}
          alt={company?.name ?? ''}
          onLoad={() => onImageSettled(image)}
          onError={() => onImageSettled(image)}
        />
      ) : (
        <div className={styles.headerFallback}>{company?.name ?? '—'}</div>
      )}
    </header>
  )
}
