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

export const SUPPORTED_BASEPLATE_SIZES = [16, 32, 48, 64] as const
export const DEFAULT_BASEPLATE_SIZE = 32

export type BaseplateSize = (typeof SUPPORTED_BASEPLATE_SIZES)[number]

export const isSupportedBaseplateSize = (
  size: number,
): size is BaseplateSize =>
  (SUPPORTED_BASEPLATE_SIZES as readonly number[]).includes(size)

export const assertSupportedBaseplateSize = (size: number): void => {
  if (!isSupportedBaseplateSize(size)) {
    throw new RangeError(
      `Unsupported baseplate size: ${size}. Supported sizes are ${SUPPORTED_BASEPLATE_SIZES.join(', ')}.`,
    )
  }
}

export const boundsForSize = (size: number) => {
  assertSupportedBaseplateSize(size)
  return {
    minX: 0,
    maxX: size - 1,
    minZ: 0,
    maxZ: size - 1,
  }
}

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

export const isWithinBaseplate = (
  { x, z }: GridFootprintCell,
  size: number = DEFAULT_BASEPLATE_SIZE,
): boolean => {
  const bounds = boundsForSize(size)
  return (
    isInteger(x) &&
    isInteger(z) &&
    x >= bounds.minX &&
    x <= bounds.maxX &&
    z >= bounds.minZ &&
    z <= bounds.maxZ
  )
}

export const isGridPosition = (
  { x, y, z }: GridPosition,
  size: number = DEFAULT_BASEPLATE_SIZE,
): boolean => isWithinBaseplate({ x, z }, size) && isInteger(y) && y >= 0
