import { useEffect, useRef, type ReactNode } from 'react'
import { commonMessages } from '../../i18n/commonMessages.ts'
import { useMessages } from '../../i18n/messages.ts'
import { ErrorAlert } from './ErrorAlert.tsx'

interface ConfirmDialogProps {
  open: boolean
  title: string
  children: ReactNode
  /** Defaults to "Delete" in the current language. */
  confirmLabel?: string
  pending?: boolean
  error?: unknown
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  pending = false,
  error,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const m = useMessages(commonMessages)
  const dialog = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const element = dialog.current
    if (!element) {
      return
    }
    if (open && !element.open) {
      element.showModal()
    } else if (!open && element.open) {
      element.close()
    }
  }, [open])

  return (
    <dialog ref={dialog} className="dialog" onCancel={onCancel} aria-labelledby="confirm-dialog-title">
      <h2 id="confirm-dialog-title">{title}</h2>
      <div className="dialog-body">{children}</div>
      <ErrorAlert error={error} />
      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={pending}>
          {m.actions.cancel}
        </button>
        <button type="button" className="btn btn-danger" onClick={onConfirm} disabled={pending}>
          {pending ? m.actions.working : (confirmLabel ?? m.actions.delete)}
        </button>
      </div>
    </dialog>
  )
}
