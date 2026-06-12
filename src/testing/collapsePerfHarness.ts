import { selectCollapsingBricks } from '../domain/physics/collapse'
import {
  createCollapseTransaction,
  advanceCollapseTransaction,
} from '../domain/physics/collapseSimulation'
import { createCollapseSceneBodies } from '../scene/collapseSceneBodies'
import { useBuildStore } from '../state/store'
import type { PlacedBrick, BrickBodySnapshot } from '../domain/model/types'

export interface MeasureCollapsePerfInput {
  brickData: PlacedBrick[]
  targetFrames: number
}

export interface MeasureCollapsePerfResult {
  frameTimes: number[]
  setupFrameTimes: number[]
  computeMs: number
  collapsingCount: number
}

/**
 * Bundles the collapse performance measurement logic with static source imports
 * so Vite can resolve it for e2e/preview mode. Called from Playwright specs
 * via window.__blockyCollapsePerf.
 */
export async function measureCollapsePerf({
  brickData,
  targetFrames,
}: MeasureCollapsePerfInput): Promise<MeasureCollapsePerfResult> {
  // Load the stress build through the real app state.
  useBuildStore.setState({
    bricks: Object.fromEntries(brickData.map((brick) => [brick.id, brick])),
  })
  const loadedBricks = Object.values(useBuildStore.getState().bricks)

  const setupFrameTimes: number[] = []
  await new Promise<void>((resolve) => {
    let last: number | null = null
    const settle = () => {
      const now = performance.now()
      if (last !== null) {
        setupFrameTimes.push(now - last)
      }
      last = now
      if (setupFrameTimes.length >= 10) {
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
  let transaction: any = null

  await new Promise<void>((resolve) => {
    let last: number | null = null
    let count = 0

    function tick(ts: number): void {
      if (last !== null) {
        frameTimes.push(ts - last)
      }

      if (count === 0) {
        // First RAF: invoke the real selectCollapsingBricks — exercises
        // PART_CATALOG, buildConnectionGraph (stud-connection geometry,
        // rotation-aware cell footprint), getFloatingBricks (BFS from y=0),
        // and getUnbalancedBricks (connected components, convex hull, CoM).
        // Any main-thread stall appears as an extended next-frame delta.
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

        // Create a real CollapseTransaction through the actual app pipeline.
        transaction = createCollapseTransaction({
          allBricks: loadedBricks,
          collapsingBodies,
          timings: { settleDelayMs: 0, fadeDurationMs: 100 },
        })
      }

      if (count > 0 && transaction !== null) {
        // Subsequent frames: advance the collapse animation state and rebuild
        // scene bodies — exercises advanceCollapseTransaction phase logic and
        // createCollapseSceneBodies (the dynamic body creation pipeline).
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
