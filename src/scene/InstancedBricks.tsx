import type { ThreeEvent } from '@react-three/fiber'
import { Instance, Instances } from '@react-three/drei'
import { useMemo } from 'react'

import { getPartGeometry } from './parts/geometries'
import {
  groupBricksForInstancing,
  PLATE_SCENE_UNIT,
  STUD_SCENE_UNIT,
  type PartDimsResolver,
  type RenderBrick,
} from './instancing'

export interface InstancedBricksProps {
  bricks: readonly RenderBrick[]
  getDims: PartDimsResolver
  getColor: (color: string) => string
  onInstanceClick?: (brick: RenderBrick, event: ThreeEvent<MouseEvent>) => void
  onInstancePointerMove?: (
    brick: RenderBrick,
    event: ThreeEvent<PointerEvent>,
  ) => void
  onInstancePointerDown?: (
    brick: RenderBrick,
    event: ThreeEvent<PointerEvent>,
  ) => void
  onInstanceContextMenu?: (
    brick: RenderBrick,
    event: ThreeEvent<MouseEvent>,
  ) => void
}

export function InstancedBricks({
  bricks,
  getDims,
  getColor,
  onInstanceClick,
  onInstancePointerMove,
  onInstancePointerDown,
  onInstanceContextMenu,
}: InstancedBricksProps) {
  const { buckets, sourceBricksByKey } = useMemo(() => {
    const grouped = groupBricksForInstancing(bricks, getDims)
    const groupedSourceBricks = new Map<string, RenderBrick[]>()

    for (const brick of bricks) {
      const key = `${brick.partType}::${brick.partId}::${brick.color}`
      const bucketBricks = groupedSourceBricks.get(key) ?? []
      bucketBricks.push(brick)
      groupedSourceBricks.set(key, bucketBricks)
    }

    return {
      buckets: grouped,
      sourceBricksByKey: groupedSourceBricks,
    }
  }, [bricks, getDims])

  return (
    <>
      {buckets.map((bucket) => (
        <Instances
          key={bucket.key}
          limit={bucket.instances.length}
          range={bucket.instances.length}
          castShadow
          receiveShadow
        >
          <primitive
            object={getPartGeometry(bucket.partId, {
              w: bucket.size[0] / STUD_SCENE_UNIT,
              h: bucket.size[1] / PLATE_SCENE_UNIT,
              d: bucket.size[2] / STUD_SCENE_UNIT,
            })}
            attach="geometry"
          />
          <meshStandardMaterial color={getColor(bucket.color)} />
          {bucket.instances.map((instance, index) => {
            const brick = sourceBricksByKey.get(bucket.key)?.[index]
            if (!brick) return null

            return (
              <Instance
                key={brick.id ?? index}
                position={instance.position}
                rotation={[0, instance.rotationY, 0]}
                onClick={(event) => onInstanceClick?.(brick, event)}
                onPointerMove={(event) => onInstancePointerMove?.(brick, event)}
                onPointerDown={(event) => onInstancePointerDown?.(brick, event)}
                onContextMenu={(event) => onInstanceContextMenu?.(brick, event)}
              />
            )
          })}
        </Instances>
      ))}
    </>
  )
}
