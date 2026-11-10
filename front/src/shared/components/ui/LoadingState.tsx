import { commonMessages } from '../../i18n/commonMessages.ts'
import { useMessages } from '../../i18n/messages.ts'

interface LoadingStateProps {
  /** Defaults to "Loading…" in the current language. */
  label?: string
}

export function LoadingState({ label }: LoadingStateProps) {
  const m = useMessages(commonMessages)
  return (
    <p className="muted" role="status">
      {label ?? m.states.loading}
    </p>
  )
}
