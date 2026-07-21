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

/**
 * Returns the 3D bounding volume for a mounted (SNOT) brick in the half-stud
 * collision grid (inclusive ranges).
 *
 * A mounted brick is rotated 90° around a horizontal axis so its plate height H
 * becomes a lateral X or Z extent (1 plate = 1 stud unit in this grid model)
 * and its footprint width W or depth L becomes its vertical Y extent.
 *
 * 'px'/'nx' — 90° around Z: H → X extent, W → Y extent, L → Z extent
 * 'pz'/'nz' — 90° around X: H → Z extent, L → Y extent, W → X extent
 */
export function getMountedBrickVolumeBounds(
  brick: PlacedBrick,
  def: PartDef,
): {
  xHalfMin: number
  xHalfMax: number
  yMin: number
  yMax: number
  zHalfMin: number
  zHalfMax: number
} {
  const [W, L] =
    brick.rot % 2 === 0 ? [def.width, def.length] : [def.length, def.width]
  const H = def.height
  // 2*(brick.y + H/2) — integer arithmetic avoids floating-point in Y centre.
  const yCenter2 = 2 * brick.y + H

  switch (brick.mount) {
    case 'px':
    case 'nx':
      return {
        xHalfMin: 2 * brick.x + W - H,
        xHalfMax: 2 * brick.x + W + H - 1,
        yMin: Math.ceil((yCenter2 - W) / 2),
        yMax: Math.ceil((yCenter2 + W) / 2) - 1,
        zHalfMin: 2 * brick.z,
        zHalfMax: 2 * brick.z + 2 * L - 1,
      }
    case 'pz':
    case 'nz': {
      const zCenter2 = 2 * brick.z + L
      return {
        xHalfMin: 2 * brick.x,
        xHalfMax: 2 * brick.x + 2 * W - 1,
        yMin: Math.ceil((yCenter2 - L) / 2),
        yMax: Math.ceil((yCenter2 + L) / 2) - 1,
        zHalfMin: zCenter2 - H,
        zHalfMax: zCenter2 + H - 1,
      }
    }
    default:
      return {
        xHalfMin: 2 * brick.x,
        xHalfMax: 2 * brick.x + 2 * W - 1,
        yMin: brick.y,
        yMax: brick.y + H - 1,
        zHalfMin: 2 * brick.z,
        zHalfMax: 2 * brick.z + 2 * L - 1,
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
    mount: brick.mount,
    hinge: brick.hinge,
  }
}
