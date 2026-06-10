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
    const ghost = brick({ partId: 'brick-1x1', x: 2, z: 3, offset: { x: 1, z: 0 } })
    expect(isValidPlacement(ghost, [existing])).toBe(false)
  })

  it('allows a lone offset brick on the baseplate', () => {
    const ghost = brick({ partId: 'brick-1x1', x: 2, z: 3, offset: { x: 1, z: 0 } })
    expect(isValidPlacement(ghost, [])).toBe(true)
  })

  it('allows a valid jumper interlock', () => {
    const support1 = brick({ id: 's1', partId: 'brick-1x1', x: 2, z: 3 })
    const support2 = brick({ id: 's2', partId: 'brick-1x1', x: 3, z: 3 })
    const ghost = brick({ partId: 'brick-1x1', x: 2, y: 3, z: 3, offset: { x: 1, z: 0 } })
    expect(isValidPlacement(ghost, [support1, support2])).toBe(true)
  })
})
