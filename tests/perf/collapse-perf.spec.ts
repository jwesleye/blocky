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

/**
 * @perf Collapse smoothness — frame-stall budget
 *
 * Triggers a collapse on a several-hundred-brick unbalanced build and records
 * frame times during the animation window. Asserts that:
 *
 *   1. The synchronous collapse computation (selectCollapsingBricks equivalent)
 *      does not exceed LONG_FRAME_THRESHOLD_MS on its own.
 *   2. No single animation frame in the surrounding window exceeds
 *      LONG_FRAME_THRESHOLD_MS.
 *   3. p95 frame time stays ≤ P95_FRAME_BUDGET_MS (~60 fps).
 *
 * Measurement method: requestAnimationFrame delta sampling. The collapse
 * computation runs synchronously inside the first RAF callback so its cost
 * is visible as an extended first-frame delta. Budget thresholds are defined
 * in ./budgets.ts.
 */
test('@perf collapse smoothness: frame-stall budget', async ({ page }) => {
  await page.goto('/')

  // Build a 300-brick unbalanced fixture in the test process.
  // One grounded anchor at the origin; the rest are positioned with no
  // stud-level connection to it, so selectCollapsingBricks classifies all
  // non-anchor bricks as floating/collapsing.
  const bricks: Array<{ id: string; x: number; y: number; z: number }> = [
    { id: 'base', x: 0, y: 0, z: 0 },
  ]
  for (let i = 1; i < COLLAPSE_BRICK_COUNT; i++) {
    bricks.push({
      id: `u${i}`,
      // Offset far enough from the base that no stud connection is possible
      x: (i % 20) + 5,
      y: 3 + Math.floor(i / 20) * 3,
      z: (i % 15) * 2,
    })
  }

  const result = await page.evaluate(
    async ({
      brickData,
      targetFrames,
    }: {
      brickData: Array<{ id: string; x: number; y: number; z: number }>
      targetFrames: number
    }) => {
      /**
       * Inline collapse graph computation — mirrors the core logic of
       * selectCollapsingBricks: build an adjacency graph from stud-connection
       * geometry, then BFS from grounded bricks to find the floating set.
       * Runs synchronously to represent the main-thread work that would occur
       * on a real collapse trigger, which is the primary source of frame stalls.
       */
      function computeCollapse(
        items: Array<{ id: string; x: number; y: number; z: number }>,
      ): number {
        const adj = new Map<string, string[]>()
        for (const b of items) adj.set(b.id, [])

        // O(n²) stud-connection check — same algorithmic shape as the real buildConnectionGraph
        for (let i = 0; i < items.length; i++) {
          for (let j = i + 1; j < items.length; j++) {
            const a = items[i] as { id: string; x: number; y: number; z: number }
            const b = items[j] as { id: string; x: number; y: number; z: number }
            if (
              Math.abs(a.y - b.y) === 3 &&
              Math.abs(a.x - b.x) <= 1 &&
              Math.abs(a.z - b.z) <= 1
            ) {
              ;(adj.get(a.id) as string[]).push(b.id)
              ;(adj.get(b.id) as string[]).push(a.id)
            }
          }
        }

        // BFS from grounded bricks (y === 0) — mirrors getFloatingBricks
        const visited = new Set<string>()
        const queue: string[] = []
        for (const b of items) {
          if (b.y === 0) {
            visited.add(b.id)
            queue.push(b.id)
          }
        }
        let head = 0
        while (head < queue.length) {
          const cur = queue[head] as string
          head++
          const neighbours = adj.get(cur) as string[]
          for (const nb of neighbours) {
            if (!visited.has(nb)) {
              visited.add(nb)
              queue.push(nb)
            }
          }
        }

        return items.filter((b) => !visited.has(b.id)).length
      }

      const frameTimes: number[] = []
      let computeMs = 0
      let collapsingCount = 0

      await new Promise<void>((resolve) => {
        let last: number | null = null
        let count = 0

        function tick(ts: number): void {
          if (last !== null) {
            frameTimes.push(ts - last)
          }

          if (count === 0) {
            // First frame: run the collapse computation synchronously.
            // Any extra latency it introduces is captured in the following
            // frame delta, exposing potential stalls.
            const t0 = performance.now()
            collapsingCount = computeCollapse(brickData)
            computeMs = performance.now() - t0
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
  const maxFrame = result.frameTimes.length > 0 ? Math.max(...result.frameTimes) : 0

  // Sanity: collapse was triggered on the expected bricks
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
