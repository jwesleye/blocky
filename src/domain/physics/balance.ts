import type Graph from 'graphology'
import { connectedComponents } from 'graphology-components'
import { polygonContains, polygonHull } from 'd3-polygon'
import type { PlacedBrick } from '../model/types'
import type { PartCatalog } from '../parts/catalog'
import { getOccupiedCells } from '../parts/footprint'

export type GridPoint = readonly [x: number, z: number]

export interface BrickPartDefinition {
  id: string
  footprint: readonly GridPoint[]
  height: number
  mass?: number
}

export interface BalanceComponentBrick {
  part: BrickPartDefinition
  position: {
    x: number
    y: number
    z: number
  }
  rotation: 0 | 1 | 2 | 3
}

export interface BalanceResult {
  isBalanced: boolean
  totalMass: number
  centerOfMass: {
    x: number
    y: number
    z: number
  }
  supportContacts: GridPoint[]
  supportFootprint: GridPoint[]
}

export function evaluateComponentBalance(
  bricks: readonly BalanceComponentBrick[],
): BalanceResult {
  if (bricks.length === 0) {
    return {
      isBalanced: false,
      totalMass: 0,
      centerOfMass: { x: 0, y: 0, z: 0 },
      supportContacts: [],
      supportFootprint: [],
    }
  }

  let totalMass = 0
  let weightedX = 0
  let weightedY = 0
  let weightedZ = 0
  const supportContacts = new Map<string, GridPoint>()

  for (const brick of bricks) {
    const worldFootprint = getWorldFootprint(brick)
    const mass = brick.part.mass ?? worldFootprint.length * brick.part.height
    const center = getBrickCenter(brick, worldFootprint)

    totalMass += mass
    weightedX += center.x * mass
    weightedY += center.y * mass
    weightedZ += center.z * mass

    if (brick.position.y === 0) {
      for (const [x, z] of worldFootprint) {
        const contact: GridPoint = [x + 0.5, z + 0.5]
        supportContacts.set(`${contact[0]},${contact[1]}`, contact)
      }
    }
  }

  const centerOfMass = {
    x: weightedX / totalMass,
    y: weightedY / totalMass,
    z: weightedZ / totalMass,
  }
  const supportContactList = [...supportContacts.values()]
  const supportFootprint = getSupportFootprint(supportContactList)

  return {
    isBalanced: isProjectionInsideSupport(
      [centerOfMass.x, centerOfMass.z],
      supportFootprint,
    ),
    totalMass,
    centerOfMass,
    supportContacts: supportContactList,
    supportFootprint,
  }
}

type Point2D = [number, number]

/**
 * Returns the IDs of all bricks that belong to an unbalanced connected
 * component. For Phase 1 MVP the whole component topples (no smart shear).
 *
 * A component is unbalanced when its center-of-mass projection (X/Z) falls
 * outside the convex hull of the baseplate contact footprint.
 */
export function getUnbalancedBricks(
  bricks: PlacedBrick[],
  graph: Graph,
  catalog: PartCatalog,
): Set<string> {
  const brickById = new Map<string, PlacedBrick>()
  for (const brick of bricks) brickById.set(brick.id, brick)

  const unbalanced = new Set<string>()
  const components = connectedComponents(graph)

  for (const component of components) {
    const componentBricks = component.map((id) => brickById.get(id)!).filter(Boolean)

    // Skip floating components — grounding handles those
    const isGrounded = componentBricks.some((b) => b.y === 0)
    if (!isGrounded) continue

    // Collect support corners (the 4 XZ corners of each cell touching y=0)
    const supportCorners: Point2D[] = []
    for (const brick of componentBricks) {
      if (brick.y !== 0) continue
      const def = catalog[brick.partId]
      if (!def) continue
      for (const { x, z } of getOccupiedCells(brick, def)) {
        supportCorners.push([x, z], [x + 1, z], [x, z + 1], [x + 1, z + 1])
      }
    }

    if (supportCorners.length === 0) continue

    // Compute center of mass (mass ∝ footprint area × height)
    let totalMass = 0
    let comX = 0
    let comZ = 0

    for (const brick of componentBricks) {
      const def = catalog[brick.partId]
      if (!def) continue
      const cells = getOccupiedCells(brick, def)
      const mass = cells.length * def.height
      const cx = cells.reduce((s, c) => s + c.x + 0.5, 0) / cells.length
      const cz = cells.reduce((s, c) => s + c.z + 0.5, 0) / cells.length
      comX += cx * mass
      comZ += cz * mass
      totalMass += mass
    }

    if (totalMass === 0) continue
    comX /= totalMass
    comZ /= totalMass

    if (isOutsideSupport(supportCorners, comX, comZ)) {
      for (const id of component) {
        unbalanced.add(id)
      }
    }
  }

  return unbalanced
}

function getWorldFootprint(brick: BalanceComponentBrick): GridPoint[] {
  const { width, depth } = getFootprintBounds(brick.part.footprint)

  return brick.part.footprint.map(([x, z]) => {
    const [rx, rz] = rotateCell([x, z], brick.rotation, width, depth)
    return [brick.position.x + rx, brick.position.z + rz]
  })
}

function getBrickCenter(
  brick: BalanceComponentBrick,
  footprint: readonly GridPoint[],
): { x: number; y: number; z: number } {
  let xSum = 0
  let zSum = 0

  for (const [x, z] of footprint) {
    xSum += x + 0.5
    zSum += z + 0.5
  }

  return {
    x: xSum / footprint.length,
    y: brick.position.y + brick.part.height / 2,
    z: zSum / footprint.length,
  }
}

function getSupportFootprint(points: readonly GridPoint[]): GridPoint[] {
  if (points.length <= 2) {
    return [...points]
  }

  const hull = polygonHull(points.map(([x, z]) => [x, z]))
  if (!hull || hull.length === 0) {
    return [...points]
  }

  return hull.map(([x, z]) => [x, z])
}

function isProjectionInsideSupport(
  point: GridPoint,
  supportFootprint: readonly GridPoint[],
): boolean {
  if (supportFootprint.length === 0) {
    return false
  }

  if (supportFootprint.length === 1) {
    return isSamePoint(point, supportFootprint[0])
  }

  if (supportFootprint.length === 2) {
    return isPointOnSegment(point, supportFootprint[0], supportFootprint[1])
  }

  return (
    isPointOnPolygonBoundary(point, supportFootprint) ||
    polygonContains(
      supportFootprint.map(([x, z]) => [x, z]),
      [point[0], point[1]],
    )
  )
}

function getFootprintBounds(footprint: readonly GridPoint[]) {
  let maxX = 0
  let maxZ = 0

  for (const [x, z] of footprint) {
    maxX = Math.max(maxX, x)
    maxZ = Math.max(maxZ, z)
  }

  return { width: maxX + 1, depth: maxZ + 1 }
}

function rotateCell(
  [x, z]: GridPoint,
  rotation: BalanceComponentBrick['rotation'],
  width: number,
  depth: number,
): GridPoint {
  switch (rotation) {
    case 0:
      return [x, z]
    case 1:
      return [depth - 1 - z, x]
    case 2:
      return [width - 1 - x, depth - 1 - z]
    case 3:
      return [z, width - 1 - x]
  }
}

function isSamePoint([ax, az]: GridPoint, [bx, bz]: GridPoint): boolean {
  return almostEqual(ax, bx) && almostEqual(az, bz)
}

function isPointOnPolygonBoundary(
  point: GridPoint,
  polygon: readonly GridPoint[],
): boolean {
  for (let index = 0; index < polygon.length; index += 1) {
    const start = polygon[index]
    const end = polygon[(index + 1) % polygon.length]
    if (isPointOnSegment(point, start, end)) {
      return true
    }
  }

  return false
}

function isPointOnSegment(
  [px, pz]: GridPoint,
  [ax, az]: GridPoint,
  [bx, bz]: GridPoint,
): boolean {
  const cross = (px - ax) * (bz - az) - (pz - az) * (bx - ax)
  if (!almostEqual(cross, 0)) {
    return false
  }

  const dot = (px - ax) * (bx - ax) + (pz - az) * (bz - az)
  if (dot < -Number.EPSILON) {
    return false
  }

  const squaredLength = (bx - ax) ** 2 + (bz - az) ** 2
  return dot <= squaredLength + Number.EPSILON
}

function almostEqual(a: number, b: number): boolean {
  return Math.abs(a - b) <= 1e-9
}

function isOutsideSupport(corners: Point2D[], comX: number, comZ: number): boolean {
  const hull = polygonHull(corners)

  if (!hull) {
    // Degenerate (all points collinear): check bounding box
    const xs = corners.map((c) => c[0])
    const zs = corners.map((c) => c[1])
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minZ = Math.min(...zs)
    const maxZ = Math.max(...zs)
    return comX < minX || comX > maxX || comZ < minZ || comZ > maxZ
  }

  return !polygonContains(hull, [comX, comZ])
}
