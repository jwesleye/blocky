import { assertSupportedBaseplateSize } from '@/domain/grid'

export interface BaseplateFraming {
  cameraPosition: [number, number, number]
  target: [number, number, number]
  extent: number
}

const CAMERA_XZ_OFFSET_MULTIPLIER = 14 / 32
const CAMERA_Y_OFFSET_MULTIPLIER = 25 / 32
const EXTENT_MULTIPLIER = 1

export function getBaseplateFraming(size: number): BaseplateFraming {
  assertSupportedBaseplateSize(size)

  const halfSize = size / 2
  const target: [number, number, number] = [halfSize, 0, halfSize]

  return {
    cameraPosition: [
      target[0] + size * CAMERA_XZ_OFFSET_MULTIPLIER,
      size * CAMERA_Y_OFFSET_MULTIPLIER,
      target[2] + size * CAMERA_XZ_OFFSET_MULTIPLIER,
    ],
    target,
    extent: size * EXTENT_MULTIPLIER,
  }
}
