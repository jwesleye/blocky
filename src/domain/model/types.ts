import type Graph from 'graphology'

export interface HalfStudOffset {
  x: 0 | 1
  z: 0 | 1
}

/** SNOT facing: which Y-perpendicular face carries studs sideways. */
export type BrickMount = 'px' | 'nx' | 'pz' | 'nz'

/** Hinge pivot axis: which horizontal axis the brick pivots about. */
export type BrickHinge = 'x' | 'z'

export interface PlacedBrick {
  id: string
  partId: string
  color: string
  x: number
  y: number
  z: number
  rot: 0 | 1 | 2 | 3
  offset?: HalfStudOffset
  mount?: BrickMount
  hinge?: BrickHinge
}

/**
 * Runtime build model: every placed brick keyed by its id, plus the set of
 * currently selected brick ids. Selection is transient and is not serialized.
 */
export interface BuildState {
  bricks: Record<string, PlacedBrick>
  selection: Set<string>
  connectionGraph: Graph
  /**
   * Metadata for the most recent collapse transaction, or `null` if the last
   * history entry was not a collapse. Rides the same zundo history entry as the
   * collapse itself so undo clears it and redo restores it, letting the UI label
   * the action (e.g. "Undo collapse").
   */
  lastCollapse: { count: number; label: string } | null
  /** Active baseplate side length in studs; defaults to 32. */
  baseplateSize: number
}

export interface BrickBodySnapshot {
  id: string
  partId: string
  color: string
  position: readonly [number, number, number]
  size: readonly [number, number, number]
  quaternion?: readonly [number, number, number, number]
}
