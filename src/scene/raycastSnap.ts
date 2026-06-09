import { STUD_PITCH_MM, BASEPLATE_SIZE_STUDS, type GridPosition } from '@/domain/grid'

export interface SnapInput {
  point: { x: number; y: number; z: number }
  faceY?: number
}

export function snapHitToGridCell({ point, faceY }: SnapInput): GridPosition | null {
  const x = Math.round(point.x / STUD_PITCH_MM)
  const z = Math.round(point.z / STUD_PITCH_MM)

  if (x < 0 || x >= BASEPLATE_SIZE_STUDS || z < 0 || z >= BASEPLATE_SIZE_STUDS) {
    return null
  }

  const y = faceY !== undefined ? faceY : 0

  return { x, y, z }
}
