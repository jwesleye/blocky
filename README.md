# blocky

A true-3D brick-building sandbox that runs in the browser. Build almost anything
out of interlocking toy bricks, with gravity as a real constraint: pieces can't
float, and structures that become unbalanced collapse with an off-the-shelf
physics tumble.

See [`docs/PRD.md`](docs/PRD.md) for the full product requirements, design
decisions, and library choices.

## Tech stack

- **React + TypeScript**, bundled with **Vite**
- **three.js** via **@react-three/fiber** + **@react-three/drei** for 3D
- **Rapier** (via **@react-three/rapier**) for the collapse simulation
- **zustand** (+ **zundo**) for state and undo/redo
- Everything stays in the JS/TS ecosystem; off-the-shelf libraries are preferred
  over hand-rolled code (see PRD §9.0).

## Project structure

```
docs/                 Product docs (PRD)
public/               Static assets served as-is
src/
  assets/             Imported assets (textures, models)
  components/         React HUD components (toolbar, palette, pickers)
  scene/              three.js / r3f scene, rendering, instancing
  domain/             Pure, framework-agnostic core
    model/            Build model + serialization
    parts/            Part catalog (footprints, heights, types)
    grid/             Stud-grid coordinate system
    physics/          Connection graph, balance, shear, collapse orchestration
  state/              zustand store (+ undo/redo)
  hooks/              React hooks
  lib/                Utilities (URL sharing, persistence)
  styles/             Global styles
  types/              Shared TypeScript types
tests/
  unit/               Vitest unit/integration tests
  e2e/                Playwright end-to-end tests
docker/               nginx config for the production image
```

## Getting started (local)

```bash
npm install
npm run dev          # http://localhost:5173
```

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start the Vite dev server (HMR) |
| `npm run build` | Type-check and build the static SPA to `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run typecheck` | Type-check without emitting |
| `npm run lint` | Run ESLint |
| `npm run format` | Format with Prettier |
| `npm run test` | Run unit/integration tests (Vitest) |
| `npm run test:e2e` | Run end-to-end tests (Playwright) |

## Docker

Development (hot-reloading dev server):

```bash
docker compose up
# http://localhost:5173
```

Production (static SPA served by nginx):

```bash
docker build --target prod -t blocky:prod .
docker run --rm -p 8080:80 blocky:prod
# http://localhost:8080
```

> Note: the app entry point (`src/main.tsx`) and source modules are added in a
> later step. The skeleton above is the project scaffold and configuration.
