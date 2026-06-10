import type { PlacedBrick } from '@/domain/model/types'
import { CATALOG_BY_ID, type PartCatalog } from '@/domain/parts/catalog'
import { STUD_PITCH_MM, PLATE_HEIGHT_MM } from '@/domain/grid'

export interface SceneTransform {
  position: [number, number, number]
  size: [number, number, number]
}

export function brickToSceneTransform(
  brick: PlacedBrick,
  catalog: PartCatalog = CATALOG_BY_ID,
): SceneTransform {
  const def = catalog[brick.partId]
  if (!def) {
    throw new Error(`unknown partId "${brick.partId}"`)
  }

  // Rotations 1 and 3 (90° / 270°) swap the footprint's width and length.
  const [widthStuds, lengthStuds] =
    brick.rot % 2 === 0 ? [def.width, def.length] : [def.length, def.width]

  const heightPlates = def.height

  const width = widthStuds * STUD_PITCH_MM
  const length = lengthStuds * STUD_PITCH_MM
  const height = heightPlates * PLATE_HEIGHT_MM

  const offsetX = (brick.offset?.x ?? 0) * 0.5 * STUD_PITCH_MM
  const offsetZ = (brick.offset?.z ?? 0) * 0.5 * STUD_PITCH_MM

  return {
    position: [
      brick.x * STUD_PITCH_MM + offsetX + width / 2,
      brick.y * PLATE_HEIGHT_MM + height / 2,
      brick.z * STUD_PITCH_MM + offsetZ + length / 2,
    ],
    size: [width, height, length],
  }
}
