import { useState } from 'react'
import { CircleHelp } from 'lucide-react'

import { ConfirmDialog } from '@/components/ConfirmDialog'

const SHORTCUTS = [
  { action: 'Undo', keys: ['Ctrl+Z'] },
  { action: 'Redo', keys: ['Ctrl+Y', 'Ctrl+Shift+Z'] },
  { action: 'Rotate', keys: ['R'] },
  { action: 'Reset View', keys: ['Home'] },
  { action: 'Place', keys: ['P'] },
  { action: 'Paint', keys: ['B'] },
  { action: 'Eyedropper', keys: ['I'] },
]

export const KeyboardHelp = () => {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        className="hud-button"
        aria-label="Keyboard shortcuts"
        title="Keyboard shortcuts"
        onClick={() => setOpen(true)}
      >
        <CircleHelp size={20} />
      </button>
      <ConfirmDialog
        open={open}
        title="Keyboard shortcuts"
        cancelLabel="Close"
        hideConfirm
        onConfirm={() => undefined}
        onCancel={() => setOpen(false)}
      >
        <dl className="shortcut-list">
          {SHORTCUTS.map((shortcut) => (
            <div className="shortcut-list__row" key={shortcut.action}>
              <dt>{shortcut.action}</dt>
              <dd>
                {shortcut.keys.map((key) => (
                  <kbd key={key}>{key}</kbd>
                ))}
              </dd>
            </div>
          ))}
        </dl>
      </ConfirmDialog>
    </>
  )
}
