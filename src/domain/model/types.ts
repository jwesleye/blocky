export interface PlacedBrick {
  id: string
  partId: string
  color: string
  x: number
  y: number
  z: number
  rot: 0 | 1 | 2 | 3
}

export interface BrickBodySnapshot {
  id: string
  partId: string
  color: string
  position: readonly [number, number, number]
  size: readonly [number, number, number]
  quaternion?: readonly [number, number, number, number]
}
