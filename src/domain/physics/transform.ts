import type { PlacedBrick } from '../model/types'
import type { PartCatalog } from '../parts/catalog'
import {
  toBrickFootprint,
  getOccupiedCells,
  getOccupiedHalfStudCells,
  getMountedBrickVolumeBounds,
} from '../parts/footprint'
import { groundedIds } from './placement'
import { BASEPLATE_SIZE_STUDS } from '../grid'

function usesUnsupportedMountPlacement(brick: PlacedBrick): boolean {
  return brick.mount !== undefined && brick.offset !== undefined
}

/**
 * Mirrors a set of bricks across the selection's bounding-box midline.
 * axis='x' reflects X coordinates; axis='z' reflects Z coordinates.
 * Returns a new array with the same ids; validity is enforced separately.
 */
export function mirrorBricks(
  selection: Iterable<PlacedBrick>,
  axis: 'x' | 'z',
  catalog: PartCatalog,
): PlacedBrick[] {
  const bricks = Array.from(selection)
  if (bricks.length === 0) return []

  let minX = Infinity,
    maxX = -Infinity
  let minZ = Infinity,
    maxZ = -Infinity

  for (const brick of bricks) {
    const def = catalog[brick.partId]
    if (!def) continue
    for (const cell of getOccupiedCells(brick, def)) {
      if (cell.x < minX) minX = cell.x
      if (cell.x > maxX) maxX = cell.x
      if (cell.z < minZ) minZ = cell.z
      if (cell.z > maxZ) maxZ = cell.z
    }
  }

  return bricks.map((brick) => {
    const def = catalog[brick.partId]
    if (!def) return brick
    const W = brick.rot % 2 === 0 ? def.width : def.length
    const L = brick.rot % 2 === 0 ? def.length : def.width

    if (axis === 'x') {
      const newX = minX + maxX - (brick.x + W - 1)
      const newRot = ((4 - brick.rot) % 4) as 0 | 1 | 2 | 3
      return { ...brick, x: newX, rot: newRot }
    } else {
      const newZ = minZ + maxZ - (brick.z + L - 1)
      const newRot = ((2 - brick.rot + 4) % 4) as 0 | 1 | 2 | 3
      return { ...brick, z: newZ, rot: newRot }
    }
  })
}

/** Translates a brick by a grid delta. */
export function translateBrick(
  brick: PlacedBrick,
  delta: { dx: number; dy: number; dz: number },
): PlacedBrick {
  return {
    ...brick,
    x: brick.x + delta.dx,
    y: brick.y + delta.dy,
    z: brick.z + delta.dz,
  }
}

/**
 * Detects volumetric collisions across a brick set.
 * Returns a set of ids that share any occupied (x,z,y-plate) cell.
 */
export function findCollisions(
  bricks: Iterable<PlacedBrick>,
  catalog: PartCatalog,
): Set<string> {
  const collisions = new Set<string>()
  const occupancy = new Map<string, string>() // key -> brickId

  for (const brick of bricks) {
    const def = catalog[brick.partId]
    if (!def) continue

    if (brick.mount !== undefined) {
      // Mounted bricks are rotated 90°; compute their actual physical volume.
      const { xHalfMin, xHalfMax, yMin, yMax, zHalfMin, zHalfMax } =
        getMountedBrickVolumeBounds(brick, def)
      for (let hx = xHalfMin; hx <= xHalfMax; hx++) {
        for (let hz = zHalfMin; hz <= zHalfMax; hz++) {
          for (let py = yMin; py <= yMax; py++) {
            const key = `${hx}|${hz}|${py}`
            const existingId = occupancy.get(key)
            if (existingId && existingId !== brick.id) {
              collisions.add(existingId)
              collisions.add(brick.id)
            } else {
              occupancy.set(key, brick.id)
            }
          }
        }
      }
    } else {
      const cells = getOccupiedHalfStudCells(brick, def)
      for (const cell of cells) {
        // A brick occupies cells from y to y + height - 1
        for (let dy = 0; dy < def.height; dy++) {
          const key = `${cell.x}|${cell.z}|${brick.y + dy}`
          const existingId = occupancy.get(key)
          if (existingId && existingId !== brick.id) {
            collisions.add(existingId)
            collisions.add(brick.id)
          } else {
            occupancy.set(key, brick.id)
          }
        }
      }
    }
  }

  return collisions
}

/** Returns the ids of bricks whose footprint falls outside a `size`×`size` plate. */
export function bricksOutsideBaseplate(
  bricks: Iterable<PlacedBrick>,
  size: number,
  catalog: PartCatalog,
): string[] {
  const outside: string[] = []
  for (const brick of bricks) {
    const def = catalog[brick.partId]
    if (!def) continue
    if (brick.mount !== undefined) {
      const { xHalfMin, xHalfMax, zHalfMin, zHalfMax } =
        getMountedBrickVolumeBounds(brick, def)
      if (
        xHalfMin < 0 ||
        xHalfMax >= size * 2 ||
        zHalfMin < 0 ||
        zHalfMax >= size * 2
      ) {
        outside.push(brick.id)
      }
    } else {
      const cells = getOccupiedCells(brick, def)
      if (
        cells.some(
          (cell) =>
            cell.x < 0 || cell.x >= size || cell.z < 0 || cell.z >= size,
        )
      ) {
        outside.push(brick.id)
      }
    }
  }
  return outside
}

/**
 * Validity gate for a group placement.
 * No collision + all cells within baseplateSize bounds + every brick grounded.
 */
export function canPlaceGroup(
  movedSelection: Iterable<PlacedBrick>,
  otherBricks: Iterable<PlacedBrick>,
  catalog: PartCatalog,
  baseplateSize: number = BASEPLATE_SIZE_STUDS,
): boolean {
  const moved = Array.from(movedSelection)
  const others = Array.from(otherBricks)
  const all = [...moved, ...others]

  // 1. Collision check
  if (findCollisions(all, catalog).size > 0) {
    return false
  }

  // 2. Bounds check
  for (const brick of moved) {
    if (usesUnsupportedMountPlacement(brick)) {
      return false
    }

    const def = catalog[brick.partId]
    if (!def) continue
    if (brick.mount !== undefined) {
      const { xHalfMin, xHalfMax, zHalfMin, zHalfMax } =
        getMountedBrickVolumeBounds(brick, def)
      if (
        xHalfMin < 0 ||
        xHalfMax >= baseplateSize * 2 ||
        zHalfMin < 0 ||
        zHalfMax >= baseplateSize * 2
      ) {
        return false
      }
    } else {
      const cells = getOccupiedHalfStudCells(brick, def)
      for (const cell of cells) {
        if (
          cell.x < 0 ||
          cell.x >= baseplateSize * 2 ||
          cell.z < 0 ||
          cell.z >= baseplateSize * 2
        ) {
          return false
        }
      }
    }
    // Also check Y bounds (bottom >= 0)
    if (brick.y < 0) {
      return false
    }
  }

  // 3. Grounding check
  const allFootprints = all.map((b) => toBrickFootprint(b, catalog))
  const grounded = groundedIds(allFootprints)

  for (const brick of moved) {
    if (!grounded.has(brick.id)) {
      return false
    }
  }

  return true
}
