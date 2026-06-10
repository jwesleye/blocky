import type { PlacedBrick } from '../model/types'
import type { PhysicsPartDef as PartDef } from './catalog'
import type { PartCatalog } from './catalog'
import type { BrickFootprint } from '../physics/placement'

export interface Cell {
  x: number
  z: number
}

/**
 * Returns the stud cells (X, Z) occupied by a placed brick.
 * Rotations 1 and 3 swap width and length (90° / 270° turns about Y).
 */
export function getOccupiedCells(brick: PlacedBrick, def: PartDef): Cell[] {
  const [W, L] =
    brick.rot % 2 === 0 ? [def.width, def.length] : [def.length, def.width]
  const cells: Cell[] = []
  for (let dx = 0; dx < W; dx++) {
    for (let dz = 0; dz < L; dz++) {
      cells.push({ x: brick.x + dx, z: brick.z + dz })
    }
  }
  return cells
}

export function toBrickFootprint(
  brick: PlacedBrick,
  catalog: PartCatalog,
): BrickFootprint {
  const def = catalog[brick.partId]
  if (!def) {
    throw new Error(`unknown partId "${brick.partId}"`)
  }

  return {
    id: brick.id,
    bottomY: brick.y,
    height: def.height,
    cells: getOccupiedCells(brick, def),
    hasTopStuds: def.hasTopStuds,
  }
}
