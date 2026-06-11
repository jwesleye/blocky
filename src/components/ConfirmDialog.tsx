import { useEffect, useId, type ReactNode } from 'react'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message?: string
  children?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  hideConfirm?: boolean
  onConfirm: () => void
  onCancel: () => void
}

const getFocusableElements = (root: HTMLElement) =>
  Array.from(
    root.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => !element.hasAttribute('disabled'))

export const ConfirmDialog = ({
  open,
  title,
  message,
  children,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  hideConfirm = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) => {
  const titleId = useId()

  useEffect(() => {
    if (!open) return

    const dialog = document.querySelector<HTMLElement>(
      `[aria-labelledby="${titleId}"]`,
    )
    const focusable = dialog ? getFocusableElements(dialog) : []
    focusable[0]?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCancel()
        return
      }

      if (event.key !== 'Tab' || !dialog) return

      const elements = getFocusableElements(dialog)
      if (elements.length === 0) return

      const first = elements[0]
      const last = elements[elements.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onCancel, open, titleId])

  if (!open) return null

  return (
    <div className="dialog-overlay" role="presentation">
      <div
        aria-labelledby={titleId}
        aria-modal="true"
        className="dialog"
        role="dialog"
      >
        <h2 id={titleId}>{title}</h2>
        {message && <p>{message}</p>}
        {children}
        <div className="dialog__actions">
          <button type="button" className="hud-button" onClick={onCancel}>
            {cancelLabel}
          </button>
          {!hideConfirm && (
            <button
              type="button"
              className="hud-button hud-button--danger"
              onClick={onConfirm}
            >
              {confirmLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
