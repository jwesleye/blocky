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
 * Rebuilds a mirrored brick with normalized half-stud offsets. A `{ x: 0, z: 0 }`
 * offset is omitted entirely so mirrored classic bricks match the no-offset
 * representation used elsewhere in the model.
 */
function withOffset(
  brick: PlacedBrick,
  offsetX: number,
  offsetZ: number,
): PlacedBrick {
  if (offsetX === 0 && offsetZ === 0) {
    const rest = { ...brick }
    delete rest.offset
    return rest
  }
  return {
    ...brick,
    offset: { x: offsetX as 0 | 1, z: offsetZ as 0 | 1 },
  }
}

/**
 * Mirrors a set of bricks across the selection's bounding-box midline.
 * axis='x' reflects X coordinates; axis='z' reflects Z coordinates.
 * Returns a new array with the same ids; validity is enforced separately.
 *
 * All bounds and reflections are computed in half-stud coordinates so that
 * half-stud-offset (jumper) bricks reflect about their true physical footprint
 * rather than their full-stud origin. The mirrored half-stud origin is then
 * split back into an integer position plus a `0 | 1` offset component.
 */
export function mirrorBricks(
  selection: Iterable<PlacedBrick>,
  axis: 'x' | 'z',
  catalog: PartCatalog,
): PlacedBrick[] {
  const bricks = Array.from(selection)
  if (bricks.length === 0) return []

  let minHX = Infinity,
    maxHX = -Infinity
  let minHZ = Infinity,
    maxHZ = -Infinity

  for (const brick of bricks) {
    const def = catalog[brick.partId]
    if (!def) continue
    for (const cell of getOccupiedHalfStudCells(brick, def)) {
      if (cell.x < minHX) minHX = cell.x
      if (cell.x > maxHX) maxHX = cell.x
      if (cell.z < minHZ) minHZ = cell.z
      if (cell.z > maxHZ) maxHZ = cell.z
    }
  }

  return bricks.map((brick) => {
    const def = catalog[brick.partId]
    if (!def) return brick
    const W = brick.rot % 2 === 0 ? def.width : def.length
    const L = brick.rot % 2 === 0 ? def.length : def.width

    if (axis === 'x') {
      // Reflect the half-stud footprint [origin .. origin + 2W - 1] about the
      // selection's half-stud X span, then recover position + offset.
      const originHalf = 2 * brick.x + (brick.offset?.x ?? 0)
      const newOriginHalf = minHX + maxHX - (originHalf + 2 * W - 1)
      const newX = Math.floor(newOriginHalf / 2)
      const newOffsetX = newOriginHalf - 2 * newX
      const newRot = ((4 - brick.rot) % 4) as 0 | 1 | 2 | 3
      return withOffset(
        { ...brick, x: newX, rot: newRot },
        newOffsetX,
        brick.offset?.z ?? 0,
      )
    } else {
      const originHalf = 2 * brick.z + (brick.offset?.z ?? 0)
      const newOriginHalf = minHZ + maxHZ - (originHalf + 2 * L - 1)
      const newZ = Math.floor(newOriginHalf / 2)
      const newOffsetZ = newOriginHalf - 2 * newZ
      const newRot = ((2 - brick.rot + 4) % 4) as 0 | 1 | 2 | 3
      return withOffset(
        { ...brick, z: newZ, rot: newRot },
        brick.offset?.x ?? 0,
        newOffsetZ,
      )
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
