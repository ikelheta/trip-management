import type { ReactNode } from 'react'
import { translateApiMessage } from '../../i18n/apiMessages.ts'
import { useLanguage } from '../../i18n/useLanguage.ts'

interface FieldProps {
  label: string
  htmlFor: string
  /** A client message (already in the current language) or an API message (translated here). */
  error?: string
  hint?: string
  children: ReactNode
}

export function Field({ label, htmlFor, error, hint, children }: FieldProps) {
  const { language } = useLanguage()
  return (
    <div className="field">
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {hint && !error && <p className="field-hint">{hint}</p>}
      {error && (
        <p className="field-error" role="alert">
          {translateApiMessage(error, language)}
        </p>
      )}
    </div>
  )
}
