# Contributing

## Required validation

The CI pipeline gates every pull request on:

- `npm run typecheck` — TypeScript must compile without errors.
- `npm run lint` — ESLint must pass.
- `npm run test` — All Vitest unit/integration tests must pass with coverage thresholds met.

These additional checks are **local-only** validation for contributors working on affected areas:

- `npm run build` — Vite fails if any entry bundle exceeds the 500 KiB gzip ceiling in `tests/perf/budgets.ts`. Run when changing bundle contents.
- `npm run test:perf` — Playwright perf spec throttles network and CPU to verify first interaction stays within the shared budget. Run when changing rendering or load-path code.

## Running e2e tests

Install the Playwright browser bundle once before running the cross-browser
matrix locally:

```sh
npx playwright install
```

After that, use `npm run test:e2e` for the main matrix.

## Performance budgets

- Entry bundle gzip ceiling: `500 KiB`
- First successful interaction under throttled broadband: `3000 ms`
