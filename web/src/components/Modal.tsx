import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'
import { X } from 'lucide-react'

/**
 * A native <dialog>: focus is trapped and Escape closes it. Focus returns to whatever
 * opened it. Clicking the backdrop closes it unless `busy` (a transaction is running).
 */
export function Modal({
  open,
  onClose,
  title,
  busy = false,
  wide = false,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  busy?: boolean
  wide?: boolean
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const opener = useRef<Element | null>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      opener.current = document.activeElement
      dialog.showModal()
    }
    if (!open && dialog.open) {
      dialog.close()
      if (opener.current instanceof HTMLElement) opener.current.focus()
    }
  }, [open])

  return (
    <dialog
      ref={ref}
      className={`dialog ${wide ? 'dialog--wide' : ''}`}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault()
        if (!busy) onClose()
      }}
      onClick={(event) => {
        if (event.target === ref.current && !busy) onClose()
      }}
    >
      {open && (
        <div className="dialog__body">
          <div className="dialog__head">
            <h2 id={titleId}>{title}</h2>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="Close" disabled={busy}>
              <X size={20} aria-hidden="true" />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  )
}
