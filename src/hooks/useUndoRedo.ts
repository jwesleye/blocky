import { useEffect } from 'react'
import { useBuildStore } from '@/state/store'

function isTextEntry(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA'
}

export function useUndoRedo(): void {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (!event.ctrlKey && !event.metaKey) return
      // Don't hijack the browser's native undo while the user is editing text.
      if (isTextEntry(event.target)) return
      const key = event.key.toLowerCase()
      if (key === 'z') {
        event.preventDefault()
        useBuildStore.temporal.getState().undo()
      } else if (key === 'y') {
        event.preventDefault()
        useBuildStore.temporal.getState().redo()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
}
