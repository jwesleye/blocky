import type { PlacedBrick } from '../model/types'
import type { PartCatalog } from '../parts/catalog'
import { toBrickFootprint, getOccupiedCells } from '../parts/footprint'
import { groundedIds } from './placement'
import { isWithinBaseplate } from '../grid'

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
    
    const cells = getOccupiedCells(brick, def)
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

  return collisions
}

/**
 * Validity gate for a group placement.
 * No collision + all cells within BASEPLATE_BOUNDS + every brick grounded.
 */
export function canPlaceGroup(
  movedSelection: Iterable<PlacedBrick>,
  otherBricks: Iterable<PlacedBrick>,
  catalog: PartCatalog,
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
    const def = catalog[brick.partId]
    if (!def) continue
    const cells = getOccupiedCells(brick, def)
    for (const cell of cells) {
      if (!isWithinBaseplate(cell)) {
        return false
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
