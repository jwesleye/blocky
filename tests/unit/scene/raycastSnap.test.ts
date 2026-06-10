import { describe, it, expect } from 'vitest'
import { snapHitToGridCell } from '../../../src/scene/raycastSnap'
import { STUD_PITCH_MM, BASEPLATE_SIZE_STUDS } from '../../../src/domain/grid'

describe('snapHitToGridCell', () => {
  it('snaps ground-plane hit to nearest stud cell with y=0', () => {
    // origin (0, 0) in mm -> grid cell (0, 0)
    expect(snapHitToGridCell({ point: { x: 0, y: 0, z: 0 } })).toEqual({
      x: 0,
      y: 0,
      z: 0,
    })

    // hit at (8.1, 0, 16.4) -> grid cell (1, 0, 2)
    expect(snapHitToGridCell({ point: { x: 8.1, y: 0, z: 16.4 } })).toEqual({
      x: 1,
      y: 0,
      z: 2,
    })
  })

  it('snaps brick-top hit to grid cell with matching y', () => {
    // hit at (8, 9.6, 16) with faceY = 3 (plates)
    expect(
      snapHitToGridCell({ point: { x: 8, y: 9.6, z: 16 }, faceY: 3 }),
    ).toEqual({ x: 1, y: 3, z: 2 })
  })

  it('returns null for off-baseplate points', () => {
    const maxBound = BASEPLATE_SIZE_STUDS * STUD_PITCH_MM
    expect(snapHitToGridCell({ point: { x: -5, y: 0, z: 10 } })).toBeNull()
    expect(
      snapHitToGridCell({ point: { x: maxBound + 1, y: 0, z: 10 } }),
    ).toBeNull()
  })
})
