import {
  getBrickCells,
  getFootprintCells,
  PLATE,
  snapPlate,
  snapStud,
  STUD,
} from '@/domain/grid'
import { CATALOG_BY_ID as PART_CATALOG } from '@/domain/parts/catalog'
import { isValidPlacement } from '@/domain/physics/validity'
import type { PlacedBrick } from '@/domain/model/types'

function brick(overrides: Partial<PlacedBrick> = {}): PlacedBrick {
  return {
    id: 'b',
    partId: 'brick-1x1',
    color: 'red',
    x: 0,
    y: 0,
    z: 0,
    rot: 0,
    ...overrides,
  }
}

describe('getBrickCells', () => {
  it('returns 3 cells for a 1x1 brick (height 3 plates)', () => {
    const cells = getBrickCells(brick(), PART_CATALOG)
    expect(cells).toHaveLength(3)
    expect(cells).toContainEqual({ x: 0, y: 0, z: 0 })
    expect(cells).toContainEqual({ x: 0, y: 1, z: 0 })
    expect(cells).toContainEqual({ x: 0, y: 2, z: 0 })
  })

  it('returns 2x4x3 = 24 cells for a 2x4 brick', () => {
    const cells = getBrickCells(brick({ partId: 'brick-2x4' }), PART_CATALOG)
    expect(cells).toHaveLength(24)
  })

  it('swaps width/depth on rot=1 (1x2 becomes 2 wide, 1 deep)', () => {
    const cells = getBrickCells(
      brick({ partId: 'brick-1x2', rot: 1 }),
      PART_CATALOG,
    )
    const xs = [...new Set(cells.map((c) => c.x))]
    const zs = [...new Set(cells.map((c) => c.z))]
    expect(xs).toHaveLength(2)
    expect(zs).toHaveLength(1)
  })

  it('returns empty array for unknown partId', () => {
    expect(
      getBrickCells(brick({ partId: 'nonexistent' }), PART_CATALOG),
    ).toEqual([])
  })
})

describe('getFootprintCells', () => {
  it('returns 1 cell for a 1x1 brick', () => {
    expect(getFootprintCells(brick(), PART_CATALOG)).toEqual([[0, 0]])
  })

  it('returns 8 cells for a 2x4 brick', () => {
    const cells = getFootprintCells(
      brick({ partId: 'brick-2x4' }),
      PART_CATALOG,
    )
    expect(cells).toHaveLength(8)
  })
})

describe('snapStud / snapPlate', () => {
  it('snapStud rounds to nearest integer stud', () => {
    expect(snapStud(0.4 * STUD)).toBe(0)
    expect(snapStud(0.6 * STUD)).toBe(1)
    expect(snapStud(-0.6 * STUD)).toBe(-1)
  })

  it('snapPlate rounds to nearest plate grid integer', () => {
    expect(snapPlate(0.4 * PLATE)).toBe(0)
    expect(snapPlate(0.6 * PLATE)).toBe(1)
  })
})

describe('isValidPlacement', () => {
  it('allows a brick resting on the baseplate (y=0)', () => {
    expect(isValidPlacement(brick(), [])).toBe(true)
  })

  it('rejects a baseplate placement with a negative footprint coordinate', () => {
    expect(isValidPlacement(brick({ x: -1 }), [])).toBe(false)
    expect(isValidPlacement(brick({ z: -1 }), [])).toBe(false)
  })

  it('rejects a baseplate placement whose full footprint exceeds the board', () => {
    expect(isValidPlacement(brick({ partId: 'brick-2x4', x: 31 }), [])).toBe(
      false,
    )
    expect(isValidPlacement(brick({ partId: 'brick-2x4', z: 29 }), [])).toBe(
      false,
    )
  })

  it('rejects a floating brick (y>0, nothing below)', () => {
    expect(isValidPlacement(brick({ y: 3 }), [])).toBe(false)
  })

  it('allows stacking a 1x1 brick on top of another (y=3)', () => {
    const support = brick({ id: 'support' })
    const ghost = brick({ y: 3 })
    expect(isValidPlacement(ghost, [support])).toBe(true)
  })

  it('rejects a collision at the same grid position', () => {
    const existing = brick({ id: 'existing' })
    const ghost = brick()
    expect(isValidPlacement(ghost, [existing])).toBe(false)
  })

  it('rejects partial footprint overlap (ghost shifted 1 stud into existing)', () => {
    const existing = brick({ id: 'existing', partId: 'brick-2x4' })
    const ghost = brick({ partId: 'brick-2x4', x: 1 })
    expect(isValidPlacement(ghost, [existing])).toBe(false)
  })

  it('allows adjacent placement with no overlap', () => {
    const existing = brick({ id: 'existing', partId: 'brick-1x1' })
    const ghost = brick({ partId: 'brick-1x1', x: 1 })
    expect(isValidPlacement(ghost, [existing])).toBe(true)
  })

  it('rejects stacking when footprints do not overlap', () => {
    const support = brick({ id: 'support', partId: 'brick-1x1', x: 0, z: 0 })
    const ghost = brick({ partId: 'brick-1x1', x: 5, y: 3 })
    expect(isValidPlacement(ghost, [support])).toBe(false)
  })

  it('allows stacking a plate (height=1) on top of a brick (height=3)', () => {
    const brickBelow = brick({ id: 'below', partId: 'brick-1x1' })
    const plateAbove = brick({ partId: 'plate-1x1', y: 3 })
    expect(isValidPlacement(plateAbove, [brickBelow])).toBe(true)
  })

  it('stacking requires exact Y alignment (y must equal below.y + below.height)', () => {
    const support = brick({ id: 'support', partId: 'brick-1x1' })
    const ghost = brick({ y: 2 })
    expect(isValidPlacement(ghost, [support])).toBe(false)
  })

  it('rejects an offset brick overlapping an existing brick by 0.5 studs', () => {
    const existing = brick({ id: 'existing', partId: 'brick-1x1', x: 3, z: 3 })
    const ghost = brick({
      partId: 'brick-1x1',
      x: 2,
      z: 3,
      offset: { x: 1, z: 0 },
    })
    expect(isValidPlacement(ghost, [existing])).toBe(false)
  })

  it('allows a lone offset brick on the baseplate', () => {
    const ghost = brick({
      partId: 'brick-1x1',
      x: 2,
      z: 3,
      offset: { x: 1, z: 0 },
    })
    expect(isValidPlacement(ghost, [])).toBe(true)
  })

  it('rejects a mounted brick with no lateral contact to any standard brick (floating)', () => {
    // Mounted 'px' at x=0, y=3: anti-stud = 0.5 - 1.5 = -1.0 ≠ support.xHi (1.0) → no contact.
    const support = brick({ id: 'support' })
    const ghost = brick({
      y: 3,
      mount: 'px',
    })
    expect(isValidPlacement(ghost, [support])).toBe(false)
  })

  it('allows a valid lateral SNOT placement (mounted brick anti-stud contacts standard face)', () => {
    // Standard at (0,0,0): xHi=1.0. Mounted 'px' at (2,1,0): anti-stud = 2.5-1.5 = 1.0 ✓
    // Y overlap: mounted [2.0,3.0] vs standard [0,3] → grounded via lateral contact.
    const support = brick({ id: 'support' })
    const ghost = brick({ x: 2, y: 1, mount: 'px' })
    expect(isValidPlacement(ghost, [support])).toBe(true)
  })

  it('rejects a mounted brick whose rotated body intersects an adjacent standard brick', () => {
    // Reviewer repro: standard at (0,0,0), obstacle at (3,0,0), mounted 'px' at
    // (2,1,0). The mounted brick's rotated X extent is [1.0, 4.0] studs, which
    // overlaps the obstacle at x=[3,4]. findCollisions must detect this.
    const support = brick({ id: 'support' })
    const obstacle = brick({ id: 'obstacle', x: 3 })
    const ghost = brick({ x: 2, y: 1, mount: 'px' })
    expect(isValidPlacement(ghost, [support, obstacle])).toBe(false)
  })

  it('accepts a mounted brick whose rotated body clears all existing bricks', () => {
    // Same layout but obstacle moved to x=5 — no X overlap with mounted [1,4].
    const support = brick({ id: 'support' })
    const clear = brick({ id: 'clear', x: 5 })
    const ghost = brick({ x: 2, y: 1, mount: 'px' })
    expect(isValidPlacement(ghost, [support, clear])).toBe(true)
  })

  it('rejects a nz-mounted brick whose rotated body intersects a standard brick', () => {
    // 'nz' at (0,1,2): Z extent [1.0, 4.0], anti-stud at z=4.0.
    // Support at (0,0,4) provides lateral contact (sr.zLo=4.0 = anti-stud).
    // Obstacle at (0,0,3): z=[3,4] overlaps the mounted body. Must be rejected.
    const support = brick({ id: 'support', z: 4 })
    const obstacle = brick({ id: 'obstacle', z: 3 })
    const ghost = brick({ z: 2, y: 1, mount: 'nz' })
    expect(isValidPlacement(ghost, [support, obstacle])).toBe(false)
  })

  it('rejects offset-plus-mount placements as unsupported', () => {
    const ghost = brick({
      mount: 'px',
      offset: { x: 1, z: 0 },
    })
    expect(isValidPlacement(ghost, [])).toBe(false)
  })

  it('allows a valid jumper interlock', () => {
    const support1 = brick({ id: 's1', partId: 'brick-1x1', x: 2, z: 3 })
    const support2 = brick({ id: 's2', partId: 'brick-1x1', x: 3, z: 3 })
    const ghost = brick({
      partId: 'brick-1x1',
      x: 2,
      y: 3,
      z: 3,
      offset: { x: 1, z: 0 },
    })
    expect(isValidPlacement(ghost, [support1, support2])).toBe(true)
  })

  describe('hinge placement', () => {
    it('allows a z-axis hinge brick resting on the baseplate (y=0)', () => {
      expect(isValidPlacement(brick({ hinge: 'z' }), [])).toBe(true)
    })

    it('allows an x-axis hinge brick resting on the baseplate (y=0)', () => {
      expect(isValidPlacement(brick({ hinge: 'x' }), [])).toBe(true)
    })

    it('rejects a floating hinge brick (y>0, nothing below)', () => {
      expect(isValidPlacement(brick({ y: 3, hinge: 'z' }), [])).toBe(false)
    })

    it('rejects a colliding hinge brick at the same grid position as an existing brick', () => {
      const existing = brick({ id: 'existing' })
      expect(isValidPlacement(brick({ hinge: 'x' }), [existing])).toBe(false)
    })

    it('allows stacking a hinge brick on top of a supporting brick', () => {
      const support = brick({ id: 'support' })
      expect(isValidPlacement(brick({ y: 3, hinge: 'z' }), [support])).toBe(true)
    })
  })
})
