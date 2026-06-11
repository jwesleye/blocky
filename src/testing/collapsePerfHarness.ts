import { selectCollapsingBricks } from '@/domain/physics/collapse'
import {
  createCollapseTransaction,
  advanceCollapseTransaction,
} from '@/domain/physics/collapseSimulation'
import { createCollapseSceneBodies } from '@/scene/collapseSceneBodies'
import { useBuildStore } from '@/state/store'
import type { PlacedBrick } from '@/domain/model/types'
import type { BrickBodySnapshot } from '@/domain/model/types'

export interface CollapsePerfInput {
  brickData: PlacedBrick[]
  targetFrames: number
}

export interface CollapsePerfResult {
  frameTimes: number[]
  setupFrameTimes: number[]
  computeMs: number
  collapsingCount: number
}

export async function measureCollapsePerf({
  brickData,
  targetFrames,
}: CollapsePerfInput): Promise<CollapsePerfResult> {
  useBuildStore.setState({
    bricks: Object.fromEntries(brickData.map((brick) => [brick.id, brick])),
  })
  const loadedBricks = Object.values(useBuildStore.getState().bricks)

  const setupFrameTimes: number[] = []
  await new Promise<void>((resolve) => {
    let frames = 0
    let last: number | null = null
    const settle = () => {
      const now = performance.now()
      if (last !== null) {
        setupFrameTimes.push(now - last)
      }
      last = now
      frames += 1
      if (frames >= 10) {
        resolve()
        return
      }
      requestAnimationFrame(settle)
    }
    requestAnimationFrame(settle)
  })

  const frameTimes: number[] = []
  let computeMs = 0
  let collapsingCount = 0
  let transaction: ReturnType<typeof createCollapseTransaction> | null = null

  await new Promise<void>((resolve) => {
    let last: number | null = null
    let count = 0

    function tick(ts: number): void {
      if (last !== null) {
        frameTimes.push(ts - last)
      }

      if (count === 0) {
        const t0 = performance.now()
        const collapsingSet = selectCollapsingBricks(loadedBricks)
        computeMs = performance.now() - t0
        collapsingCount = collapsingSet.size

        const collapsingBodies: BrickBodySnapshot[] = loadedBricks
          .filter((b) => collapsingSet.has(b.id))
          .map((b) => ({
            id: b.id,
            partId: b.partId,
            color: b.color,
            position: [b.x, b.y, b.z] as [number, number, number],
            size: [2, 3, 4] as [number, number, number],
          }))

        transaction = createCollapseTransaction({
          allBricks: loadedBricks,
          collapsingBodies,
          timings: { settleDelayMs: 0, fadeDurationMs: 100 },
        })
      }

      if (count > 0 && transaction !== null) {
        transaction = advanceCollapseTransaction(transaction, ts)
        createCollapseSceneBodies(transaction, [])
      }

      last = ts
      count++

      if (count < targetFrames + 1) {
        requestAnimationFrame(tick)
      } else {
        resolve()
      }
    }

    requestAnimationFrame(tick)
  })

  return { frameTimes, setupFrameTimes, computeMs, collapsingCount }
}
