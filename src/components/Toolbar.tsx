import { useStore } from 'zustand'
import { type BuildStoreWithTemporal, useBuildStore } from '../state/store'
import { useCursorStore } from '../state/cursor'
import {
  Camera,
  FilePlus2,
  Redo2,
  RotateCcw,
  Share2,
  Trash2,
  Undo2,
  ArrowRightToLine,
  FlipHorizontal2,
  Link2,
  MoveVertical,
} from 'lucide-react'
import { KeyboardHelp } from '@/components/KeyboardHelp'
import { ThemeToggle } from '@/components/ThemeToggle'

interface ToolbarProps {
  onNew?: () => void
  onClear?: () => void
  onRotate?: () => void
  onResetView?: () => void
}

export const Toolbar: React.FC<ToolbarProps> = ({
  onNew = () => undefined,
  onClear = () => undefined,
  onRotate = () => undefined,
  onResetView = () => undefined,
}) => {
  const undo = useBuildStore((state) => state.undo)
  const redo = useBuildStore((state) => state.redo)
  const undoLabel = useBuildStore(
    (state) => state.lastCollapse?.label ?? 'Undo',
  )
  const temporal = (useBuildStore as unknown as BuildStoreWithTemporal).temporal
  const toggleOffset = useCursorStore((state) => state.toggleOffset)
  const isOffset = useCursorStore((state) => state.offset !== undefined)
  const cycleMount = useCursorStore((state) => state.cycleMount)
  const isMount = useCursorStore((state) => state.mount !== undefined)
  const toggleHinge = useCursorStore((state) => state.toggleHinge)
  const hinge = useCursorStore((state) => state.hinge)
  const pastStatesLength = useStore(
    temporal,
    (state) => state.pastStates.length,
  )
  const futureStatesLength = useStore(
    temporal,
    (state) => state.futureStates.length,
  )

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
        aria-label="Toggle Half-Stud Offset"
        data-testid="toggle-half-stud"
        onClick={toggleOffset}
        className={isOffset ? 'active' : ''}
      >
        <ArrowRightToLine size={20} />
      </button>
      <button
        type="button"
        aria-label="Cycle SNOT Mount"
        data-testid="cycle-mount"
        onClick={cycleMount}
        className={isMount ? 'active' : ''}
      >
        <FlipHorizontal2 size={20} />
      </button>
      <button
        type="button"
        aria-label="Toggle X-Axis Hinge"
        data-testid="toggle-hinge-x"
        onClick={() => toggleHinge('x')}
        className={hinge === 'x' ? 'active' : ''}
      >
        <Link2 size={20} />
      </button>
      <button
        type="button"
        aria-label="Toggle Z-Axis Hinge"
        data-testid="toggle-hinge-z"
        onClick={() => toggleHinge('z')}
        className={hinge === 'z' ? 'active' : ''}
      >
        <MoveVertical size={20} />
      </button>
      <button
        type="button"
        aria-label={undoLabel}
        title={undoLabel}
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
      <ThemeToggle />
      <KeyboardHelp />
    </div>
  )
}
