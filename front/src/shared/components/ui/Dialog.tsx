import { useEffect, useRef, type ReactNode } from 'react'

interface DialogProps {
  open: boolean
  title: string
  children: ReactNode
  onClose: () => void
}

export function Dialog({ open, title, children, onClose }: DialogProps) {
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
    <dialog ref={dialog} className="dialog" onCancel={onClose} aria-labelledby="dialog-title">
      <h2 id="dialog-title">{title}</h2>
      {open && children}
    </dialog>
  )
}
