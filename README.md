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

| Script              | Description                                    |
| ------------------- | ---------------------------------------------- |
| `npm run dev`       | Start the Vite dev server (HMR)                |
| `npm run build`     | Type-check and build the static SPA to `dist/` |
| `npm run preview`   | Preview the production build locally           |
| `npm run typecheck` | Type-check without emitting                    |
| `npm run lint`      | Run ESLint                                     |
| `npm run format`    | Format with Prettier                           |
| `npm run test`      | Run unit/integration tests (Vitest)            |
| `npm run test:e2e`  | Run end-to-end tests (Playwright)              |

## End-to-end testing

Playwright runs a cross-browser matrix across **Chromium**, **Firefox**, and **WebKit**:

```bash
npx playwright install   # first-time browser download
npm run test:e2e         # runs all three browser projects locally
```

**CI scope:** The cross-browser matrix is currently local-only. No GitHub Actions workflow exists yet for this project, so the full browser matrix is validated by contributors before merging rather than in CI. A follow-up milestone will add a headless CI run (see issue #117); the WebGL2 test may require a software-rasteriser flag (`--use-gl=swiftshader`) or `xvfb` on Linux runners.

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

Gallery backend (separate Node.js service):

```bash
docker build --target gallery-backend -t blocky:gallery-backend .
docker run --rm -p 4000:4000 blocky:gallery-backend
# http://localhost:4000
```

## Gallery Backend (Future Feature)

The community-sharing gallery backend is a separate Node.js HTTP server in
`backend/`. The static SPA works fully without it — autosave, JSON
import/export, and shareable URLs are all client-only.

### Running The Backend Locally

```bash
node --import tsx/esm backend/src/server.ts
# Listening on :4000
```

Set `PORT` to override the default port:

```bash
PORT=5000 node --import tsx/esm backend/src/server.ts
```

### Connecting The SPA To The Backend

Set `VITE_GALLERY_URL` at Vite build time (or in `.env`):

```
VITE_GALLERY_URL=http://localhost:4000
```

Leave it unset to run the SPA without a gallery backend. Publish attempts will
return a network error but will not affect local autosave or imported builds.

### Storage Durability

The backend persists published builds, tombstones, report records, and the
build-id counter to a JSON file under `GALLERY_DATA_DIR`. By default, that data
directory is `backend/.gallery-data`, which keeps process restarts from losing
gallery state during local development or single-instance deployments.

For containerized or multi-host deployments, mount `GALLERY_DATA_DIR` to durable
storage so the gallery data file survives container replacement and host
failover.

### Migrating From Static-Only Hosting

The existing `prod` Docker image (nginx static SPA) does not need to change.
Deploy the `gallery-backend` Docker image as a separate container, set
`VITE_GALLERY_URL` at SPA build time, and the two services operate independently.
See [`docs/design/community-sharing.md`](docs/design/community-sharing.md) for
the full deployment and migration guide.
