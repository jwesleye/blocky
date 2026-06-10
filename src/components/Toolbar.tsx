import React from 'react'
import { type BuildStoreWithTemporal, useBuildStore } from '../state/store'
import type { BuildState } from '@/domain/model/types'
import type { TemporalState } from 'zundo'
import { RotateCcw, Undo2, Redo2, Share2, Camera } from 'lucide-react'
import { useStore as useZustandSubscribe } from 'zustand'

export const Toolbar: React.FC = () => {
  const undo = useBuildStore((state) => state.undo)
  const redo = useBuildStore((state) => state.redo)
  const temporal = (useBuildStore as unknown as BuildStoreWithTemporal).temporal

  const pastStatesLength = useZustandSubscribe(
    temporal,
    (state: TemporalState<Partial<BuildState>>) => state.pastStates.length,
  )
  const futureStatesLength = useZustandSubscribe(
    temporal,
    (state: TemporalState<Partial<BuildState>>) => state.futureStates.length,
  )

  return (
    <div className="toolbar" role="toolbar" aria-label="Main Toolbar">
      <button aria-label="Rotate" disabled>
        <RotateCcw size={20} />
      </button>
      <button
        aria-label="Undo"
        onClick={undo}
        disabled={pastStatesLength === 0}
      >
        <Undo2 size={20} />
      </button>
      <button
        aria-label="Redo"
        onClick={redo}
        disabled={futureStatesLength === 0}
      >
        <Redo2 size={20} />
      </button>
      <button aria-label="Save/Share" disabled>
        <Share2 size={20} />
      </button>
      <button aria-label="Reset View" disabled>
        <Camera size={20} />
      </button>
    </div>
  )
}
