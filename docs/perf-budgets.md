# Performance Budgets

This document outlines the performance budgets for the Blocky application. These budgets are enforced via automated tests in `tests/perf/` and are intended to ensure a smooth user experience across all supported platforms.

## Render Performance

### 95th-Percentile Frame Time: ≤ 17ms
- **Budget:** 17ms (≈ 60 fps)
- **Rationale:** To maintain a smooth 60 frames per second (fps) experience, each frame must be rendered within 16.67ms. We target a p95 of 17ms to allow for minor jitter while ensuring the vast majority of frames are fluid.
- **Enforcement:** `tests/perf/render-perf.spec.ts`

## Interaction Smoothness

### Collapse p95 Frame Time: ≤ 17ms
- **Budget:** 17ms
- **Rationale:** Similar to general rendering, complex physics-driven animations like the collapse must maintain 60 fps to feel responsive.
- **Enforcement:** `tests/perf/collapse-perf.spec.ts`

### Collapse Max Frame Time: ≤ 50ms
- **Budget:** 50ms
- **Rationale:** Any single frame exceeding 50ms (the "long-frame" threshold) is perceptible as a "jank" or "stall" by users. We cap the maximum frame time during heavy computations to ensure the app never feels frozen.
- **Enforcement:** `tests/perf/collapse-perf.spec.ts`

## Loading & Payload

### Main Bundle Size: ≤ 500KB
- **Budget:** 500KB (Gzip)
- **Rationale:** Keeping the initial JavaScript payload small is critical for fast Time-to-Interactive (TTI), especially on mobile devices or slower networks.
- **Enforcement:** `tests/perf/load-perf.spec.ts`

### Time-to-Interactive (TTI): ≤ 3000ms
- **Budget:** 3000ms
- **Rationale:** Users expect the application to be usable within 3 seconds of navigation under throttled broadband conditions.
- **Enforcement:** `tests/perf/load-perf.spec.ts`

## Browser Matrix

We validate performance across the following browser engines:
- **Chromium** (Chrome, Edge, Brave)
- **Firefox**
- **WebKit** (Safari)

## Methodology

Performance is measured using Playwright with CPU and Network throttling enabled to simulate real-world conditions on mid-range hardware. Budget constants are centralized in `tests/perf/budgets.ts`.
