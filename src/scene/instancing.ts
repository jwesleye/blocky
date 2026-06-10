import type { PlacedBrick } from '@/domain/model/types'

export const STUD_SCENE_UNIT = 1
export const PLATE_SCENE_UNIT = 1

export interface PartDims {
  w: number
  d: number
  h: number
}

export type RenderBrick = Pick<
  PlacedBrick,
  'partId' | 'color' | 'x' | 'y' | 'z' | 'rot'
> &
  Partial<Pick<PlacedBrick, 'id'>>

export type PartDimsResolver = (partId: string) => PartDims

export interface BrickInstance {
  position: [number, number, number]
  rotationY: number
}

export interface InstanceBucket {
  key: string
  partId: string
  color: string
  size: [number, number, number]
  instances: BrickInstance[]
}

export function brickInstanceTransform(
  brick: RenderBrick,
  dims: PartDims,
): BrickInstance {
  const [effectiveW, effectiveD] =
    brick.rot % 2 === 0 ? [dims.w, dims.d] : [dims.d, dims.w]

  return {
    position: [
      (brick.x + effectiveW / 2) * STUD_SCENE_UNIT,
      (brick.y + dims.h / 2) * PLATE_SCENE_UNIT,
      (brick.z + effectiveD / 2) * STUD_SCENE_UNIT,
    ],
    rotationY: brick.rot * (Math.PI / 2),
  }
}

export function groupBricksForInstancing(
  bricks: readonly RenderBrick[],
  getDims: PartDimsResolver,
): InstanceBucket[] {
  const buckets = new Map<string, InstanceBucket>()

  for (const brick of bricks) {
    const dims = getDims(brick.partId)
    const key = `${brick.partId}::${brick.color}`
    const bucket =
      buckets.get(key) ??
      (() => {
        const nextBucket: InstanceBucket = {
          key,
          partId: brick.partId,
          color: brick.color,
          size: [
            dims.w * STUD_SCENE_UNIT,
            dims.h * PLATE_SCENE_UNIT,
            dims.d * STUD_SCENE_UNIT,
          ],
          instances: [],
        }
        buckets.set(key, nextBucket)
        return nextBucket
      })()

    bucket.instances.push(brickInstanceTransform(brick, dims))
  }

  return Array.from(buckets.values()).sort((a, b) => a.key.localeCompare(b.key))
}
