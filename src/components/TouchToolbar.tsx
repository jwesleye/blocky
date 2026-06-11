import { RotateCcw, Trash2 } from 'lucide-react'
import { useCursorStore } from '@/state/cursor'
import { useBuildStore } from '@/state/store'

export function TouchToolbar() {
  const rotateCursor = useCursorStore((s) => s.rotateCursor)
  const hoveredBrickId = useCursorStore((s) => s.hoveredBrickId)
  const deleteBrick = useBuildStore((s) => s.deleteBrick)

  return (
    <div className="touch-toolbar" data-testid="touch-toolbar">
      <button
        type="button"
        aria-label="Rotate cursor"
        data-testid="touch-rotate"
        className="touch-toolbar__btn"
        onClick={rotateCursor}
      >
        <RotateCcw size={24} />
      </button>
      <button
        type="button"
        aria-label="Delete brick"
        data-testid="touch-delete"
        className="touch-toolbar__btn touch-toolbar__btn--danger"
        disabled={!hoveredBrickId}
        onClick={() => {
          if (hoveredBrickId) deleteBrick(hoveredBrickId)
        }}
      >
        <Trash2 size={24} />
      </button>
    </div>
  )
}
