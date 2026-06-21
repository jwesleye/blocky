# Performance Budgets

This document outlines the performance budgets for the Blocky application. These budgets are enforced via automated tests in `tests/perf/` and are intended to ensure a smooth user experience across all supported platforms.

For each budget it specifies the numeric threshold, the measurement method, and the exact command that verifies it. Budget constants are centralized in `tests/perf/budgets.ts`.

Owning issues: [#51](https://github.com/jwesleye/blocky/issues/51) (render),
[#52](https://github.com/jwesleye/blocky/issues/52) (collapse),
[#53](https://github.com/jwesleye/blocky/issues/53) (load),
[#54](https://github.com/jwesleye/blocky/issues/54) (cross-browser).

---

## Render Performance

### 95th-Percentile Frame Time: <= 17ms

- **Budget:** 17ms (about 60 fps)
- **Rationale:** To maintain a smooth 60 frames per second (fps) experience, each frame must be rendered within 16.67ms. We target a p95 of 17ms to allow for minor jitter while ensuring the vast majority of frames are fluid.
- **Measurement method:** explicit redraw sampling against the R3F demand loop. The spec regenerates the 2,000-brick stress build in-process, warms a short settle window, then samples >= 60 invalidated redraws with `requestAnimationFrame`.
- **Stress fixture:** 2,000 bricks placed layer-by-layer across a 32x32 stud grid, generated deterministically by the same algorithm as `scripts/gen-stress-build.ts` (canonical artifact: `fixtures/stress-build-2k.json`).
- **Enforcement:** Chromium-only via `tests/perf/render-perf.spec.ts` and `playwright.perf.config.ts`. The strict p95 budget is not enforced in headless Firefox/WebKit because their raw rAF cadence can exceed 17ms even without app work; those engines remain covered by the e2e smoke and WebGL2 matrix.

```sh
npm run test:perf -- render-perf.spec.ts
```

---

## Interaction Smoothness

### Collapse p95 Frame Time: <= 17ms

- **Budget:** 17ms
- **Rationale:** Similar to general rendering, complex physics-driven animations like the collapse must maintain 60 fps to feel responsive.
- **Enforcement:** `tests/perf/collapse-perf.spec.ts`

### Collapse Max Frame Time: <= 50ms

- **Budget:** 50ms
- **Rationale:** Any single frame exceeding 50ms (the "long-frame" threshold) is perceptible as a "jank" or "stall" by users. We cap the maximum frame time during heavy computations to ensure the app never feels frozen.
- **Measurement method:** rAF delta sampling across the full collapse pipeline — from `selectCollapsingBricks` (connection graph BFS + balance check) through `advanceCollapseTransaction` and `createCollapseSceneBodies`.
- **Stress fixture:** 300 bricks — one 1x1 base with a 2x4 overhang (unbalanced) plus ~298 floating bricks with mixed part IDs and all four rotations.
- **Enforcement:** `tests/perf/collapse-perf.spec.ts`

```sh
npm run test:e2e -- tests/perf/collapse-perf.spec.ts
```

---

## Loading & Payload

### Main Bundle Size: <= 500KB (Gzip)

- **Budget:** 500 KiB gzip for the main entry chunk
- **Rationale:** Keeping the initial JavaScript payload small is critical for fast Time-to-Interactive (TTI), especially on mobile devices or slower networks.
- **Enforcement:** Vite `enforceBundleBudget` plugin (runs during `npm run build`).

```sh
npm run build        # fails if entry bundle exceeds the 500 KiB gzip ceiling
```

### Async / Runtime Chunk Warning Threshold: 3000 KiB (uncompressed) - documented exception

- **Budget:** 3000 KiB uncompressed per async chunk (`BUNDLE_CHUNK_WARNING_LIMIT_KIB`)
- **Rationale:** Three.js, @react-three/fiber, @react-three/drei, and Rapier physics produce large uncompressed runtime chunks. These are split into dedicated vendor chunks (`react-vendor`, `three-vendor`, `physics-vendor`) and still pass the 500 KiB gzip entry gate. The 3000 KiB threshold is a deliberate exception for the current 3D/physics stack and is separate from the entry gzip ceiling.

```sh
npm run build        # must not emit "Some chunks are larger than 500 kB after minification"
```

### Time-to-Interactive (TTI): <= 3000ms

- **Budget:** 3000ms
- **Rationale:** Users expect the application to be usable within 3 seconds of navigation under throttled broadband conditions.
- **Enforcement:** `tests/perf/load-perf.spec.ts` measures first-interaction latency under simulated broadband throttling; `npm run test:perf` runs all load, render, and collapse perf specs.

```sh
npm run test:perf
```

---

## Browser Matrix

We validate performance across the following browser engines:

- **Chromium** (Chrome, Edge, Brave)
- **Firefox**
- **WebKit** (Safari)

Each browser must report WebGL2 as supported. A dedicated capability spec (`tests/e2e/webgl2.spec.ts`) asserts `canvas.getContext('webgl2') !== null` in every browser.

```sh
npm run test:e2e     # runs all projects: chromium, firefox, webkit
```

---

## Methodology

Performance is measured using Playwright with CPU and Network throttling enabled to simulate real-world conditions on mid-range hardware. Budget constants are centralized in `tests/perf/budgets.ts`.

---

## Quick Reference

| Budget              | Threshold                        | Verification                        |
| ------------------- | -------------------------------- | ----------------------------------- |
| Render p95          | <= 17 ms                         | `test:perf -- render-perf.spec.ts`  |
| Collapse long-frame | < 50 ms                          | `test:e2e -- collapse-perf.spec.ts` |
| Collapse p95        | <= 17 ms                         | `test:e2e -- collapse-perf.spec.ts` |
| Bundle gzip         | <= 500 KiB (entry chunk)         | `npm run build`                     |
| Chunk warning       | <= 3000 KiB uncompressed (async) | `npm run build` (no warn)           |
| Load TTI            | <= 3000 ms                       | `npm run test:perf`                 |
| Browser matrix      | Chrome/Edge/Firefox/WebKit       | `npm run test:e2e`                  |
| WebGL2              | supported in all browsers        | `test:e2e -- webgl2.spec.ts`        |

---

## How Regressions Are Caught

Each budget is enforced by an assertion in the relevant spec — not only documented here. If a change causes a perf regression, the spec fails and the contributor sees the exact violated threshold. The guard test at `tests/unit/docs/perfBudgets.test.ts` ensures this document cannot be silently deleted or stripped of its numeric thresholds.

---

## CI Enforcement

Per project policy, CI workflow files are owned by the human maintainer and are not created or modified by agents. The budgets documented here are enforced by assertion-based specs that can be run locally and in CI; the decision of which specs to gate on which branches is a maintainer responsibility.
