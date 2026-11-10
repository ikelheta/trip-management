import { useMessages } from '../../../shared/i18n/messages.ts'
import { useFileObjectUrl } from '../hooks/useFileObjectUrl.ts'
import { filesMessages } from '../i18n.ts'
import styles from './AuthImage.module.css'

interface AuthImageProps {
  /** A file url from the API, or null for "no image". */
  url: string | null
  alt: string
  className?: string
}

export function AuthImage({ url, alt, className = '' }: AuthImageProps) {
  const { objectUrl, isLoading, error } = useFileObjectUrl(url)
  const m = useMessages(filesMessages)

  if (!url) {
    return <div className={`${styles.placeholder} ${className}`}>{m.image.none}</div>
  }
  if (error) {
    return (
      <div className={`${styles.placeholder} ${className}`} role="alert">
        {m.image.unavailable}
      </div>
    )
  }
  if (isLoading || !objectUrl) {
    return (
      <div className={`${styles.placeholder} ${className}`} role="status">
        {m.image.loading}
      </div>
    )
  }
  return <img src={objectUrl} alt={alt} className={`${styles.image} ${className}`} />
}
