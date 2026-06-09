import { describe, expect, it } from 'vitest'

import type { BrickBodySnapshot } from '@/domain/model/types'
import { createCollapseTransaction } from '@/domain/physics'
import { createCollapseSceneBodies } from '@/scene/collapseSceneBodies'

function snapshot(id: string): BrickBodySnapshot {
  return {
    id,
    partId: 'brick-1x1',
    color: '#C4282B',
    position: [0, 0, 0],
    size: [1, 3, 1],
  }
}

describe('createCollapseSceneBodies classification', () => {
  it('marks the stable remainder fixed and the sheared bricks dynamic', () => {
    const transaction = createCollapseTransaction({
      allBricks: [],
      collapsingBodies: [snapshot('shear-a'), snapshot('shear-b')],
    })

    const bodies = createCollapseSceneBodies(transaction, [
      snapshot('stable-a'),
      snapshot('stable-b'),
    ])

    const byType = (type: 'fixed' | 'dynamic') =>
      bodies.filter((b) => b.bodyType === type).map((b) => b.id)

    expect(byType('fixed')).toEqual(['stable-a', 'stable-b'])
    expect(byType('dynamic')).toEqual(['shear-a', 'shear-b'])
  })

  it('never duplicates a body id between the static and dynamic sets', () => {
    const transaction = createCollapseTransaction({
      allBricks: [],
      collapsingBodies: [snapshot('shear-a')],
    })

    const bodies = createCollapseSceneBodies(transaction, [
      snapshot('stable-a'),
    ])
    const ids = bodies.map((b) => b.id)

    expect(new Set(ids).size).toBe(ids.length)
  })
})
