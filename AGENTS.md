# Agent & contributor guide

Orientation for anyone (human or AI) making changes to **blocky**. For product
context see [`README.md`](README.md) and [`docs/PRD.md`](docs/PRD.md).

## This is a test-driven project

Changes are developed test-first. Write or update the test that describes the
behavior, watch it fail, then make it pass.

**Targeted tests for any change must be passing before a PR is opened.** A
"targeted test" is the unit/integration test that exercises the code you
touched — add one if it does not exist yet. Do not open a PR with a known-failing
test for the area you changed.

Before opening a PR, the following must pass locally:

```bash
npm run typecheck    # tsc -b --noEmit
npm run lint         # eslint .
npm run test         # vitest run --coverage (enforces coverage thresholds)
```

Coverage thresholds are enforced in `vitest.config.ts` (lines 80 / branches 70 /
functions 80 / statements 80). New code is expected to keep coverage at or above
those gates.

The Playwright cross-browser e2e/perf matrix (`npm run test:e2e`,
`npm run test:perf`) is currently local-only and known-flaky on some browsers
(see open QA issues). Run it when your change affects rendering or interaction,
but it is not yet a hard merge gate.

## Project layout

See the "Project structure" table in [`README.md`](README.md). In short:
`src/domain/` is the pure, framework-agnostic core (model, parts, grid,
physics); `src/scene/` is three.js / r3f rendering; `src/state/` is the zustand
store; `tests/unit/` holds Vitest specs and `tests/e2e/` holds Playwright specs.

## Conventions

- Prefer off-the-shelf libraries over hand-rolled code (PRD §9.0).
- Keep `src/domain/` free of React and three.js imports — it must stay testable
  in plain Node/jsdom.
- Match the style of the surrounding code; Prettier + ESLint are the source of
  truth (`npm run format`, `npm run lint`).

## PR checklist

- [ ] Targeted unit/integration test added or updated, and passing
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] `npm run test` passes (coverage thresholds met)
- [ ] e2e run if rendering/interaction changed
