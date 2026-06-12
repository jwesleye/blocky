import { describe, it, expect, vi, beforeEach } from 'vitest'
import { measureCollapsePerf } from '@/testing/collapsePerfHarness'
import { useBuildStore } from '@/state/store'

describe('collapsePerfHarness', () => {
  beforeEach(() => {
    useBuildStore.setState({ bricks: {} })
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      setTimeout(() => cb(performance.now()), 0)
    })
  })

  it('measures collapse performance for a floating fixture', async () => {
    const brickData = [
      {
        id: 'base',
        partId: 'brick-1x1',
        color: 'red',
        x: 0,
        y: 0,
        z: 0,
        rot: 0 as const,
      },
      {
        id: 'floating',
        partId: 'brick-1x1',
        color: 'blue',
        x: 10,
        y: 10,
        z: 10,
        rot: 0 as const,
      },
    ]

    const result = await measureCollapsePerf({
      brickData,
      targetFrames: 5,
    })

    // At least one brick (the floating one) should collapse
    expect(result.collapsingCount).toBeGreaterThanOrEqual(1)
    // Should have sampled at least the requested target frames
    expect(result.frameTimes.length).toBeGreaterThanOrEqual(5)
    // Should have 10 setup frames as hardcoded in the harness
    expect(result.setupFrameTimes.length).toBe(10)
    expect(typeof result.computeMs).toBe('number')
    expect(result.computeMs).toBeGreaterThanOrEqual(0)
  })
})
