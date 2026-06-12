import { beforeEach, describe, expect, it, vi } from 'vitest'

import { measureRenderPerf } from '@/testing/renderPerfHarness'
import { useBuildStore } from '@/state/store'

describe('renderPerfHarness', () => {
  beforeEach(() => {
    useBuildStore.setState({ bricks: {} })

    let frameTimestamp = 0
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      frameTimestamp += 16
      setTimeout(() => cb(frameTimestamp), 0)
      return frameTimestamp
    })

    window.__blockyInvalidateScene = vi.fn()
  })

  it('warms the scene before sampling explicit redraw frame times', async () => {
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
        id: 'stacked',
        partId: 'brick-1x1',
        color: 'blue',
        x: 0,
        y: 3,
        z: 0,
        rot: 0 as const,
      },
    ]

    const result = await measureRenderPerf({
      brickData,
      targetFrames: 5,
    })

    expect(Object.values(useBuildStore.getState().bricks)).toHaveLength(2)
    expect(result.setupFrameTimes).toHaveLength(10)
    expect(result.frameTimes).toHaveLength(5)
    expect(result.setupFrameTimes.every((frameTime) => frameTime === 16)).toBe(
      true,
    )
    expect(result.frameTimes.every((frameTime) => frameTime === 16)).toBe(true)
    expect(window.__blockyInvalidateScene).toHaveBeenCalledTimes(16)
  })
})
