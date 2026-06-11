import type { BrickMount } from '@/domain/model/types'

export function mountRotation(mount?: BrickMount): [number, number, number] {
  switch (mount) {
    case 'px':
      return [0, 0, -Math.PI / 2]
    case 'nx':
      return [0, 0, Math.PI / 2]
    case 'pz':
      return [Math.PI / 2, 0, 0]
    case 'nz':
      return [-Math.PI / 2, 0, 0]
    default:
      return [0, 0, 0]
  }
}
