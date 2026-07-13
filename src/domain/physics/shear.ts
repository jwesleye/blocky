import type { PlacedBrick } from '../model/types'
import { CATALOG_BY_ID } from '../parts/catalog'
import { forEachOccupiedCell } from '../parts/footprint'
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
  const footprint = computeSupportFootprint(component, CATALOG_BY_ID)
  if (footprint.length === 0) return { x: 0, z: 0 }

  const com = computeCoM(component, CATALOG_BY_ID)
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
  const def = CATALOG_BY_ID[brick.partId]
  if (!def) return Number.NEGATIVE_INFINITY

  const ox = 0.5 * (brick.offset?.x ?? 0)
  const oz = 0.5 * (brick.offset?.z ?? 0)
  let projection = Number.NEGATIVE_INFINITY

  forEachOccupiedCell(brick, def, ({ x, z }) => {
    projection = Math.max(
      projection,
      (x + 0.5 + ox) * direction.x + (z + 0.5 + oz) * direction.z,
    )
  })

  return projection
}

function isConnectedRemainder(
  graph: ReturnType<typeof buildConnectionGraph>,
  remainderIds: Set<string>,
): boolean {
  if (remainderIds.size <= 1) return true

  const [start] = remainderIds
  const visited = new Set<string>([start])
  const stack = [start]

  while (stack.length > 0) {
    const id = stack.pop()
    if (!id) continue

    for (const neighbor of graph.neighbors(id)) {
      if (!remainderIds.has(neighbor) || visited.has(neighbor)) continue
      visited.add(neighbor)
      stack.push(neighbor)
    }
  }

  return visited.size === remainderIds.size
}

function sortByShearPriority(component: PlacedBrick[]): PlacedBrick[] {
  const direction = getOverhangDirection(component)
  const projections = new Map(
    component.map((brick) => [
      brick.id,
      getOutermostProjection(brick, direction),
    ]),
  )

  return [...component].sort((a, b) => {
    const groundedDelta = Number(a.y === 0) - Number(b.y === 0)
    if (groundedDelta !== 0) return groundedDelta

    const projectionDelta =
      (projections.get(b.id) ?? Number.NEGATIVE_INFINITY) -
      (projections.get(a.id) ?? Number.NEGATIVE_INFINITY)
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
  if (component.length === 0 || isBalanced(component, CATALOG_BY_ID)) {
    return { shear: [], remainder: [...component] }
  }

  const candidates = sortByShearPriority(component)
  const shearIds = new Set<string>()
  const graph = buildConnectionGraph(component, CATALOG_BY_ID)

  const remainderIds = new Set(component.map((c) => c.id))

  for (const brick of candidates) {
    shearIds.add(brick.id)
    remainderIds.delete(brick.id)

    if (remainderIds.size === 0) continue
    if (!isConnectedRemainder(graph, remainderIds)) continue

    // In minimal mode, any valid shear that leaves the remainder connected is enough.
    if (options.minimal) {
      return {
        shear: candidates.filter((candidate) => shearIds.has(candidate.id)),
        remainder: component.filter((c) => remainderIds.has(c.id)),
      }
    }

    const remainder = component.filter((c) => remainderIds.has(c.id))

    // Otherwise, expand until the remainder is also balanced.
    if (!isBalanced(remainder, CATALOG_BY_ID)) continue

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
