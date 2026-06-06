import { describe, expect, it } from 'vitest'

import {
  evaluateComponentBalance,
  type BalanceComponentBrick,
  type BrickPartDefinition,
} from '@/domain/physics/balance'

const brick1x1: BrickPartDefinition = {
  id: 'brick-1x1',
  footprint: [[0, 0]],
  height: 3,
}

const brick2x2: BrickPartDefinition = {
  id: 'brick-2x2',
  footprint: [
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1],
  ],
  height: 3,
}

function buildBrick(
  part: BrickPartDefinition,
  x: number,
  y: number,
  z: number,
  rot: 0 | 1 | 2 | 3 = 0,
): BalanceComponentBrick {
  return {
    part,
    position: { x, y, z },
    rotation: rot,
  }
}

function sortPoints(points: ReadonlyArray<readonly [number, number]>) {
  return [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1])
}

describe('evaluateComponentBalance', () => {
  it('marks a component as balanced when its CoM projects inside the support hull', () => {
    const result = evaluateComponentBalance([
      buildBrick(brick2x2, 0, 0, 0),
      buildBrick(brick2x2, 0, 3, 0),
    ])

    expect(result.isBalanced).toBe(true)
    expect(result.totalMass).toBe(24)
    expect(result.centerOfMass).toEqual({ x: 1, y: 3, z: 1 })
    expect(sortPoints(result.supportFootprint)).toEqual(
      sortPoints([
      [0.5, 0.5],
      [1.5, 0.5],
      [1.5, 1.5],
      [0.5, 1.5],
      ]),
    )
  })

  it('marks a component as unbalanced when its CoM falls outside the support footprint', () => {
    const result = evaluateComponentBalance([
      buildBrick(brick1x1, 0, 0, 0),
      buildBrick(brick2x2, 1, 3, 0),
    ])

    expect(result.isBalanced).toBe(false)
    expect(result.centerOfMass.x).toBeGreaterThan(0.5)
    expect(result.supportContacts).toEqual([[0.5, 0.5]])
  })

  it('treats a degenerate single-stud support as balanced only when the CoM aligns with it', () => {
    const result = evaluateComponentBalance([
      buildBrick(brick1x1, 2, 0, 3),
      buildBrick(brick1x1, 2, 3, 3),
    ])

    expect(result.isBalanced).toBe(true)
    expect(result.centerOfMass).toEqual({ x: 2.5, y: 3, z: 3.5 })
    expect(result.supportFootprint).toEqual([[2.5, 3.5]])
  })
})
