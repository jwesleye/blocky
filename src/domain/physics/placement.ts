/**
 * Anti-floating placement rules (PRD §5.1) — pure, framework-agnostic domain core.
 *
 * Two bricks **connect** when a stud face of the lower brick aligns with the
 * anti-stud face of the upper brick on the grid (classic vertical
 * stud/anti-stud coupling). A brick is **grounded** when it rests on the
 * baseplate or couples — transitively — to a brick that is. Floating is
 * hard-prevented: a placement that has no path to the baseplate is rejected.
 *
 * Callers reduce a placed brick to the {@link BrickFootprint} geometry this
 * engine needs, keeping grounding independently testable without importing
 * the grid or part catalog.
 */
import Graph from 'graphology'
import { connectedComponents } from 'graphology-components'
import type { PlacedBrick, HalfStudOffset, BrickMount } from '../model/types'
import type { PartCatalog } from '../parts/catalog'
import {
  toBrickFootprint,
  type FootprintRect,
  rectsOverlap,
} from '../parts/footprint'

/** A single stud cell in the X/Z plane (integer stud coordinates). */
export interface Cell {
  readonly x: number
  readonly z: number
}

/**
 * A placed brick reduced to the geometry the grounding engine needs: the stud
 * cells it occupies (already rotated and world-positioned) and its vertical
 * extent in plate (Y) units.
 */
export interface BrickFootprint {
  /** Stable, unique id of the placed brick. */
  readonly id: string
  /** Bottom of the brick in plate (Y) units; 0 == resting on the baseplate. */
  readonly bottomY: number
  /** Height in plate units (brick = 3, plate/tile = 1). Must be >= 1. */
  readonly height: number
  /** Occupied stud cells in X/Z (post-rotation, world coordinates). */
  readonly cells: ReadonlyArray<Cell>
  /**
   * Whether the top face exposes studs that an upper brick can grab. Tiles are
   * smooth (no top studs), so nothing couples onto their top. Defaults to
   * `true` for bricks and plates.
   */
  readonly hasTopStuds?: boolean
  /**
   * Optional half-stud body offset. `x: 1` means +0.5 stud shift along X;
   * `z: 1` means +0.5 stud shift along Z. Absent/undefined is no shift.
   */
  readonly offset?: HalfStudOffset
  /**
   * Optional mount direction for SNOT / lateral bricks. When set, this brick
   * attaches to a neighbour via a lateral face rather than a vertical
   * stud/anti-stud coupling, and the `hasLateralContact` geometry check is
   * used to establish the connection edge.
   */
  readonly mount?: BrickMount
}

/** Tolerance for comparing world-space contact-face positions (half-integer safe). */
const FACE_EPS = 1e-9

/**
 * Returns true when `mounted` (a brick with a mount direction) makes physical
 * face-to-face contact with `standard` (a conventionally-oriented brick) via a
 * lateral coupling.
 *
 * Geometry: each mount direction corresponds to a 90-degree rotation that maps
 * the brick's plate height H onto a lateral span, and the footprint width W or
 * depth L onto the post-rotation Y extent. The anti-stud contact face world
 * position is computed from the footprint centroid ± H/2.
 */
function hasLateralContact(
  mounted: BrickFootprint,
  standard: BrickFootprint,
): boolean {
  const mr = bfpToRect(mounted)
  const sr = bfpToRect(standard)
  const H = mounted.height

  // Physical Y extent of the mounted brick after rotation.
  // 'px'/'nx' rotate around Z: Y half-width = W (footprint X extent / 2).
  // 'pz'/'nz' rotate around X: Y half-width = L (footprint Z extent / 2).
  const W = mr.xHi - mr.xLo
  const L = mr.zHi - mr.zLo
  const mountedYHalfWidth =
    mounted.mount === 'pz' || mounted.mount === 'nz' ? L / 2 : W / 2
  const mountedYCenter = mounted.bottomY + H / 2
  const mountedYLo = mountedYCenter - mountedYHalfWidth
  const mountedYHi = mountedYCenter + mountedYHalfWidth

  // Y ranges must strictly overlap (positive-measure contact).
  if (mountedYLo >= standard.bottomY + standard.height) return false
  if (mountedYHi <= standard.bottomY) return false

  const xCenter = (mr.xLo + mr.xHi) / 2
  const zCenter = (mr.zLo + mr.zHi) / 2

  switch (mounted.mount) {
    case 'px':
      // Stud face → +X; anti-stud at world X = xCenter − H/2.
      // The standard brick's +X face (sr.xHi) must sit at that position.
      return (
        Math.abs(sr.xHi - (xCenter - H / 2)) <= FACE_EPS &&
        sr.zLo < mr.zHi &&
        sr.zHi > mr.zLo
      )

    case 'nx':
      // Stud face → −X; anti-stud at world X = xCenter + H/2.
      return (
        Math.abs(sr.xLo - (xCenter + H / 2)) <= FACE_EPS &&
        sr.zLo < mr.zHi &&
        sr.zHi > mr.zLo
      )

    case 'pz':
      // Stud face → +Z; anti-stud at world Z = zCenter − H/2.
      return (
        Math.abs(sr.zHi - (zCenter - H / 2)) <= FACE_EPS &&
        sr.xLo < mr.xHi &&
        sr.xHi > mr.xLo
      )

    case 'nz':
      // Stud face → −Z; anti-stud at world Z = zCenter + H/2.
      return (
        Math.abs(sr.zLo - (zCenter + H / 2)) <= FACE_EPS &&
        sr.xLo < mr.xHi &&
        sr.xHi > mr.xLo
      )

    default:
      return false
  }
}

/** Graph node id standing in for the baseplate (the ground). */
export const BASEPLATE = '__baseplate__'

/** Y level (plate units) of the baseplate's top surface. */
export const BASEPLATE_TOP_Y = 0

function bfpToRect(fp: BrickFootprint): FootprintRect {
  const ox = 0.5 * (fp.offset?.x ?? 0)
  const oz = 0.5 * (fp.offset?.z ?? 0)
  let xLo = Infinity,
    xHi = -Infinity,
    zLo = Infinity,
    zHi = -Infinity
  for (const c of fp.cells) {
    if (c.x < xLo) xLo = c.x
    if (c.x + 1 > xHi) xHi = c.x + 1
    if (c.z < zLo) zLo = c.z
    if (c.z + 1 > zHi) zHi = c.z + 1
  }
  return { xLo: xLo + ox, xHi: xHi + ox, zLo: zLo + oz, zHi: zHi + oz }
}

/**
 * Build the undirected stud/anti-stud connection graph for a set of bricks.
 *
 * Nodes are brick ids plus the {@link BASEPLATE} node. An edge means a
 * physical coupling: either a brick resting on the baseplate (`bottomY === 0`)
 * or the studded top face of one brick meeting the anti-stud bottom face of
 * another with positive-area rectangle overlap at the shared Y plane.
 *
 * @throws RangeError if any brick has a non-positive height.
 */
export function buildConnectionGraph(bricks: Iterable<BrickFootprint>): Graph {
  const all = [...bricks]
  const graph = new Graph({ type: 'undirected', allowSelfLoops: false })
  graph.mergeNode(BASEPLATE)

  // Index bricks by bottomY so the coupling scan stays O(n²)-per-plane.
  const byBottomY = new Map<number, BrickFootprint[]>()

  for (const b of all) {
    if (b.height < 1) {
      throw new RangeError(
        `brick "${b.id}" has invalid height ${b.height}; height must be >= 1`,
      )
    }
    graph.mergeNode(b.id)
    if (b.bottomY === BASEPLATE_TOP_Y) {
      graph.mergeEdge(b.id, BASEPLATE)
    }
    const bucket = byBottomY.get(b.bottomY)
    if (bucket) bucket.push(b)
    else byBottomY.set(b.bottomY, [b])
  }

  // For each brick whose top exposes studs, couple it to every brick whose
  // bottom sits at the same Y plane and whose footprint rect overlaps with
  // positive area. This reproduces exact-cell coupling for integer-aligned
  // bricks and additionally handles half-stud-offset (jumper) bricks.
  // Mounted (SNOT) bricks are excluded from this scan: their stud/anti-stud
  // faces are lateral, not vertical, so they connect via hasLateralContact.
  for (const b of all) {
    if (b.hasTopStuds === false) continue
    if (b.mount !== undefined) continue
    const topY = b.bottomY + b.height
    const candidates = byBottomY.get(topY)
    if (!candidates) continue
    const bRect = bfpToRect(b)
    for (const other of candidates) {
      if (other.id === b.id) continue
      if (other.mount !== undefined) continue
      if (rectsOverlap(bRect, bfpToRect(other))) {
        graph.mergeEdge(b.id, other.id)
      }
    }
  }

  // Lateral connections for mounted (SNOT) bricks.
  // A mounted brick couples to any standard (non-mounted) brick whose contact
  // face aligns with the mounted brick's anti-stud face and whose Y extent
  // physically overlaps.
  const mountedBricks = all.filter((b) => b.mount !== undefined)
  if (mountedBricks.length > 0) {
    const standardBricks = all.filter((b) => b.mount === undefined)

    // Create an array mapping from each mounted brick to its exact Y-bounds.
    // The bounds logic is identical to `hasLateralContact`.
    const mountedBounds = mountedBricks.map((m) => {
      const mr = bfpToRect(m)
      const H = m.height
      const W = mr.xHi - mr.xLo
      const L = mr.zHi - mr.zLo
      const mountedYHalfWidth =
        m.mount === 'pz' || m.mount === 'nz' ? L / 2 : W / 2
      const mountedYCenter = m.bottomY + H / 2
      return {
        m,
        yLo: mountedYCenter - mountedYHalfWidth,
        yHi: mountedYCenter + mountedYHalfWidth,
      }
    })

    // Group standard bricks by bottomY for spatial indexing
    // Use an array indexed by integer `bottomY` if possible, otherwise Map.
    // `byBottomY` from earlier already maps standard bricks (because mounted were skipped there),
    // but the `byBottomY` there has all bricks.
    const stdByBottomY = new Map<number, BrickFootprint[]>()
    for (const s of standardBricks) {
      const bucket = stdByBottomY.get(s.bottomY)
      if (bucket) bucket.push(s)
      else stdByBottomY.set(s.bottomY, [s])
    }
    const stdLevels = Array.from(stdByBottomY.keys()).sort((a, b) => a - b)

    for (const { m, yLo, yHi } of mountedBounds) {
      // standard.bottomY + standard.height > yLo  =>  standard.bottomY > yLo - height
      // To ensure overlap, we need to iterate standard levels that could possibly overlap.
      // std.bottomY < yHi (exclusive)
      for (const levelY of stdLevels) {
        if (levelY >= yHi) break // standard brick is completely above mounted brick

        const candidates = stdByBottomY.get(levelY)!
        for (const s of candidates) {
          if (levelY + s.height <= yLo) continue // standard brick is completely below

          if (hasLateralContact(m, s)) {
            graph.mergeEdge(m.id, s.id)
          }
        }
      }
    }
  }

  return graph
}

/**
 * Compute the set of brick ids that are grounded — i.e. reachable from the
 * baseplate through the connection graph. Bricks not in the returned set are
 * floating.
 */
export function groundedIds(bricks: Iterable<BrickFootprint>): Set<string> {
  const graph = buildConnectionGraph(bricks)
  const grounded = new Set<string>()
  for (const component of connectedComponents(graph)) {
    if (!component.includes(BASEPLATE)) continue
    for (const id of component) {
      if (id !== BASEPLATE) grounded.add(id)
    }
    break
  }
  return grounded
}

/**
 * Ids of bricks with no path to the baseplate. In a deletion (PRD §5.3) these
 * are exactly the sub-parts that lost their grounding and must fall.
 */
export function floatingIds(bricks: Iterable<BrickFootprint>): Set<string> {
  const all: BrickFootprint[] = [...bricks]
  const grounded = groundedIds(all)
  const floating = new Set<string>()
  for (const b of all) {
    if (!grounded.has(b.id)) floating.add(b.id)
  }
  return floating
}

/** Whether a specific brick is grounded within the given set. */
export function isGrounded(
  id: string,
  bricks: Iterable<BrickFootprint>,
): boolean {
  return groundedIds(bricks).has(id)
}

/**
 * The hard anti-floating placement rule (PRD §5.1): a `candidate` may be placed
 * only if, once added to the `existing` structure, it is grounded — i.e. it
 * rests on the baseplate or couples (transitively) to a grounded brick.
 *
 * This enforces grounding only; collision/overlap validity is the ghost-cursor
 * placement concern (#9) and is out of scope here.
 */
export function canPlace(
  candidate: BrickFootprint,
  existing: Iterable<BrickFootprint>,
): boolean {
  return groundedIds([...existing, candidate]).has(candidate.id)
}

export function canPlaceBrick(
  candidate: PlacedBrick,
  existing: Iterable<PlacedBrick>,
  catalog: PartCatalog,
): boolean {
  const all = Array.from(existing, (brick) => toBrickFootprint(brick, catalog))
  return canPlace(toBrickFootprint(candidate, catalog), all)
}
