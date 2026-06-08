import { connectedComponents } from 'graphology-components'

import type { PlacedBrick } from '../model/types'
import { PART_CATALOG } from '../parts/catalog'
import { getOccupiedCells } from '../parts/footprint'
import { computeCoM, computeSupportFootprint, isBalanced } from './balance'
import { buildConnectionGraph } from './graph'

export interface ShearRegion {
  shear: PlacedBrick[]
  remainder: PlacedBrick[]
}

interface Direction2D {
  x: number
  z: number
}

function getOverhangDirection(component: PlacedBrick[]): Direction2D {
  const footprint = computeSupportFootprint(component, PART_CATALOG)
  if (footprint.length === 0) return { x: 0, z: 0 }

  const com = computeCoM(component, PART_CATALOG)
  const xs = footprint.map(([x]) => x)
  const zs = footprint.map(([, z]) => z)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minZ = Math.min(...zs)
  const maxZ = Math.max(...zs)

  const candidates: Array<{ magnitude: number; direction: Direction2D }> = []
  if (com.x < minX)
    candidates.push({ magnitude: minX - com.x, direction: { x: -1, z: 0 } })
  if (com.x > maxX)
    candidates.push({ magnitude: com.x - maxX, direction: { x: 1, z: 0 } })
  if (com.z < minZ)
    candidates.push({ magnitude: minZ - com.z, direction: { x: 0, z: -1 } })
  if (com.z > maxZ)
    candidates.push({ magnitude: com.z - maxZ, direction: { x: 0, z: 1 } })

  candidates.sort((a, b) => b.magnitude - a.magnitude)
  return candidates[0]?.direction ?? { x: 0, z: 0 }
}

function getOutermostProjection(
  brick: PlacedBrick,
  direction: Direction2D,
): number {
  const def = PART_CATALOG[brick.partId]
  if (!def) return Number.NEGATIVE_INFINITY

  const projections = getOccupiedCells(brick, def).map(
    ({ x, z }) => (x + 0.5) * direction.x + (z + 0.5) * direction.z,
  )

  return projections.length > 0
    ? Math.max(...projections)
    : Number.NEGATIVE_INFINITY
}

function isConnected(bricks: PlacedBrick[]): boolean {
  if (bricks.length <= 1) return true
  return (
    connectedComponents(buildConnectionGraph(bricks, PART_CATALOG)).length === 1
  )
}

function sortByShearPriority(component: PlacedBrick[]): PlacedBrick[] {
  const direction = getOverhangDirection(component)

  return [...component].sort((a, b) => {
    const groundedDelta = Number(a.y === 0) - Number(b.y === 0)
    if (groundedDelta !== 0) return groundedDelta

    const projectionDelta =
      getOutermostProjection(b, direction) -
      getOutermostProjection(a, direction)
    if (projectionDelta !== 0) return projectionDelta

    const heightDelta = b.y - a.y
    if (heightDelta !== 0) return heightDelta

    return a.id.localeCompare(b.id)
  })
}

export function findShearRegion(
  component: PlacedBrick[],
  options: { minimal?: boolean } = {},
): ShearRegion {
  if (component.length === 0 || isBalanced(component, PART_CATALOG)) {
    return { shear: [], remainder: [...component] }
  }

  const candidates = sortByShearPriority(component)
  const shearIds = new Set<string>()

  for (const brick of candidates) {
    shearIds.add(brick.id)

    const remainder = component.filter(
      (candidate) => !shearIds.has(candidate.id),
    )
    if (remainder.length === 0) continue
    if (!isConnected(remainder)) continue

    // If we're in minimal mode, any valid shear that leaves the remainder connected is enough
    if (options.minimal) {
      return {
        shear: candidates.filter((candidate) => shearIds.has(candidate.id)),
        remainder,
      }
    }

    // Otherwise, expand until the remainder is also balanced (Phase 1 behavior)
    if (!isBalanced(remainder, PART_CATALOG)) continue

    return {
      shear: candidates.filter((candidate) => shearIds.has(candidate.id)),
      remainder,
    }
  }

  return {
    shear: [...candidates],
    remainder: [],
  }
}

/**
 * Recursively shears unstable connected components until the remaining build is stable.
 *
 * Termination Guarantee:
 * Every iteration of the loop either terminates or identifies at least one shear cut
 * from an unbalanced connected component. Each shear cut removes at least one brick
 * from the active remainder. Since the number of bricks is finite, the process
 * must terminate.
 */
export function recursiveShear(bricks: PlacedBrick[]): {
  collapsed: PlacedBrick[][]
  stable: PlacedBrick[]
} {
  let currentBricks = [...bricks]
  const collapsed: PlacedBrick[][] = []

   
  while (true) {
    if (currentBricks.length === 0) break

    const graph = buildConnectionGraph(currentBricks, PART_CATALOG)
    const components = connectedComponents(graph).map((ids) => {
      const idSet = new Set(ids)
      return currentBricks.filter((b) => idSet.has(b.id))
    })

    const iterationShears: PlacedBrick[] = []
    const nextBricks: PlacedBrick[] = []

    for (const component of components) {
      const { shear, remainder } = findShearRegion(component, { minimal: true })
      if (shear.length > 0) {
        iterationShears.push(...shear)
      }
      nextBricks.push(...remainder)
    }

    if (iterationShears.length === 0) break

    collapsed.push(iterationShears)
    currentBricks = nextBricks
  }

  return {
    collapsed,
    stable: currentBricks,
  }
}
