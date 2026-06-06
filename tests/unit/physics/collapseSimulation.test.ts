import { describe, expect, it } from 'vitest'

import type { BrickBodySnapshot, PlacedBrick } from '@/domain/model/types'
import {
  advanceCollapseTransaction,
  createCollapseTransaction,
  markCollapseBodySettled,
  restoreCollapseUndoSnapshot,
} from '@/domain/physics'
import { createCollapseSceneBodies } from '@/scene/collapseSceneBodies'

function placedBrick(id: string): PlacedBrick {
  return {
    id,
    partId: 'brick-1x1',
    color: id === 'standing' ? 'blue' : 'red',
    x: 0,
    y: 0,
    z: 0,
    rot: 0,
  }
}

function collapseBody(id: string): BrickBodySnapshot {
  return {
    id,
    partId: 'brick-1x1',
    color: 'red',
    position: [0, 0, 0],
    size: [1, 1, 1],
  }
}

describe('collapse simulation transaction', () => {
  it('keeps a full undo snapshot of the pre-collapse build', () => {
    const transaction = createCollapseTransaction({
      allBricks: [placedBrick('standing'), placedBrick('falling')],
      collapsingBodies: [collapseBody('falling')],
    })

    expect(restoreCollapseUndoSnapshot(transaction)).toEqual([
      placedBrick('standing'),
      placedBrick('falling'),
    ])
    expect(transaction.standingBricks).toEqual([placedBrick('standing')])
  })

  it('stays tumbling until every collapsing body has settled', () => {
    const transaction = createCollapseTransaction({
      allBricks: [
        placedBrick('standing'),
        placedBrick('falling-a'),
        placedBrick('falling-b'),
      ],
      collapsingBodies: [collapseBody('falling-a'), collapseBody('falling-b')],
      timings: { settleDelayMs: 200, fadeDurationMs: 500 },
    })

    const partiallySettled = markCollapseBodySettled(
      transaction,
      'falling-a',
      1000,
    )
    const advanced = advanceCollapseTransaction(partiallySettled, 2000)

    expect(advanced.phase).toBe('tumbling')
    expect(advanced.fadeStartedAtMs).toBeNull()
  })

  it('waits the settle delay before entering fade-out', () => {
    const transaction = createCollapseTransaction({
      allBricks: [placedBrick('falling')],
      collapsingBodies: [collapseBody('falling')],
      timings: { settleDelayMs: 250, fadeDurationMs: 500 },
    })

    const settled = markCollapseBodySettled(transaction, 'falling', 1000)

    expect(advanceCollapseTransaction(settled, 1249).phase).toBe('tumbling')

    const fading = advanceCollapseTransaction(settled, 1250)
    expect(fading.phase).toBe('fading')
    expect(fading.fadeStartedAtMs).toBe(1250)
  })

  it('reduces opacity during fade and removes bodies when complete', () => {
    const transaction = createCollapseTransaction({
      allBricks: [placedBrick('falling')],
      collapsingBodies: [collapseBody('falling')],
      timings: { settleDelayMs: 100, fadeDurationMs: 400 },
    })

    const settled = markCollapseBodySettled(transaction, 'falling', 500)
    const fading = advanceCollapseTransaction(settled, 600)
    const halfway = advanceCollapseTransaction(fading, 800)
    const complete = advanceCollapseTransaction(fading, 1000)

    expect(halfway.phase).toBe('fading')
    expect(halfway.collapsingBodies[0]?.opacity).toBeCloseTo(0.5)
    expect(complete.phase).toBe('complete')
    expect(complete.collapsingBodies[0]?.opacity).toBe(0)
    expect(complete.removedBodyIds).toEqual(['falling'])
  })
})

describe('collapse scene body generation', () => {
  it('spawns only collapsing bricks as dynamic bodies and leaves the remainder fixed', () => {
    const transaction = createCollapseTransaction({
      allBricks: [placedBrick('standing'), placedBrick('falling')],
      collapsingBodies: [collapseBody('falling')],
    })

    const sceneBodies = createCollapseSceneBodies(transaction, [
      collapseBody('standing'),
    ])

    expect(sceneBodies).toEqual([
      expect.objectContaining({
        id: 'standing',
        bodyType: 'fixed',
        opacity: 1,
      }),
      expect.objectContaining({
        id: 'falling',
        bodyType: 'dynamic',
        opacity: 1,
      }),
    ])
  })
})
