import type { PlacedBrick } from '../model/types'
import type { PhysicsPartDef as PartDef } from './catalog'
import type { PartCatalog } from './catalog'
import type { BrickFootprint } from '../physics/placement'

export interface Cell {
  x: number
  z: number
}

export interface FootprintRect {
  xLo: number
  xHi: number
  zLo: number
  zHi: number
}

export function getFootprintRect(
  brick: PlacedBrick,
  def: PartDef,
): FootprintRect {
  const [W, L] =
    brick.rot % 2 === 0 ? [def.width, def.length] : [def.length, def.width]
  const xLo = brick.x + 0.5 * (brick.offset?.x ?? 0)
  const zLo = brick.z + 0.5 * (brick.offset?.z ?? 0)
  return { xLo, xHi: xLo + W, zLo, zHi: zLo + L }
}

export function rectsOverlap(a: FootprintRect, b: FootprintRect): boolean {
  return a.xLo < b.xHi && a.xHi > b.xLo && a.zLo < b.zHi && a.zHi > b.zLo
}

/**
 * Returns the half-stud cells (X, Z) occupied by a placed brick.
 * Each stud spans 2x2 half-stud cells.
 * Rotations 1 and 3 swap width and length.
 */
export function getOccupiedHalfStudCells(
  brick: PlacedBrick,
  def: PartDef,
): Cell[] {
  const [W, L] =
    brick.rot % 2 === 0 ? [def.width, def.length] : [def.length, def.width]
  const cells: Cell[] = []
  const startX = 2 * brick.x + (brick.offset?.x ?? 0)
  const startZ = 2 * brick.z + (brick.offset?.z ?? 0)

  for (let hx = 0; hx < 2 * W; hx++) {
    for (let hz = 0; hz < 2 * L; hz++) {
      cells.push({ x: startX + hx, z: startZ + hz })
    }
  }
  return cells
}

/**
 * Returns the stud cells (X, Z) occupied by a placed brick.
 * Rotations 1 and 3 swap width and length (90° / 270° turns about Y).
 */
export function getOccupiedCells(brick: PlacedBrick, def: PartDef): Cell[] {
  const cells: Cell[] = []
  forEachOccupiedCell(brick, def, (cell) => {
    cells.push(cell)
  })
  return cells
}

export function forEachOccupiedCell(
  brick: PlacedBrick,
  def: PartDef,
  visit: (cell: Cell) => void,
): void {
  const [W, L] =
    brick.rot % 2 === 0 ? [def.width, def.length] : [def.length, def.width]
  for (let dx = 0; dx < W; dx++) {
    for (let dz = 0; dz < L; dz++) {
      visit({ x: brick.x + dx, z: brick.z + dz })
    }
  }
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
    offset: brick.offset,
  }
}
