import React from 'react'
import { useBuildStore } from '../state/store'

export const BrickCount: React.FC = () => {
  const brickCount = useBuildStore((state) => Object.keys(state.bricks).length)

  return (
    <div className="brick-count" aria-live="polite">
      Bricks: {brickCount}
    </div>
  )
}
