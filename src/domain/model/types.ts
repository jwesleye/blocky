export interface PlacedBrick {
  id: string
  partId: string
  color: string
  x: number
  y: number
  z: number
  rot: 0 | 1 | 2 | 3
}

/**
 * Runtime build model: every placed brick keyed by its id, plus the set of
 * currently selected brick ids. Selection is transient and is not serialized.
 */
export interface BuildState {
  bricks: Record<string, PlacedBrick>
  selection: Set<string>
}

export interface BrickBodySnapshot {
  id: string
  partId: string
  color: string
  position: readonly [number, number, number]
  size: readonly [number, number, number]
  quaternion?: readonly [number, number, number, number]
}
