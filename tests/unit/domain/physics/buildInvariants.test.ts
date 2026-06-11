import { describe, expect, it } from 'vitest'

import type { PlacedBrick } from '@/domain/model/types'
import { findBuildInvariantViolations } from '@/domain/physics/buildInvariants'

const brick = (
  overrides: Partial<PlacedBrick> & { id: string },
): PlacedBrick => ({
  partId: 'brick-1x1',
  color: 'red',
  x: 0,
  y: 0,
  z: 0,
  rot: 0,
  ...overrides,
})

describe('findBuildInvariantViolations', () => {
  it('reports no violations for a grounded, non-overlapping build', () => {
    const result = findBuildInvariantViolations([
      brick({ id: 'a', x: 0, z: 0 }),
      brick({ id: 'b', x: 4, z: 4 }),
    ])
    expect(result.floating).toEqual([])
    expect(result.colliding).toEqual([])
  })

  it('reports no violations for a legitimately stacked, connected build', () => {
    // Standard bricks are 3 plate units tall; 'top' rests on 'base' top studs.
    const result = findBuildInvariantViolations([
      brick({ id: 'base', x: 0, z: 0, y: 0 }),
      brick({ id: 'top', x: 0, z: 0, y: 3 }),
    ])
    expect(result.floating).toEqual([])
    expect(result.colliding).toEqual([])
  })

  it('flags a brick with no transitive path to the baseplate as floating', () => {
    const result = findBuildInvariantViolations([
      brick({ id: 'grounded', x: 0, z: 0, y: 0 }),
      brick({ id: 'hovering', x: 10, z: 10, y: 30 }),
    ])
    expect(result.floating).toContain('hovering')
    expect(result.floating).not.toContain('grounded')
    expect(result.colliding).toEqual([])
  })

  it('flags both bricks sharing an occupied cell as colliding', () => {
    const result = findBuildInvariantViolations([
      brick({ id: 'one', x: 0, z: 0, y: 0 }),
      brick({ id: 'two', x: 0, z: 0, y: 0 }),
    ])
    expect(result.colliding).toContain('one')
    expect(result.colliding).toContain('two')
  })

  it('does not flag an unknown-part brick resting on the baseplate', () => {
    // Unknown parts are skipped by collision detection and, when sitting at
    // y=0, count as directly grounded — matching existing placement semantics
    // rather than introducing a stricter rule than the issue asks for.
    const result = findBuildInvariantViolations([
      brick({ id: 'unknown', partId: 'not-a-real-part', x: 5, z: 5, y: 0 }),
    ])
    expect(result.floating).toEqual([])
    expect(result.colliding).toEqual([])
  })
})
