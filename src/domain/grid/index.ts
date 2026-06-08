export const STUD_PITCH_MM = 8
export const PLATE_HEIGHT_MM = 3.2
export const BRICK_HEIGHT_PLATES = 3
export const BASEPLATE_SIZE_STUDS = 32

export const BASEPLATE_BOUNDS = {
  minX: 0,
  maxX: BASEPLATE_SIZE_STUDS - 1,
  minZ: 0,
  maxZ: BASEPLATE_SIZE_STUDS - 1,
} as const

export const GRAVITY_VECTOR = { x: 0, y: -1, z: 0 } as const

export type RotationY = 0 | 1 | 2 | 3

export interface GridFootprintCell {
  x: number
  z: number
}

export interface GridPosition extends GridFootprintCell {
  y: number
}

export const studsToMillimeters = (studs: number): number =>
  studs * STUD_PITCH_MM

export const plateUnitsToMillimeters = (plateUnits: number): number =>
  plateUnits * PLATE_HEIGHT_MM

export const bricksToPlateUnits = (bricks: number): number =>
  bricks * BRICK_HEIGHT_PLATES

export const normalizeRotationY = (rotation: number): RotationY =>
  (((rotation % 4) + 4) % 4) as RotationY

const isInteger = (value: number): boolean => Number.isInteger(value)

export const isWithinBaseplate = ({ x, z }: GridFootprintCell): boolean =>
  isInteger(x) &&
  isInteger(z) &&
  x >= BASEPLATE_BOUNDS.minX &&
  x <= BASEPLATE_BOUNDS.maxX &&
  z >= BASEPLATE_BOUNDS.minZ &&
  z <= BASEPLATE_BOUNDS.maxZ

export const isGridPosition = ({ x, y, z }: GridPosition): boolean =>
  isWithinBaseplate({ x, z }) && isInteger(y) && y >= 0
