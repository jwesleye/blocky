import { test, expect } from '@playwright/test'

import {
  COLLAPSE_BRICK_COUNT,
  LONG_FRAME_THRESHOLD_MS,
  MIN_SAMPLE_FRAMES,
  P95_FRAME_BUDGET_MS,
} from './budgets'

/** Returns the p-th percentile value from a pre-sorted ascending array. */
function percentile(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) return 0
  const idx = Math.ceil((p / 100) * sortedAsc.length) - 1
  return sortedAsc[Math.max(0, idx)] as number
}

type FixtureBrick = {
  id: string
  partId: string
  color: string
  x: number
  y: number
  z: number
  rot: 0 | 1 | 2 | 3
}

/**
 * @perf Collapse smoothness — frame-stall budget
 *
 * Loads a several-hundred-brick stress build through the real app state, invokes
 * the actual collapse trigger (selectCollapsingBricks via PART_CATALOG,
 * buildConnectionGraph, getFloatingBricks, getUnbalancedBricks), then drives the
 * full collapse animation pipeline (createCollapseTransaction,
 * advanceCollapseTransaction, createCollapseSceneBodies) while sampling RAF frame
 * deltas. Asserts:
 *
 *   1. Synchronous collapse computation < LONG_FRAME_THRESHOLD_MS.
 *   2. No single frame in the animation window exceeds LONG_FRAME_THRESHOLD_MS.
 *   3. p95 frame time ≤ P95_FRAME_BUDGET_MS (~60 fps).
 *
 * Budget thresholds are defined in ./budgets.ts.
 */
test('@perf collapse smoothness: frame-stall budget', async ({ page }) => {
  await page.goto('/')

  // Stress fixture: two bricks form an unbalanced tower (narrow 1×1 base with a
  // wide 2×4 overhang) to exercise getUnbalancedBricks → computeSupportFootprint,
  // computeCoM, isBalanced, and the d3-polygon convex hull path.
  // The remaining bricks are floating (y=3, far from any y=0 brick) to exercise
  // buildConnectionGraph + getFloatingBricks BFS with mixed partIds and all four
  // rotations — covering PART_CATALOG footprint and rotation-aware cell geometry.
  const bricks: FixtureBrick[] = [
    { id: 'base', partId: 'brick-1x1', color: 'red', x: 0, y: 0, z: 0, rot: 0 },
    // CoM of this component projects outside the 1×1 support hull → unbalanced
    { id: 'overhang', partId: 'brick-2x4', color: 'blue', x: 0, y: 3, z: 0, rot: 0 },
  ]
  const floatingPartIds = ['brick-2x4', 'brick-1x2', 'plate-2x4', 'brick-2x2']
  for (let i = 2; i < COLLAPSE_BRICK_COUNT; i++) {
    bricks.push({
      id: `f${i}`,
      partId: floatingPartIds[i % floatingPartIds.length] as string,
      color: 'gray',
      // Offset far from the anchor so no stud connection forms
      x: 50 + (i % 20) * 5,
      y: 3,
      z: Math.floor(i / 20) * 5,
      rot: (i % 4) as 0 | 1 | 2 | 3,
    })
  }

  const result = await page.evaluate(
    async ({
      brickData,
      targetFrames,
    }: {
      brickData: FixtureBrick[]
      targetFrames: number
    }) => {
      // Import the real app modules from the Vite dev server.
      // String variables prevent TypeScript from statically resolving these
      // dev-server URLs; the imports run in the browser's module cache so
      // PART_CATALOG, buildConnectionGraph, graphology, and d3-polygon are the
      // exact same instances the app uses.
      const collapsePath: string = '/src/domain/physics/collapse.ts'
      const simPath: string = '/src/domain/physics/collapseSimulation.ts'
      const scenePath: string = '/src/scene/collapseSceneBodies.ts'
      const storePath: string = '/src/state/useStore.ts'

      const collapseModule = await import(collapsePath)
      const simModule = await import(simPath)
      const sceneModule = await import(scenePath)
      const storeModule = await import(storePath)

      type CollapseBodyInput = {
        id: string
        partId: string
        color: string
        position: [number, number, number]
        size: [number, number, number]
      }
      type Transaction = {
        phase: string
        collapsingBodies: ReadonlyArray<{
          id: string
          settledAtMs: number | null
        }>
        fadeStartedAtMs: number | null
      }

      const selectCollapsingBricks = collapseModule.selectCollapsingBricks as (
        bricks: FixtureBrick[],
      ) => Set<string>
      const createCollapseTransaction =
        simModule.createCollapseTransaction as (input: {
          allBricks: readonly FixtureBrick[]
          collapsingBodies: readonly CollapseBodyInput[]
          timings?: { settleDelayMs?: number; fadeDurationMs?: number }
        }) => Transaction
      const advanceCollapseTransaction =
        simModule.advanceCollapseTransaction as (
          t: Transaction,
          nowMs: number,
        ) => Transaction
      const createCollapseSceneBodies =
        sceneModule.createCollapseSceneBodies as (
          t: Transaction,
          staticBodies: readonly unknown[],
        ) => unknown[]
      const useStore = storeModule.useStore as {
        getState: () => {
          bricks: FixtureBrick[]
          setBricks: (b: FixtureBrick[]) => void
        }
      }

      // Load the stress build through the real app state.
      useStore.getState().setBricks(brickData)
      const loadedBricks = useStore.getState().bricks

      const frameTimes: number[] = []
      let computeMs = 0
      let collapsingCount = 0
      let transaction: Transaction | null = null

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

            const collapsingBodies: CollapseBodyInput[] = loadedBricks
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

      return { frameTimes, computeMs, collapsingCount }
    },
    { brickData: bricks, targetFrames: MIN_SAMPLE_FRAMES },
  )

  const sorted = [...result.frameTimes].sort((a, b) => a - b)
  const p95 = percentile(sorted, 95)
  const maxFrame =
    result.frameTimes.length > 0 ? Math.max(...result.frameTimes) : 0

  // Sanity: the real selectCollapsingBricks classified at least one brick
  expect(result.collapsingCount).toBeGreaterThan(0)

  // The synchronous collapse computation alone must not block the main thread
  // long enough to cause a frame stall.
  expect(
    result.computeMs,
    `collapse computation (${COLLAPSE_BRICK_COUNT} bricks) took ${result.computeMs.toFixed(1)} ms — must stay under the ${LONG_FRAME_THRESHOLD_MS} ms long-frame threshold`,
  ).toBeLessThan(LONG_FRAME_THRESHOLD_MS)

  // No single frame during the collapse animation window may stall.
  expect(
    maxFrame,
    `max frame time ${maxFrame.toFixed(1)} ms exceeds the ${LONG_FRAME_THRESHOLD_MS} ms long-frame threshold`,
  ).toBeLessThan(LONG_FRAME_THRESHOLD_MS)

  // p95 must stay within the ~60 fps render budget.
  expect(
    p95,
    `p95 frame time ${p95.toFixed(1)} ms exceeds the ${P95_FRAME_BUDGET_MS} ms render budget`,
  ).toBeLessThanOrEqual(P95_FRAME_BUDGET_MS)
})
