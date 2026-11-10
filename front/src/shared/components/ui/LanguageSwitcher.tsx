import { commonMessages } from '../../i18n/commonMessages.ts'
import { LANGUAGE_NAMES } from '../../i18n/language.ts'
import { useMessages } from '../../i18n/messages.ts'
import { useLanguage } from '../../i18n/useLanguage.ts'

interface LanguageSwitcherProps {
  className?: string
}

/** Two languages: one button showing the other language's own name. */
export function LanguageSwitcher({ className = '' }: LanguageSwitcherProps) {
  const { language, setLanguage } = useLanguage()
  const m = useMessages(commonMessages)
  const next = language === 'en' ? 'ar' : 'en'
  return (
    <button
      type="button"
      className={`btn btn-secondary btn-small ${className}`}
      lang={next}
      title={m.language.change}
      onClick={() => setLanguage(next)}
    >
      {LANGUAGE_NAMES[next]}
    </button>
  )
}
