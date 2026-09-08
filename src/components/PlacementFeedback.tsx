import { isUnsupportedHingeGrammar } from '@/domain/physics/hinge'
import type { PlacementInvalidReason } from '@/domain/physics/validity'
import { useBuildStore } from '@/state/store'

export function PlacementFeedback({
  reason,
}: {
  reason: PlacementInvalidReason | null
}) {
  const hasElevatedHinges = useBuildStore((state) =>
    Object.values(state.bricks).some(
      (brick) => isUnsupportedHingeGrammar(brick) && brick.y > 0,
    ),
  )
  return (
    <div
      role="status"
      aria-live="polite"
      className="placement-feedback"
      data-testid="placement-feedback"
    >
      {reason === 'unsupported-hinge' && (
        <p>
          Hinge stacking is not supported yet. Place hinge bricks on the
          baseplate, and use regular bricks for stacking.
        </p>
      )}
      {hasElevatedHinges && (
        <p>
          This build contains unsupported elevated hinges. Adding or deleting a
          brick will make these hinges collapse. Use Undo collapse to restore
          them.
        </p>
      )}
    </div>
  )
}
