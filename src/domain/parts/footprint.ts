import type { PlacedBrick } from '../model/types'
import type { PartDef } from './types'

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
    brick.rot % 2 === 0
      ? [def.widthX, def.widthZ]
      : [def.widthZ, def.widthX]
  const cells: Cell[] = []
  for (let dx = 0; dx < W; dx++) {
    for (let dz = 0; dz < L; dz++) {
      cells.push({ x: brick.x + dx, z: brick.z + dz })
    }
  }
  return cells
}
