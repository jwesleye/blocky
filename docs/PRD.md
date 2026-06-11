# Product Requirements Document — Brick Building Sandbox (codename: _blocky_)

**Status:** Draft v1
**Last updated:** 2026-06-06
**Owner:** j.wesley.e@gmail.com

---

## 1. Overview & Vision

_blocky_ is a single-page web micro-app that lets anyone build freeform 3D
structures out of interlocking toy bricks, directly in the browser, with no
install and no account. It emulates the feel of building with physical
snap-together bricks: pieces connect on a stud grid, and the world honors
gravity — unsupported pieces can't float, and a structure that becomes
unbalanced will physically collapse.

The experience is a **pure creative sandbox**: there are no goals, levels, or
scores. The user opens the app and builds. Physics exists to make building feel
real and to provide consequence — the satisfying drama of a structure that tips
over when you push it too far.

### One-line pitch

> A browser sandbox for building almost anything out of bricks, where gravity
> is real and bad designs fall down.

---

## 2. Goals & Non-Goals

### Goals

- Let a user build "almost any design that the physics allow" out of a few dozen
  brick types in many colors, in true 3D.
- Make connection feel authentic: studs, anti-studs, snap-to-grid, clutch.
- Honor gravity as a genuine constraint, not decoration: no floating, and
  unbalanced structures collapse with a real (if brief) physical tumble.
- Be a frictionless micro-app: instant load, no backend, no login, autosave,
  shareable.
- Run smoothly with thousands of bricks on a typical desktop browser.

### Non-Goals (for v1)

- Not a game: no objectives, scoring, progression, or multiplayer.
- Not a continuous physics simulator: standing structures are static; only
  collapses are simulated, and only briefly.
- Not a CAD / instructions tool: no part numbers, BOM export, or building-step
  generation.
- Not SNOT / Technic: no sideways building, hinges, pins, angled joints, or
  half-stud offsets (see §6 building grammar).
- No mobile-first design (desktop-first; touch is a stretch goal).

---

## 3. Target Users & Use Cases

- **Casual creatives / tinkerers** who want a relaxing, tactile building toy in a
  browser tab.
- **Brick hobbyists** who want to quickly mock up an idea in 3D.
- **Curious visitors** who enjoy the "knock it down" spectacle.

Representative use cases:

- Build a house, vehicle, tower, or pixel-art mosaic and save/share it.
- Experiment with how far a cantilever or overhang can go before it shears off.
- Start from a shared link of someone else's build and remix it.

---

## 4. Core Concepts & Domain Model

### 4.1 Coordinate system & units

The world is a **discrete stud grid**. All geometry derives from real brick
proportions:

| Quantity              | Real value | Internal unit          |
| --------------------- | ---------- | ---------------------- |
| Horizontal stud pitch | 8 mm       | 1 grid unit in X and Z |
| Plate height          | 3.2 mm     | 1 grid unit in Y       |
| Brick height          | 9.6 mm     | **3** Y units          |

- Horizontal position: integer `(x, z)` in studs.
- Vertical position: integer `y` in **plate units** (a brick spans 3; a plate
  spans 1; a tile spans 1).
- Gravity points in **−Y** (straight down) toward a single baseplate. "Down" is
  fixed and not user-adjustable in v1.
- Orientation: 90° rotations about the Y axis only (4 states). No tilting.

### 4.2 Piece (part) catalog (~36 parts)

A part is defined by its **footprint** (set of stud cells it occupies in X/Z),
its **height** in Y units, and its **type** (which determines stud/anti-stud
pattern and silhouette).

- **Bricks** (height 3): 1×1, 1×2, 1×3, 1×4, 1×6, 1×8, 2×2, 2×3, 2×4, 2×6, 2×8
- **Plates** (height 1): 1×1, 1×2, 1×4, 2×2, 2×4, 2×6, 2×8
- **Tiles** (height 1, no top studs — smooth): 1×1, 1×2, 2×2, 2×4
- **Slopes** (height 3): 2×1, 2×2, plus corner slope, inverted slope
- **Rounds / specials**: 1×1 round brick, 1×1 round plate, 1×1 cone
- **Baseplate**: 32×32 (the build surface; not an inventory piece)

> Exact final list is tunable; the data model treats parts as declarative
> footprint + height + type, so adding parts is cheap.

### 4.3 Color palette (~14)

Red, Blue, Yellow, Green, White, Black, Light Gray, Dark Gray, Brown, Orange,
Tan, Lime, Azure, Magenta. Every placed brick stores a color id. Inventory is
unlimited (sandbox).

### 4.4 The model

A build is a set of **placed bricks**, each: `{ partId, color, position (x,y,z),
rotation (0–3), offset? }`. `offset` is omitted for classic v1 stud-stacked
bricks; when present it encodes an allowed non-v1 horizontal half-stud shift in
X/Z (see §6). Plus a derived **connection graph** and **connected components**
used by the physics (§5).

---

## 5. Physics Model

Physics is a **placement/edit-time constraint plus a one-shot collapse
simulation** — never a continuously running sim of the standing build.

### 5.1 Connection (anti-floating) — hard rule

- Two bricks **connect** when a stud face of one aligns with an anti-stud face
  of the other on the grid (vertical stud/tube coupling, classic stacking).
- A brick is **grounded** if it rests on the baseplate or connects (transitively)
  to a brick that is.
- **Floating is hard-prevented:** the user can never place a brick that would
  not be connected to the existing structure or the baseplate. The ghost cursor
  brick shows red and won't place.

### 5.2 Balance (center of mass) — evaluated per edit

- Each part has a mass proportional to its volume.
- For each **connected component**, compute its center of mass and the **support
  footprint** = convex hull (in the X/Z plane) of the studs where the component
  contacts the baseplate.
- A component is **balanced** if its center of mass projects inside the support
  footprint; otherwise it is **unbalanced**.
- Balance is re-evaluated after every place and delete.

### 5.3 Collapse — one-shot real tumble, then fade

When an edit produces an invalid state, the offending bricks **collapse**:

- **Floating case (from a deletion):** only the sub-part(s) that lost their path
  to the baseplate fall.
- **Unbalanced case:** **smart shear** — the app computes the minimal
  overhanging sub-region responsible for the imbalance, breaks only that region
  off, and leaves the stable remainder standing. (See §5.4 and risks §12.)

The collapsing bricks are handed to a rigid-body engine and **simulated for a
few seconds**: they tumble, bounce, and settle on the baseplate, then **fade
out** and are removed from the model. The standing structure is never simulated
and does not move. A collapse is a single atomic, **undoable** action
(Ctrl+Z restores the pre-collapse state).

### 5.4 Smart shear (highest-risk component)

Algorithm intent: when a component is unbalanced, find the smallest set of
"upper/overhanging" bricks whose removal restores balance for the remainder,
break exactly that set off, and recursively re-check the remainder.

Because robust 3D shear-boundary detection is hard, this is **phased**:

- **Phase 1 (MVP):** the entire unbalanced connected component topples (whole-
  component collapse). Simple, dramatic, honest.
- **Phase 2:** upgrade to smart shear (break only the overhanging region).

This lets MVP ship without blocking on the hardest algorithm, while preserving
the chosen end-state behavior.

---

## 6. Building Grammar (scope of "any design")

- **Classic stud-stacking remains the default grammar**: axis-aligned, 90° Y
  rotations, integer anchor coordinates, and gravity fixed along −Y.
- Bricks + plates + tiles + slopes give fine vertical detail and smooth
  surfaces — enough for houses, vehicles, towers, statues, and mosaics.
- **First supported non-v1 slice:** half-stud (jumper) offsets.
  - A brick keeps integer anchor coordinates `x`, `y`, `z`; the offset is a
    separate optional field, not a fractional coordinate.
  - The offset is limited to `0 | 1` half-stud units per horizontal axis, so
    only `+0.5` stud shifts in X and/or Z are representable.
  - Vertical positioning is unchanged; jumper offsets affect only the X/Z plane.
  - A build with no offsets remains byte-for-byte compatible with v1 and
    serializes as `version: 1`; a build with one or more offsets serializes as
    `version: 2`.
- **Still out of scope:** SNOT (sideways building), hinges, Technic pins, and
  angled connections. These remain major future grammar expansions.

---

## 7. Functional Requirements (Features)

### 7.1 Camera

- Orbit, pan, and zoom around the build (perspective camera).
- Sensible default framing on the baseplate; "reset view" control.

### 7.2 Placement & editing

- A translucent **ghost cursor brick** follows the pointer, snapping to the stud
  grid via raycast against existing brick faces and the ground plane.
- Ghost shows **green = placeable**, **red = invalid** (would float / collide).
- **Click** to place; **click** an existing brick to delete.
- **R** rotates the cursor brick 90°.
- Color picker and part picker in the UI; selecting changes the cursor brick.
- **Undo / redo** (Ctrl+Z / Ctrl+Y), including undo of collapses.

**Stretch:** multi-select, box-select, move/duplicate groups, mirror, paint
(re-color existing brick), eyedropper.

### 7.3 Persistence & sharing

- **Autosave** current build to `localStorage`.
- **Export / Import** a build as a JSON file.
- **Shareable URL**: build state encoded (compressed) into the link; opening it
  loads the build. No backend required.
- **Future gallery/community sharing is accepted future scope:** autosave, JSON
  import/export, and shareable URLs stay client-only and continue to exchange
  the same `Build` JSON payload. A later backend-mediated gallery may wrap that
  `Build` in a versioned shared-build contract without replacing local-only
  flows.
- **New / clear** with confirmation.

### 7.4 Feedback

- Visual collapse animation (the core spectacle).
- Optional sound effects for place / delete / collapse (stretch).
- Brick/part count indicator.

---

## 8. UX / UI

- Clean, minimal HUD that stays out of the way of the 3D canvas.
- Left or bottom **part palette**; **color swatches**; small **toolbar**
  (rotate, undo/redo, new, save/share, reset view).
- Soft lighting, subtle shadows, pleasant default environment so builds look
  good with zero effort.
- Desktop-first pointer + keyboard interaction. Touch is a stretch goal.
- Accessibility: keyboard shortcuts documented in-app; color names exposed (not
  color-only identification).

---

## 9. Technical Architecture

- **Framework:** React + TypeScript, bundled with **Vite**.
- **3D:** `three.js` via `@react-three/fiber`, with `@react-three/drei` helpers.
- **Physics (collapse only):** `@react-three/rapier` (Rapier). Only collapsing
  bricks are spawned as dynamic bodies; the standing build is static (not in the
  physics world).
- **Rendering scale:** **instanced meshes** per (part type × color) so thousands
  of bricks render in few draw calls.
- **State:** `zustand` store holding the model, connection graph, selection, and
  undo/redo stacks.
- **Domain core:** a pure, framework-agnostic module for the grid, connection
  graph, component detection, balance check, and shear — independently testable.
- **Client-only:** no server, no database, no auth. Static hosting.
- **Future gallery backend boundary:** community publish/load is allowed only as
  a later, explicit backend path. It must preserve the current static SPA and
  `Build` serialization semantics for autosave/import/export/shareable URLs,
  keep the implementation in the JS/TS ecosystem, and use server-owned IDs,
  timestamps, and storage instead of coupling local persistence to a service.

### 9.0 Engineering principles (dependency philosophy)

- **Single-ecosystem:** the entire codebase stays in the **JavaScript /
  TypeScript** ecosystem. No components written in Python, Rust, C++, Go, etc.,
  and no toolchains requiring a non-JS native compiler. (Pre-compiled WASM that
  ships _inside_ an npm package — e.g. Rapier's bundled WASM — is fine, since it
  is consumed as an off-the-shelf JS library, not authored or built by us.)
- **Buy, don't build (off-the-shelf first):** prefer mature, well-maintained
  pre-built libraries over hand-rolled code. This is an explicit project goal.
  Before writing non-trivial logic, look for an established library that already
  solves it.
- **Physics engines must be off-the-shelf.** The collapse simulation uses a
  proven engine (Rapier); we do not write our own rigid-body solver, integrator,
  or collision system.
- **Reuse library primitives for the app-specific logic too.** The connection
  graph, component detection, balance/center-of-mass, and shear are inherently
  app-specific, but should be assembled from established building blocks (e.g. a
  graph/union-find library, a convex-hull library, a math/geometry library)
  rather than bespoke implementations wherever a solid option exists.
- **Hand-rolling is the exception, justified case by case** — acceptable only
  when no suitable library exists, the dependency is disproportionately heavy, or
  a thin glue layer is genuinely simpler. Such choices should be noted.

### 9.0.1 Candidate libraries (off-the-shelf picks)

All candidates are JS/TS-ecosystem packages installable from npm. Picks are
indicative, not final; the point is that each concern has an established library
so we are not hand-rolling.

| Concern                        | Candidate library                                             | Notes                                                                                                        |
| ------------------------------ | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Language                       | **TypeScript**                                                | Typed authoring across the codebase                                                                          |
| UI framework                   | **React**                                                     | Component model for the HUD                                                                                  |
| Build / dev server             | **Vite**                                                      | Fast HMR dev server; multi-stage prod build                                                                  |
| 3D engine                      | **three.js**                                                  | Core WebGL2 rendering                                                                                        |
| React ↔ three bridge           | **@react-three/fiber**                                        | Declarative three.js in React                                                                                |
| 3D helpers                     | **@react-three/drei**                                         | `OrbitControls`, instancing helpers, env/lighting                                                            |
| Camera controls                | **drei `OrbitControls`** (or **camera-controls**)             | Orbit/pan/zoom; camera-controls if we need finer control                                                     |
| Physics engine (collapse)      | **Rapier** via **@react-three/rapier** (`@dimforge/rapier3d`) | Off-the-shelf rigid-body engine; ships pre-compiled WASM consumed as a JS lib                                |
| App state                      | **zustand**                                                   | Model, selection, undo/redo stacks                                                                           |
| Undo/redo                      | **zundo** (zustand temporal middleware)                       | Off-the-shelf history for the zustand store                                                                  |
| Connection graph / components  | **graphology** + **graphology-components**                    | Build the stud-connection graph; connected components (or a lightweight **union-find** for grounding checks) |
| Convex hull + point-in-polygon | **d3-polygon** (`polygonHull`, `polygonContains`)             | Support footprint hull and center-of-mass-inside-footprint test for the balance check                        |
| Geometry / vector math         | **three.js math** (`Vector3`, `Box3`)                         | Reuse three's math; avoid a separate math lib                                                                |
| URL state compression          | **lz-string**                                                 | Compress build JSON into a shareable URL                                                                     |
| Import validation              | **zod**                                                       | Validate imported/`localStorage` build JSON against the schema                                               |
| UI controls / pickers          | **Radix UI** primitives (or **leva** for quick dev controls)  | Accessible toolbar/menus/color & part pickers                                                                |
| Icons                          | **lucide-react**                                              | Toolbar iconography                                                                                          |
| Sound (stretch)                | **howler.js**                                                 | Place/delete/collapse SFX                                                                                    |
| Unit/integration tests         | **Vitest** + **@testing-library/react**                       | Test the domain core and components                                                                          |
| End-to-end tests               | **Playwright**                                                | Browser-level interaction/placement tests                                                                    |
| Lint / format                  | **ESLint** + **Prettier**                                     | Code quality                                                                                                 |
| Static prod server             | **nginx** (slim image)                                        | Serves the built SPA in the production container                                                             |

### 9.1 Containerized development & deployment

- The app must be developed and run inside a **containerized environment**
  (Docker). A `Dockerfile` and `docker-compose` (or equivalent) define the dev
  and build/serve setup so the project runs identically across machines with no
  host-level Node/toolchain install required.
- **Dev container:** runs the Vite dev server with hot-reload, port-mapped to the
  host, and the source bind-mounted for live editing.
- **Production image:** a multi-stage build — build the static SPA, then serve the
  compiled assets from a minimal static web server (e.g. `nginx` on a slim base
  image). Because the app is client-only (§9), the production container is just a
  static file server; no backend container is required.
- Container builds should be reproducible (pinned base images, lockfile-based
  installs) and the image kept small.

### 9.2 Data model / serialization

```
Build {
  version: number
  baseplate: { size: 32 }
  bricks: Array<{
    partId: string      // e.g. "brick-2x4"
    color: string       // palette id
    x: int, y: int, z: int   // y in plate units
    rot: 0 | 1 | 2 | 3       // 90° steps about Y
    offset?: { x: 0 | 1, z: 0 | 1 }  // optional +0.5 stud jumper shift per axis
  }>
}
```

Serialized to compact JSON; `version: 1` remains the classic stud-stacked
envelope, while `version: 2` adds optional half-stud offsets without changing
legacy integer anchor semantics. URL-sharing uses a compressed encoding of
this.

Future gallery publishing/loading must reuse this exact `Build` payload inside a
versioned shared-build contract rather than forking the build schema. The
backend-owned wrapper adds gallery metadata (title, optional description,
visibility, author identity mode) plus server-owned identifiers and timestamps.

---

## 10. Non-Functional Requirements

- **Performance:** maintain ~60 fps while orbiting a build of several thousand
  bricks on a typical modern laptop; collapse of a few hundred bricks stays
  smooth.
- **Load:** first meaningful interaction in a couple seconds on broadband.
- **Compatibility:** evergreen desktop browsers with WebGL2 (Chrome, Edge,
  Firefox, Safari).
- **Robustness:** no operation can leave the model in an invalid (floating/
  overlapping) persisted state; autosave never corrupts a build.
- **Privacy:** all data stays client-side unless the user shares a link.
- **Future gallery privacy boundary:** community publishing is an intentional
  backend action, not an automatic extension of autosave or URL sharing. Any
  later backend must make authorship, visibility, storage, and deletion policy
  explicit.

---

## 11. Roadmap / Phasing

### MVP (v1)

- Stud grid, core part catalog, full palette.
- Camera, ghost placement, place/delete, rotate, color/part pickers.
- Connection graph + anti-floating hard rule.
- Balance check + collapse with **whole-component topple** (Phase 1 of §5.4),
  real Rapier tumble + fade.
- Undo/redo, autosave, export/import, shareable URL.
- Instanced rendering.

### v1.1+

- **Smart shear** (Phase 2 of §5.4).
- Multi-select / move / duplicate / mirror / paint.
- Touch support.
- Sound effects, nicer environments/lighting presets.
- Larger / selectable baseplate sizes; screenshot export.

### Later / maybe

- SNOT and additional connection types (major scope expansion).
- Build gallery / community sharing after an explicit backend path is added,
  using the shared-build contract while leaving v1 local-only persistence
  unchanged.

---

## 12. Risks & Open Questions

- **Smart shear (§5.4) is the top technical risk.** Defining a correct,
  non-arbitrary 3D break boundary is hard, and it is unlikely to have a drop-in
  off-the-shelf library — this is the most probable place we must hand-roll
  logic (an accepted exception per §9.0). Mitigation: ship whole-component topple
  first; treat shear as an upgrade, and assemble it from library primitives
  (graph, convex hull, geometry) rather than from scratch.
- **Selective collapse simulation:** spawning only the falling subset into Rapier
  while the rest stays static, and cleanly re-integrating state afterward, needs
  careful handoff. Risk to the "feels real" payoff if jittery.
- **Performance at scale:** instancing plus a large dynamic-spawn collapse must
  not stall. Needs profiling with stress builds.
- **Balance model fidelity:** real clutch power lets cantilevers hold without
  toppling; our CoM-vs-footprint rule is an approximation. Tuning needed so it
  feels fair, not arbitrary.
- **Open:** final part list and color values; app name/branding.

---

## 13. Legal / Branding

- Do **not** use the "LEGO" trademark anywhere in product, code, or marketing.
  Refer to "bricks" / "brick-building." Avoid copying trademarked specific part
  designs or the LEGO logo on studs. App name TBD (codename _blocky_).

---

## 14. Decisions Log (resolved during scoping)

| #   | Decision                    | Choice                                                                                                                      |
| --- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| 1   | Core experience             | Pure creative sandbox                                                                                                       |
| 2   | Physics role                | Placement constraint + balance check (not live sim)                                                                         |
| 3   | Dimensionality              | True 3D (three.js / r3f)                                                                                                    |
| 4   | Connection grammar          | Classic stud-stacking, axis-aligned, 90° rotations                                                                          |
| 5   | Units                       | Bricks + plates; vertical grid in plate units                                                                               |
| 6   | Instability behavior        | One-shot collapse (not prevent / not advisory-only)                                                                         |
| 7   | Collapse fidelity           | Real brief tumble (Rapier), debris fades after settling                                                                     |
| 8   | Collapse scope (unbalanced) | Smart shear (phased; whole-component topple in MVP)                                                                         |
| 9   | Dev/deploy environment      | Containerized (Docker): dev container + multi-stage static-serve image                                                      |
| 10  | Language scope              | JS/TS ecosystem only (no Python/Rust/C++/etc.); TypeScript + React retained                                                 |
| 11  | Dependency philosophy       | Off-the-shelf libraries first; core physics engine must be off-the-shelf (Rapier)                                           |
| 12  | Community sharing scope     | Accepted as future scope only; any gallery path must be backend-mediated, explicit, and preserve v1 client-only persistence |
