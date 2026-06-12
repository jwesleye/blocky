# CLAUDE.md

Guidance for Claude Code (and other AI agents) working in this repository.
**[`AGENTS.md`](AGENTS.md) is the canonical contributor guide** — read it first.
The essentials are repeated here so this file is self-contained.

## This is a test-driven project

Develop test-first: write/update the test that describes the behavior, watch it
fail, then make it pass.

**Targeted tests for any change must be passing before a PR is opened.** The
targeted test is the unit/integration spec that exercises the code you touched —
add one if it does not exist. Never open a PR with a known-failing test for the
area you changed.

Required to pass locally before a PR:

```bash
npm run typecheck    # tsc -b --noEmit
npm run lint         # eslint .
npm run test         # vitest run --coverage (enforces coverage thresholds)
```

Coverage gates live in `vitest.config.ts` (lines 80 / branches 70 / functions 80
/ statements 80). The Playwright e2e/perf matrix is local-only and known-flaky;
run it for rendering/interaction changes but it is not yet a hard merge gate.

## Where things live

`src/domain/` — pure core (model, parts, grid, physics), no React/three.js.
`src/scene/` — three.js / r3f rendering. `src/state/` — zustand store.
`tests/unit/` — Vitest. `tests/e2e/` — Playwright. See [`README.md`](README.md)
for the full structure and [`docs/PRD.md`](docs/PRD.md) for product context.

## Conventions

- Prefer off-the-shelf libraries over hand-rolled code (PRD §9.0).
- Keep `src/domain/` free of React and three.js imports.
- Prettier + ESLint are the source of truth (`npm run format`, `npm run lint`).
