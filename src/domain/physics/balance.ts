import type Graph from 'graphology'
import { connectedComponents } from 'graphology-components'
import { polygonContains, polygonHull } from 'd3-polygon'
import type { PlacedBrick } from '../model/types'
import type { PartCatalog } from '../parts/catalog'
import { getOccupiedCells } from '../parts/footprint'

export type Point2D = [number, number]
export type Polygon2D = Point2D[]
export type Vec3 = { x: number; y: number; z: number }

// Tolerance for boundary containment checks on integer-grid footprints.
const BOUNDARY_EPS = 1e-9

function isPointOnPolygonBoundary(point: Point2D, polygon: Polygon2D): boolean {
  const n = polygon.length
  for (let i = 0; i < n; i++) {
    const a = polygon[i]
    const b = polygon[(i + 1) % n]
    // Cross product of (point - a) and (b - a) is zero iff point is collinear with a and b.
    const cross = (point[0] - a[0]) * (b[1] - a[1]) - (point[1] - a[1]) * (b[0] - a[0])
    if (Math.abs(cross) > BOUNDARY_EPS) continue
    // Confirm the point lies within the segment's bounding box.
    if (
      point[0] >= Math.min(a[0], b[0]) - BOUNDARY_EPS &&
      point[0] <= Math.max(a[0], b[0]) + BOUNDARY_EPS &&
      point[1] >= Math.min(a[1], b[1]) - BOUNDARY_EPS &&
      point[1] <= Math.max(a[1], b[1]) + BOUNDARY_EPS
    ) {
      return true
    }
  }
  return false
}

/**
 * Computes the convex-hull support footprint from a connected component's
 * base-contact bricks. Returns empty array if floating.
 */
export function computeSupportFootprint(
  component: PlacedBrick[],
  catalog: PartCatalog,
): Polygon2D {
  const supportCorners: Point2D[] = []
  for (const brick of component) {
    if (brick.y !== 0) continue
    const def = catalog[brick.partId]
    if (!def) continue
    for (const { x, z } of getOccupiedCells(brick, def)) {
      supportCorners.push([x, z], [x + 1, z], [x, z + 1], [x + 1, z + 1])
    }
  }

  if (supportCorners.length === 0) return []

  const hull = polygonHull(supportCorners)
  if (!hull) {
    // Degenerate (all points collinear): check bounding box
    const xs = supportCorners.map((c) => c[0])
    const zs = supportCorners.map((c) => c[1])
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minZ = Math.min(...zs)
    const maxZ = Math.max(...zs)
    return [
      [minX, minZ],
      [maxX, minZ],
      [maxX, maxZ],
      [minX, maxZ],
    ]
  }

  return hull as Polygon2D
}

/**
 * Computes the simple mass-uniform center of mass for a component.
 */
export function computeCoM(
  component: PlacedBrick[],
  catalog: PartCatalog,
): Vec3 {
  let totalMass = 0
  let comX = 0
  let comY = 0
  let comZ = 0

  for (const brick of component) {
    const def = catalog[brick.partId]
    if (!def) continue
    const cells = getOccupiedCells(brick, def)
    const mass = cells.length * def.height

    // For x and z, it's the average of occupied cells' centers
    const cx = cells.reduce((s, c) => s + c.x + 0.5, 0) / cells.length
    const cz = cells.reduce((s, c) => s + c.z + 0.5, 0) / cells.length

    // For y, it's the vertical center of the brick
    const cy = brick.y + def.height / 2

    comX += cx * mass
    comY += cy * mass
    comZ += cz * mass
    totalMass += mass
  }

  if (totalMass === 0) return { x: 0, y: 0, z: 0 }

  return {
    x: comX / totalMass,
    y: comY / totalMass,
    z: comZ / totalMass,
  }
}

/**
 * Returns true iff the XZ projection of CoM lies inside the support footprint.
 * Single bricks or correctly supported components return true.
 */
export function isBalanced(
  component: PlacedBrick[],
  catalog: PartCatalog,
): boolean {
  if (component.length === 0) return true

  const footprint = computeSupportFootprint(component, catalog)
  if (footprint.length === 0) {
    // If it has no footprint (not on the ground), we consider it unbalanced
    // unless floating objects are handled elsewhere. But for `isBalanced` logic,
    // a floating object isn't supported, so it's not balanced on the ground.
    return false
  }

  const com = computeCoM(component, catalog)
  const projection: Point2D = [com.x, com.z]
  return polygonContains(footprint, projection) || isPointOnPolygonBoundary(projection, footprint)
}

/**
 * Returns the IDs of all bricks that belong to an unbalanced connected
 * component. For Phase 1 MVP the whole component topples (no smart shear).
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
    const componentBricks = component
      .map((id) => brickById.get(id)!)
      .filter(Boolean)

    // Skip floating components — grounding handles those
    const isGrounded = componentBricks.some((b) => b.y === 0)
    if (!isGrounded) continue

    if (!isBalanced(componentBricks, catalog)) {
      for (const id of component) {
        unbalanced.add(id)
      }
    }
  }

  return unbalanced
}
