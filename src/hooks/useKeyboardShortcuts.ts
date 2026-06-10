import { useEffect } from 'react'

interface ShortcutHandlers {
  undo?: () => void
  redo?: () => void
  rotate?: () => void
  resetView?: () => void
}

interface ShortcutOptions {
  enabled?: boolean
}

const isEditableTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false

  return (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.isContentEditable
  )
}

export const useKeyboardShortcuts = (
  handlers: ShortcutHandlers,
  { enabled = true }: ShortcutOptions = {},
) => {
  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return

      const key = event.key.toLowerCase()
      let handler: (() => void) | undefined

      if ((event.ctrlKey || event.metaKey) && !event.altKey) {
        if (key === 'z' && event.shiftKey) {
          handler = handlers.redo
        } else if (key === 'z') {
          handler = handlers.undo
        } else if (key === 'y' && !event.shiftKey) {
          handler = handlers.redo
        }
      } else if (!event.ctrlKey && !event.metaKey && !event.altKey) {
        if (key === 'r' && !event.shiftKey) {
          handler = handlers.rotate
        } else if (event.key === 'Home' && !event.shiftKey) {
          handler = handlers.resetView
        }
      }

      if (!handler) return

      event.preventDefault()
      handler()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [enabled, handlers])
}
