import type { PlacedBrick } from '../domain/model/types'
import { useBuildStore } from '../state/store'

export interface MeasureRenderPerfInput {
  brickData: PlacedBrick[]
  targetFrames: number
}

export interface MeasureRenderPerfResult {
  frameTimes: number[]
  setupFrameTimes: number[]
}

const SETTLE_FRAME_COUNT = 10

async function sampleInvalidatedFrameTimes(frames: number): Promise<number[]> {
  const deltas: number[] = []

  await new Promise<void>((resolve) => {
    let previousTs: number | null = null

    const tick = (ts: number) => {
      if (previousTs !== null) {
        deltas.push(ts - previousTs)
      }
      previousTs = ts

      if (deltas.length >= frames) {
        resolve()
        return
      }

      window.__blockyInvalidateScene?.()
      requestAnimationFrame(tick)
    }

    requestAnimationFrame(tick)
  })

  return deltas
}

export async function measureRenderPerf({
  brickData,
  targetFrames,
}: MeasureRenderPerfInput): Promise<MeasureRenderPerfResult> {
  useBuildStore.setState({
    bricks: Object.fromEntries(brickData.map((brick) => [brick.id, brick])),
  })

  window.__blockyInvalidateScene?.()

  const setupFrameTimes = await sampleInvalidatedFrameTimes(SETTLE_FRAME_COUNT)
  const frameTimes = await sampleInvalidatedFrameTimes(targetFrames)

  return { frameTimes, setupFrameTimes }
}
