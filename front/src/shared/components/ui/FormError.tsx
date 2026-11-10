import { translateApiMessage } from '../../i18n/apiMessages.ts'
import { useLanguage } from '../../i18n/useLanguage.ts'

interface FormErrorProps {
  /** One or more API messages, one per line (from `applyServerErrors`); translated here. */
  message?: string
}

export function FormError({ message }: FormErrorProps) {
  const { language } = useLanguage()
  if (!message) {
    return null
  }
  return (
    <div className="alert alert-error" role="alert">
      {message.split('\n').map((line) => (
        <p key={line}>{translateApiMessage(line, language)}</p>
      ))}
    </div>
  )
}
