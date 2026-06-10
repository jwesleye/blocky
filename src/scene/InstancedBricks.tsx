import type { ThreeEvent } from '@react-three/fiber'
import { Instance, Instances } from '@react-three/drei'
import { useMemo } from 'react'

import {
  groupBricksForInstancing,
  type PartDimsResolver,
  type RenderBrick,
} from './instancing'

export interface InstancedBricksProps {
  bricks: readonly RenderBrick[]
  getDims: PartDimsResolver
  getColor: (color: string) => string
  onInstancePointerMove?: (
    brick: RenderBrick,
    event: ThreeEvent<MouseEvent>,
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
  onInstancePointerMove,
  onInstanceContextMenu,
}: InstancedBricksProps) {
  const { buckets, sourceBricksByKey } = useMemo(() => {
    const grouped = groupBricksForInstancing(bricks, getDims)
    const groupedSourceBricks = new Map<string, RenderBrick[]>()

    for (const brick of bricks) {
      const key = `${brick.partId}::${brick.color}`
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
          <boxGeometry args={bucket.size} />
          <meshStandardMaterial color={getColor(bucket.color)} />
          {bucket.instances.map((instance, index) => {
            const brick = sourceBricksByKey.get(bucket.key)?.[index]
            if (!brick) return null

            return (
              <Instance
                key={brick.id ?? index}
                position={instance.position}
                rotation={[0, instance.rotationY, 0]}
                onPointerMove={(event) => onInstancePointerMove?.(brick, event)}
                onContextMenu={(event) =>
                  onInstanceContextMenu?.(brick, event)
                }
              />
            )
          })}
        </Instances>
      ))}
    </>
  )
}
