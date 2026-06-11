# Performance Budgets - blocky

This document records every performance and compatibility budget committed in
[`docs/PRD.md` section 10 (Non-Functional Requirements)](./PRD.md#10-non-functional-requirements).
For each budget it specifies the numeric threshold, the measurement method, and the
exact command that verifies it.

Owning issues: [#51](https://github.com/jwesleye/blocky/issues/51) (render),
[#52](https://github.com/jwesleye/blocky/issues/52) (collapse),
[#53](https://github.com/jwesleye/blocky/issues/53) (load),
[#54](https://github.com/jwesleye/blocky/issues/54) (cross-browser).

---

## 1. Render performance

**Budget:** p95 frame time <= 17 ms (about 60 fps) while orbiting a 2,000-brick build on
a typical modern laptop.

**Measurement method:** `requestAnimationFrame` delta sampling. A loop of >= 60
consecutive rAF callbacks records the elapsed time between each pair of adjacent
frames. The p95 of those deltas must stay at or below 17 ms.

**Stress fixture:** 2,000 bricks placed layer-by-layer across a 32x32 stud grid,
generated deterministically by the same algorithm as `scripts/gen-stress-build.ts`
(checked-in canonical artifact: `fixtures/stress-build-2k.json`).

**Verification command:**

```sh
npm run test:e2e -- tests/perf/render-perf.spec.ts
```

**Owning spec:** `tests/perf/render-perf.spec.ts` (landed in [#51](https://github.com/jwesleye/blocky/issues/51))

---

## 2. Collapse smoothness

**Budgets:**

- No single animation frame during a collapse may exceed **50 ms** (long-frame stall threshold).
- p95 frame time <= **17 ms** (about 60 fps) across the collapse animation window.
- Synchronous collapse computation for about 300 bricks must complete in < 50 ms
  (so it does not itself cause a frame stall).

**Measurement method:** rAF delta sampling across the full collapse pipeline - from
`selectCollapsingBricks` (connection graph BFS + balance check) through
`advanceCollapseTransaction` and `createCollapseSceneBodies` - driven on a
~300-brick stress fixture containing both floating bricks (exercises BFS) and an
unbalanced component (exercises convex-hull CoM check).

**Stress fixture:** 300 bricks - one 1x1 base with a 2x4 overhang (unbalanced) plus
about 298 floating bricks with mixed part IDs and all four rotations.

**Verification command:**

```sh
npm run test:e2e -- tests/perf/collapse-perf.spec.ts
```

**Owning spec:** `tests/perf/collapse-perf.spec.ts`, constants in `tests/perf/budgets.ts`
(landed in [#52](https://github.com/jwesleye/blocky/issues/52))

---

## 3. Load budget

**Budget:** first meaningful interaction within a couple of seconds on broadband;
entry bundle gzip size must stay under **500 KiB** (the ceiling enforced by the Vite
build gate).

**Measurement method:** The Vite build step rejects the bundle if any entry chunk
exceeds the 500 KiB gzip ceiling. A Playwright perf spec measuring
time-to-first-interaction under simulated broadband throttling is planned for
[#53](https://github.com/jwesleye/blocky/issues/53).

**Verification command (currently enforceable):**

```sh
npm run build        # fails if entry bundle exceeds the 500 KiB gzip ceiling
```

**Owning spec:** Vite bundle-size gate (enforced now); `tests/perf/load-perf.spec.ts`
and the `test:perf` npm script land with [#53](https://github.com/jwesleye/blocky/issues/53).

### 3a. Async / runtime chunk warning threshold - documented exception

**Budget:** 3000 KiB uncompressed per async chunk (`BUNDLE_CHUNK_WARNING_LIMIT_KIB`).

**Rationale:** Three.js, @react-three/fiber/@react-three/drei, and Rapier physics
produce large uncompressed runtime chunks. These are grouped into dedicated Rollup
manual chunks (`react-vendor`, `three-vendor`, `physics-vendor`) so each chunk can
be cached independently. Despite their uncompressed size, the chunks still satisfy
the 500 KiB gzip entry ceiling. The 3000 KiB uncompressed threshold is a deliberate,
documented exception for the current 3D/physics stack and is enforced separately from
the entry gzip budget.

**Verification command:**

```sh
npm run build        # must not emit "Some chunks are larger than 500 kB after minification"
```

---

## 4. Cross-browser compatibility

**Budget:** all section 10 budgets above must pass on **Chrome/Edge, Firefox, and
WebKit/Safari** (evergreen desktop); each browser must report WebGL2 as supported.

**Measurement method:** Playwright multi-project matrix defined in
`playwright.config.ts` (`chromium`, `firefox`, `webkit` projects). A dedicated
capability spec asserts `canvas.getContext('webgl2') !== null` in every browser.

**Verification command:**

```sh
npm run test:e2e     # runs all projects: chromium, firefox, webkit
```

**Owning specs:** `playwright.config.ts` browser matrix + `tests/e2e/webgl2.spec.ts`
(landed in [#54](https://github.com/jwesleye/blocky/issues/54))

---

## How regressions are caught

Each budget is enforced by an assertion in the relevant spec - not only documented
here. If a change causes a perf regression, the spec fails and the contributor sees
the exact violated threshold. The guard test at
`tests/unit/docs/perfBudgets.test.ts` ensures this document cannot be silently
deleted or stripped of its numeric thresholds.

Quick reference:

| Budget              | Threshold                        | Verification                        |
| ------------------- | -------------------------------- | ----------------------------------- |
| Render p95          | <= 17 ms                         | `test:e2e -- render-perf.spec.ts`   |
| Collapse long-frame | < 50 ms                          | `test:e2e -- collapse-perf.spec.ts` |
| Collapse p95        | <= 17 ms                         | `test:e2e -- collapse-perf.spec.ts` |
| Bundle gzip         | <= 500 KiB (entry chunk)         | `npm run build`                     |
| Chunk warning       | <= 3000 KiB uncompressed (async) | `npm run build` (no warn)           |
| Load TTI            | couple of seconds (planned #53)  | test:perf script (lands with #53)   |
| Browser matrix      | Chrome/Edge/Firefox/WebKit       | `npm run test:e2e`                  |
| WebGL2              | supported in all browsers        | `test:e2e -- webgl2.spec.ts`        |

---

## CI enforcement

Per project policy, CI workflow files are owned by the human maintainer and are not
created or modified by agents. The budgets documented here are enforced by
assertion-based specs that can be run locally and in CI; the decision of which specs
to gate on which branches is a maintainer responsibility.
