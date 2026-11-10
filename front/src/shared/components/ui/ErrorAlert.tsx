import { translateApiMessage } from '../../i18n/apiMessages.ts'
import { commonMessages } from '../../i18n/commonMessages.ts'
import { useMessages } from '../../i18n/messages.ts'
import { useLanguage } from '../../i18n/useLanguage.ts'
import { ApiError } from '../../services/httpClient.ts'

interface ErrorAlertProps {
  error: unknown
  title?: string
}

export function ErrorAlert({ error, title }: ErrorAlertProps) {
  const { language } = useLanguage()
  const m = useMessages(commonMessages)
  if (!error) {
    return null
  }
  // Translated at display time, so the text follows a language switch.
  const messages =
    error instanceof ApiError
      ? error.messages.map((message) => translateApiMessage(message, language))
      : [m.errors.generic]
  return (
    <div className="alert alert-error" role="alert">
      {title && <strong>{title}</strong>}
      {messages.length === 1 ? (
        <p>{messages[0]}</p>
      ) : (
        <ul>
          {messages.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
