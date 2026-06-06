import type { PlacedBrick } from '@/domain/model/types'
import type { PartCatalog, PhysicsPartDef } from '@/domain/parts/catalog'

export const STUD_PITCH_MM = 8
export const PLATE_HEIGHT_MM = 3.2
export const BRICK_HEIGHT_PLATES = 3
export const BASEPLATE_SIZE_STUDS = 32

/** Scene units per stud pitch (X and Z). */
export const STUD = 1.0

/** Scene units per plate-height grid step (Y). */
export const PLATE = 1.0

export const BASEPLATE_BOUNDS = {
  minX: 0,
  maxX: BASEPLATE_SIZE_STUDS - 1,
  minZ: 0,
  maxZ: BASEPLATE_SIZE_STUDS - 1,
} as const

export const SUPPORTED_BASEPLATE_SIZES = [16, 32, 48, 64] as const
export const DEFAULT_BASEPLATE_SIZE = 32

export type BaseplateSize = (typeof SUPPORTED_BASEPLATE_SIZES)[number]

export const isSupportedBaseplateSize = (size: number): size is BaseplateSize =>
  (SUPPORTED_BASEPLATE_SIZES as readonly number[]).includes(size)

export function assertSupportedBaseplateSize(
  size: number,
): asserts size is BaseplateSize {
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

export type GridCoord = GridPosition

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

export function rotatedDimensions(
  part: PhysicsPartDef,
  rot: RotationY,
): [number, number] {
  return rot % 2 === 0 ? [part.width, part.length] : [part.length, part.width]
}

export function getBrickCells(
  brick: PlacedBrick,
  parts: PartCatalog,
): GridCoord[] {
  const part = parts[brick.partId]
  if (!part) return []
  const [width, depth] = rotatedDimensions(part, brick.rot)
  const cells: GridCoord[] = []
  for (let dx = 0; dx < width; dx++) {
    for (let dz = 0; dz < depth; dz++) {
      for (let dy = 0; dy < part.height; dy++) {
        cells.push({ x: brick.x + dx, y: brick.y + dy, z: brick.z + dz })
      }
    }
  }
  return cells
}

export function getFootprintCells(
  brick: PlacedBrick,
  parts: PartCatalog,
): Array<[number, number]> {
  const part = parts[brick.partId]
  if (!part) return []
  const [width, depth] = rotatedDimensions(part, brick.rot)
  const cells: Array<[number, number]> = []
  for (let dx = 0; dx < width; dx++) {
    for (let dz = 0; dz < depth; dz++) {
      cells.push([brick.x + dx, brick.z + dz])
    }
  }
  return cells
}

/** Converts grid (x, y, z) to scene-space brick origin coordinates. */
export function gridToScene(
  x: number,
  y: number,
  z: number,
): [number, number, number] {
  return [x * STUD, y * PLATE, z * STUD]
}

export function snapStud(sceneCoord: number): number {
  return Math.round(sceneCoord / STUD)
}

export function snapPlate(sceneY: number): number {
  return Math.round(sceneY / PLATE)
}
