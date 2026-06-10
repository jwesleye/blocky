import { useEffect, useState } from 'react'
import type { TemporalState } from 'zundo'

import type { BuildState } from '@/domain/model/types'
import { type BuildStoreWithTemporal, useBuildStore } from '../state/store'
import {
  Camera,
  FilePlus2,
  Redo2,
  RotateCcw,
  Share2,
  Trash2,
  Undo2,
} from 'lucide-react'
import { KeyboardHelp } from '@/components/KeyboardHelp'

interface ToolbarProps {
  onNew?: () => void
  onClear?: () => void
  onRotate?: () => void
  onResetView?: () => void
}

type ToolbarTemporalState = TemporalState<Partial<BuildState>> & {
  subscribe?: (listener: () => void) => () => void
}

export const Toolbar: React.FC<ToolbarProps> = ({
  onNew = () => undefined,
  onClear = () => undefined,
  onRotate = () => undefined,
  onResetView = () => undefined,
}) => {
  const undo = useBuildStore((state) => state.undo)
  const redo = useBuildStore((state) => state.redo)
  const temporal = (useBuildStore as unknown as BuildStoreWithTemporal).temporal
  const [, setRefresh] = useState(0)

  useEffect(() => {
    const temporalState = temporal.getState() as ToolbarTemporalState
    const unsubscribe = temporalState.subscribe?.(() => {
      setRefresh((v) => v + 1)
    })
    return () => unsubscribe?.()
  }, [temporal])

  const temporalState = temporal.getState()
  const pastStatesLength = temporalState.pastStates.length
  const futureStatesLength = temporalState.futureStates.length

  return (
    <div className="toolbar" role="toolbar" aria-label="Main Toolbar">
      <button type="button" aria-label="New" onClick={onNew}>
        <FilePlus2 size={20} />
      </button>
      <button type="button" aria-label="Clear" onClick={onClear}>
        <Trash2 size={20} />
      </button>
      <button type="button" aria-label="Rotate" onClick={onRotate}>
        <RotateCcw size={20} />
      </button>
      <button
        type="button"
        aria-label="Undo"
        onClick={undo}
        disabled={pastStatesLength === 0}
      >
        <Undo2 size={20} />
      </button>
      <button
        type="button"
        aria-label="Redo"
        onClick={redo}
        disabled={futureStatesLength === 0}
      >
        <Redo2 size={20} />
      </button>
      <button type="button" aria-label="Save/Share" disabled>
        <Share2 size={20} />
      </button>
      <button type="button" aria-label="Reset View" onClick={onResetView}>
        <Camera size={20} />
      </button>
      <KeyboardHelp />
    </div>
  )
}
