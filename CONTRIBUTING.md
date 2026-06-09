# Contributing

## Required validation

Pull requests must keep the app within the documented load budget.

- Run `npm run build` on every PR. The Vite build now fails if any entry bundle exceeds the shared gzip ceiling in `tests/perf/budgets.ts`.
- Run `npm run test:perf` on every PR. This Playwright check throttles network and CPU, then verifies first interaction stays within the shared budget in `tests/perf/budgets.ts`.
- Run `npm run typecheck` before opening or updating a PR.

## Performance budgets

- Entry bundle gzip ceiling: `500 KiB`
- First successful interaction under throttled broadband: `3000 ms`
