import { useMemo } from 'react'
import { brickToSceneTransform } from './brickTransform'
import { PART_CATALOG } from '@/domain/parts/catalog'
import { isPlacementValid } from '@/domain/physics/placement'
import { useBuildStore } from '@/state/store'
import type { PlacedBrick } from '@/domain/model/types'

export interface GhostBrickProps {
  candidate: PlacedBrick | null
}

export function GhostBrick({ candidate }: GhostBrickProps) {
  const bricks = useBuildStore((state) => state.bricks)

  const isValid = useMemo(() => {
    if (!candidate) return false
    return isPlacementValid(candidate, Object.values(bricks), PART_CATALOG)
  }, [candidate, bricks])

  if (!candidate) return null

  const transform = brickToSceneTransform(candidate)
  const color = isValid ? '#4caf50' : '#f44336' // green if valid, red if invalid

  return (
    <mesh position={transform.position}>
      <boxGeometry args={transform.size} />
      <meshStandardMaterial
        color={color}
        transparent
        opacity={0.6}
        depthWrite={false}
      />
    </mesh>
  )
}
