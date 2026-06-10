import React, { useMemo, useState } from 'react'
import { Toolbar } from './Toolbar'
import { BrickCount } from './BrickCount'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { useCameraStore } from '@/state/cameraStore'
import { useCursorStore } from '@/state/cursor'
import { useBuildStore } from '@/state/store'

type PendingAction = 'new' | 'clear' | null

export const HUD: React.FC = () => {
  const [pendingAction, setPendingAction] = useState<PendingAction>(null)
  const clearBricks = useBuildStore((state) => state.clearBricks)
  const undo = useBuildStore((state) => state.undo)
  const redo = useBuildStore((state) => state.redo)
  const rotateCursor = useCursorStore((state) => state.rotateCursor)
  const resetCamera = useCameraStore((state) => state.resetCamera)

  const shortcutHandlers = useMemo(
    () => ({
      undo,
      redo,
      rotate: rotateCursor,
      resetView: resetCamera,
    }),
    [redo, resetCamera, rotateCursor, undo],
  )

  useKeyboardShortcuts(shortcutHandlers, { enabled: pendingAction === null })

  const confirmDialog =
    pendingAction === 'new'
      ? {
          title: 'New build',
          message: 'Start a new build and remove every brick?',
          confirmLabel: 'Start new',
        }
      : {
          title: 'Clear build',
          message: 'Remove every brick from the current build?',
          confirmLabel: 'Clear build',
        }

  const handleConfirm = () => {
    clearBricks()
    setPendingAction(null)
  }

  return (
    <div className="hud">
      <div className="hud__top">
        <BrickCount />
      </div>
      <div className="hud__bottom">
        <Toolbar
          onNew={() => setPendingAction('new')}
          onClear={() => setPendingAction('clear')}
          onRotate={rotateCursor}
          onResetView={resetCamera}
        />
      </div>
      <ConfirmDialog
        open={pendingAction !== null}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel={confirmDialog.confirmLabel}
        onConfirm={handleConfirm}
        onCancel={() => setPendingAction(null)}
      />
    </div>
  )
}
