/**
 * Render-performance harness for large builds.
 *
 * Measurement method: explicit redraw sampling against the R3F demand loop.
 * The test deterministically regenerates a 2,000-brick stress build in-process,
 * warms a short settle window to absorb scene update churn, then samples 60
 * invalidated redraws and asserts the p95 frame time stays within budget.
 *
 * The strict 17 ms p95 budget runs under playwright.perf.config.ts, which is
 * Chromium-only. Headless Firefox/WebKit rAF cadence can exceed 17 ms even
 * without app work, so cross-browser coverage stays in the e2e WebGL2 and smoke
 * specs while this budget remains tied to the stable Chromium perf harness.
 */

import { expect, test } from '@playwright/test'

import { generateStressBuildPlacedBricks } from '@/testing/stressBuild'
import {
  BUDGET_DOC_URL,
  MIN_SAMPLE_FRAMES as SAMPLE_FRAMES,
  P95_FRAME_BUDGET_MS as P95_BUDGET_MS,
} from './budgets'

type BlockyWindow = Window & {
  __blockyRenderPerf?: {
    measureRenderPerf: (input: {
      brickData: ReturnType<typeof generateStressBuildPlacedBricks>
      targetFrames: number
    }) => Promise<import('@/testing/renderPerfHarness').MeasureRenderPerfResult>
  }
}

test('p95 frame time <= 17ms with 2,000-brick stress build', async ({
  page,
}) => {
  await page.goto('/')

  await page.waitForFunction(
    () =>
      (window as BlockyWindow).__blockyRenderPerf?.measureRenderPerf !==
      undefined,
  )

  const result = (await page.evaluate(
    async ({
      brickData,
      targetFrames,
    }: {
      brickData: ReturnType<typeof generateStressBuildPlacedBricks>
      targetFrames: number
    }) => {
      return (window as BlockyWindow).__blockyRenderPerf!.measureRenderPerf({
        brickData,
        targetFrames,
      })
    },
    {
      brickData: generateStressBuildPlacedBricks(2000),
      targetFrames: SAMPLE_FRAMES,
    },
  )) as import('@/testing/renderPerfHarness').MeasureRenderPerfResult

  expect(result.setupFrameTimes).toHaveLength(10)
  expect(result.frameTimes.length).toBeGreaterThanOrEqual(SAMPLE_FRAMES)

  const sorted = [...result.frameTimes].sort((a, b) => a - b)
  const p95Index = Math.floor(sorted.length * 0.95)
  const p95 = sorted[p95Index]!

  expect(
    p95,
    `p95 frame time ${p95.toFixed(1)}ms exceeds the ${P95_BUDGET_MS}ms render budget. See ${BUDGET_DOC_URL} for details.`,
  ).toBeLessThanOrEqual(P95_BUDGET_MS)
})
