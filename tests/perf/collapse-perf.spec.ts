import { test, expect } from '@playwright/test'

import {
  BUDGET_DOC_URL,
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
 * buildConnectionGraph, getFloatingBricks, findShearRegion), then drives the
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
  // wide 2x4 overhang) to exercise findShearRegion, computeSupportFootprint,
  // computeCoM, isBalanced, and the d3-polygon convex hull path.
  // The remaining bricks are floating (y=3, far from any y=0 brick) to exercise
  // buildConnectionGraph + getFloatingBricks BFS with mixed partIds and all four
  // rotations — covering PART_CATALOG footprint and rotation-aware cell geometry.
  const bricks: FixtureBrick[] = [
    { id: 'base', partId: 'brick-1x1', color: 'red', x: 0, y: 0, z: 0, rot: 0 },
    // CoM of this component projects outside the 1×1 support hull → unbalanced
    {
      id: 'overhang',
      partId: 'brick-2x4',
      color: 'blue',
      x: 0,
      y: 3,
      z: 0,
      rot: 0,
    },
  ]
  const floatingPartIds = ['brick-2x4', 'brick-1x2', 'plate-2x4', 'brick-2x2']
  for (let i = 2; i < COLLAPSE_BRICK_COUNT; i++) {
    bricks.push({
      id: `f${i}`,
      partId: floatingPartIds[i % floatingPartIds.length] as string,
      color: 'light-gray',
      // Offset far from the anchor so no stud connection forms
      x: 50 + (i % 20) * 5,
      y: 3,
      z: Math.floor(i / 20) * 5,
      rot: (i % 4) as 0 | 1 | 2 | 3,
    })
  }

  await page.waitForFunction(
    () =>
      (
        window as Window & {
          __blockyCollapsePerf?: { measureCollapsePerf?: unknown }
        }
      ).__blockyCollapsePerf?.measureCollapsePerf !== undefined,
  )

  const result = (await page.evaluate(
    async ({
      brickData,
      targetFrames,
    }: {
      brickData: FixtureBrick[]
      targetFrames: number
    }) => {
      return (
        window as Window & {
          __blockyCollapsePerf: {
            measureCollapsePerf: (input: {
              brickData: typeof brickData
              targetFrames: number
            }) => unknown
          }
        }
      ).__blockyCollapsePerf.measureCollapsePerf({
        brickData,
        targetFrames,
      })
    },
    { brickData: bricks, targetFrames: MIN_SAMPLE_FRAMES },
  )) as import('@/testing/collapsePerfHarness').MeasureCollapsePerfResult

  const setupSorted = [...result.setupFrameTimes].sort((a, b) => a - b)
  const baselineFrameMs = percentile(setupSorted, 50)
  const collapseFrameTimes = result.frameTimes.map((frameMs) =>
    Math.max(0, frameMs - baselineFrameMs),
  )
  const sorted = [...collapseFrameTimes].sort((a, b) => a - b)
  const p95 = percentile(sorted, 95)
  const maxFrame =
    collapseFrameTimes.length > 0 ? Math.max(...collapseFrameTimes) : 0

  // Sanity: the real selectCollapsingBricks classified at least one brick
  expect(result.collapsingCount).toBeGreaterThan(0)

  // The synchronous collapse computation alone must not block the main thread
  // long enough to cause a frame stall.
  expect(
    result.computeMs,
    `collapse computation (${COLLAPSE_BRICK_COUNT} bricks) took ${result.computeMs.toFixed(1)} ms — must stay under the ${LONG_FRAME_THRESHOLD_MS} ms long-frame threshold. See ${BUDGET_DOC_URL} for details.`,
  ).toBeLessThan(LONG_FRAME_THRESHOLD_MS)

  // No single frame during the collapse animation window may stall.
  expect(
    maxFrame,
    `max frame time above baseline ${maxFrame.toFixed(1)} ms exceeds the ${LONG_FRAME_THRESHOLD_MS} ms long-frame threshold. See ${BUDGET_DOC_URL} for details.`,
  ).toBeLessThan(LONG_FRAME_THRESHOLD_MS)

  // p95 must stay within the ~60 fps render budget.
  expect(
    p95,
    `p95 frame time above baseline ${p95.toFixed(1)} ms exceeds the ${P95_FRAME_BUDGET_MS} ms render budget. See ${BUDGET_DOC_URL} for details.`,
  ).toBeLessThanOrEqual(P95_FRAME_BUDGET_MS)
})
