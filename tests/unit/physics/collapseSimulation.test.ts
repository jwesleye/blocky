import { describe, expect, it } from 'vitest'

import type { BrickBodySnapshot, PlacedBrick } from '@/domain/model/types'
import {
  advanceCollapseTransaction,
  brickToBodySnapshot,
  bricksToBodySnapshots,
  createCollapseTransaction,
  markCollapseBodySettled,
  restoreCollapseUndoSnapshot,
} from '@/domain/physics'
import { getBrickColor } from '@/domain/model/colors'
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

describe('brickToBodySnapshot', () => {
  it('places a brick at its grid-derived center with catalog dimensions', () => {
    const brick: PlacedBrick = {
      id: 'b1',
      partId: 'brick-2x4',
      color: 'red',
      x: 4,
      y: 3,
      z: 2,
      rot: 0,
    }

    const snapshot = brickToBodySnapshot(brick)

    // brick-2x4: width 2 studs, length 4 studs, height 3 plate units.
    expect(snapshot.size).toEqual([2, 3, 4])
    // Position is the center of the occupied volume, not the corner origin.
    expect(snapshot.position).toEqual([4 + 1, 3 + 1.5, 2 + 2])
    expect(snapshot.id).toBe('b1')
    expect(snapshot.color).toBe(getBrickColor('red')?.hex)
  })

  it('swaps width and length for 90-degree rotations', () => {
    const rotated = brickToBodySnapshot({
      id: 'b2',
      partId: 'brick-2x4',
      color: 'blue',
      x: 0,
      y: 0,
      z: 0,
      rot: 1,
    })

    expect(rotated.size).toEqual([4, 3, 2])
    expect(rotated.position).toEqual([2, 1.5, 1])
  })

  it('throws for an unknown part id', () => {
    expect(() =>
      brickToBodySnapshot({
        id: 'x',
        partId: 'not-a-real-part',
        color: 'red',
        x: 0,
        y: 0,
        z: 0,
        rot: 0,
      }),
    ).toThrow()
  })

  it('converts a batch of bricks preserving order and ids', () => {
    const snapshots = bricksToBodySnapshots([
      placedBrick('a'),
      placedBrick('b'),
    ])
    expect(snapshots.map((s) => s.id)).toEqual(['a', 'b'])
  })
})

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
