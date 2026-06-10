/**
 * Shared performance budget constants for the blocky app.
 * Reused by collapse-perf.spec.ts, render-perf.spec.ts, and load-perf.spec.ts.
 *
 * @see {@link BUDGET_DOC_URL} for rationale and browser matrix.
 */

/** Canonical URL for the performance budgets documentation. */
export const BUDGET_DOC_URL = '/docs/perf-budgets.md'

/** Maximum duration (ms) for any single animation frame before it is considered a long-frame stall. */
export const LONG_FRAME_THRESHOLD_MS = 50

/** 95th-percentile frame-time budget (ms), targeting at least 60 fps rendering. */
export const P95_FRAME_BUDGET_MS = 17

/** Minimum number of animation frames to sample before computing percentile metrics. */
export const MIN_SAMPLE_FRAMES = 60

/** Number of bricks in the unbalanced collapse stress scenario. */
export const COLLAPSE_BRICK_COUNT = 300

/** Bundle size ceiling (KiB) for the main entry point. */
export const BUNDLE_ENTRY_BUDGET_KIB = 500
export const BUNDLE_ENTRY_BUDGET_BYTES = BUNDLE_ENTRY_BUDGET_KIB * 1024

/** Time-to-interactive (TTI) budget (ms) for the first meaningful interaction. */
export const FIRST_INTERACTION_BUDGET_MS = 3_000

/** Browser targets for performance validation. */
export const BROWSER_TARGETS = ['Chromium', 'Firefox', 'WebKit']

export const PERF_NETWORK_PROFILE = {
  downloadBytesPerSecond: 1_250_000,
  uploadBytesPerSecond: 500_000,
  latencyMs: 40,
} as const

export const PERF_CPU_THROTTLE_RATE = 4
