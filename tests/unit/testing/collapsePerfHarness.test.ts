import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

import { measureCollapsePerf } from '@/testing/collapsePerfHarness'
import { COLLAPSE_BRICK_COUNT } from '../../perf/budgets'

type FixtureBrick = {
  id: string
  partId: string
  color: string
  x: number
  y: number
  z: number
  rot: 0 | 1 | 2 | 3
}

function buildTestFixture(count: number): FixtureBrick[] {
  const bricks: FixtureBrick[] = [
    { id: 'base', partId: 'brick-1x1', color: 'red', x: 0, y: 0, z: 0, rot: 0 },
    { id: 'overhang', partId: 'brick-2x4', color: 'blue', x: 0, y: 3, z: 0, rot: 0 },
  ]
  const floatingPartIds = ['brick-2x4', 'brick-1x2', 'plate-2x4', 'brick-2x2']
  for (let i = 2; i < count; i++) {
    bricks.push({
      id: `f${i}`,
      partId: floatingPartIds[i % floatingPartIds.length] as string,
      color: 'light-gray',
      x: 50 + (i % 20) * 5,
      y: 3,
      z: Math.floor(i / 20) * 5,
      rot: (i % 4) as 0 | 1 | 2 | 3,
    })
  }
  return bricks
}

describe('measureCollapsePerf', () => {
  let rafTime = 0

  beforeEach(() => {
    rafTime = 0
    // Synchronous stub: call the RAF callback immediately with a monotonic ts.
    // This makes both Promise executors in the harness (setup + measurement phases)
    // complete synchronously so a single top-level `await` drains the full pipeline.
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      rafTime += 16
      cb(rafTime)
      return 0
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns at least one collapsing brick for the unbalanced+floating fixture', async () => {
    const brickData = buildTestFixture(COLLAPSE_BRICK_COUNT)
    const result = await measureCollapsePerf({ brickData, targetFrames: 5 })
    expect(result.collapsingCount).toBeGreaterThan(0)
  })

  it('records setup frame samples', async () => {
    const brickData = buildTestFixture(10)
    const result = await measureCollapsePerf({ brickData, targetFrames: 3 })
    // 10 settle calls, first has no prior timestamp → 9 diffs
    expect(result.setupFrameTimes.length).toBe(9)
  })

  it('returns numeric computeMs', async () => {
    const brickData = buildTestFixture(10)
    const result = await measureCollapsePerf({ brickData, targetFrames: 3 })
    expect(typeof result.computeMs).toBe('number')
    expect(result.computeMs).toBeGreaterThanOrEqual(0)
  })

  it('returns frame samples equal to targetFrames', async () => {
    const brickData = buildTestFixture(10)
    const targetFrames = 4
    const result = await measureCollapsePerf({ brickData, targetFrames })
    // tick loop: count 0..targetFrames, first call has no prior ts → targetFrames diffs
    expect(result.frameTimes.length).toBe(targetFrames)
  })
})
