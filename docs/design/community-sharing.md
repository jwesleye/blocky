# Community Sharing Contract

## Status

Accepted future scope. Not part of the v1 client-only shipping slice.

## Decision

The project accepts gallery/community sharing as a post-v1 feature, but only
through an explicit backend publish/load path. The current app stays a static,
client-only SPA for autosave, JSON import/export, and shareable URLs.

Those existing flows continue to exchange the plain `Build` payload from
`src/domain/model/build.ts`:

- Autosave stores `Build` JSON in `localStorage`.
- JSON export/import writes and reads the same `Build` JSON file.
- Shareable URLs continue to encode the same `Build` JSON in compressed form.

Future gallery publishing must wrap that unchanged `Build` payload in a
versioned shared-build contract instead of inventing a second build format.

## Contract Boundary

`src/domain/persistence/sharedBuildContract.ts` defines the canonical shared
payload exchanged with a gallery backend after validation:

```ts
type SharedBuildPayload = {
  contractVersion: 1
  buildId: string
  build: Build
  gallery: {
    title: string
    description?: string
    visibility: 'public' | 'unlisted'
    author:
      | {
          identityMode: 'anonymous'
          displayName?: string
        }
      | {
          identityMode: 'authenticated'
          userId: string
          displayName: string
        }
    publishedAt: string
    updatedAt: string
  }
}
```

The backend owns `buildId`, `publishedAt`, and `updatedAt`. The client must not
treat those fields as local persistence concerns.

## Publish / Load Shape

Publish is an intentional network action. It does not replace autosave or JSON
export:

1. The client starts from the current `Build`.
2. The client collects gallery metadata such as title, optional description,
   visibility, and author identity mode.
3. The backend validates the nested `Build` with the same schema used locally,
   stores the result, assigns server-owned identifiers/timestamps, and returns
   the canonical shared payload.

Loading a gallery build reverses that process:

1. The backend returns the canonical shared payload.
2. The client validates the wrapper and nested `Build`.
3. The app loads the nested `Build` through the existing build load path.

## Identity And Auth Assumptions

- v1 remains unauthenticated and client-only.
- Future gallery publishing may allow anonymous display names or authenticated
  identities, but both modes must be explicit in the contract.
- Auth, if added later, applies only to backend publish/load operations and must
  not become a prerequisite for local autosave, JSON import/export, or URL
  sharing.

## Storage Assumptions

- The backend stores the canonical shared-build payload, not a divergent build
  schema.
- Storage is server-owned and durable; local autosave remains browser-owned and
  best-effort.

## Moderation And Abuse Reporting

Community-submitted builds are subject to abuse reporting. The gallery backend
accepts report submissions via `POST /builds/:id/reports`.

**Accepted report reasons:** `spam`, `abuse`, `copyright`, `other`.

**Report validation:**

- The `reason` field is required and must be one of the accepted values.
- An optional `details` field accepts up to 2000 characters.
- Invalid report requests (unknown reason, oversized details) receive a `422`
  response.
- Reporting an unknown build id returns `404`.
- Filing a report **never mutates the stored `SharedBuildPayload`**: reports are
  stored beside the build data in a separate persisted collection, not inside
  the payload itself.

## Privacy, Ownership, And Deletion

**Authorship and ownership:**

- Every published build carries an `author` identity on the gallery wrapper:
  either `anonymous` (with an optional display name) or `authenticated` (with a
  `userId` and `displayName`).
- The `userId` of an `authenticated` author is the canonical ownership
  identifier for deletion authorization.

**Visibility:**

- Builds may be published as `public` (discoverable in gallery listings) or
  `unlisted` (loadable by direct id but hidden from listings).

**Deletion authorization:**

- `DELETE /builds/:id` succeeds only when the `x-user-id` request header
  matches the build's `gallery.author.userId`.
- `anonymous`-authored builds cannot be deleted via this endpoint (`403`).
- A mismatched `userId` returns `403`.
- An unknown build id returns `404`.

**Deleted-content (tombstone) behavior:**

- Once deleted, a build is tombstoned: it is removed from listings but its id
  is retained so the server can distinguish a deleted build from one that never
  existed.
- `GET /builds/:id` for a tombstoned build returns `410 Gone`.
- The `galleryClient.load` method maps a `410` response to a typed `deleted`
  result, distinct from `not-found` and `network-error`.
- `GET /builds` (list) excludes tombstoned builds.

## Deployment

### Backend Service

The gallery backend (`backend/src/server.ts`) is a Node.js HTTP server that
stores published builds in a JSON file on disk. It is a separate service from
the static SPA.

Run it locally:

```bash
node --import tsx/esm backend/src/server.ts
# or build and run:
cd backend && node dist/server.js
```

Default port: `4000` (override with `PORT` env var).

### Storage

The backend persists published builds, tombstones, report records, and the
build-id counter to a JSON file under `GALLERY_DATA_DIR`. By default that data
directory is `backend/.gallery-data`, which keeps process restarts from losing
gallery state during local development or single-instance deployments.

For containerized or multi-host deployments, mount `GALLERY_DATA_DIR` to a
durable volume. The storage format intentionally keeps the canonical
`SharedBuildPayload` separate from moderation reports so report submission never
mutates the stored build payload.

### Environment Variables

| Variable           | Where used            | Purpose                                                                                                              |
| ------------------ | --------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `VITE_GALLERY_URL` | Frontend (Vite build) | Base URL of the gallery backend, e.g. `http://localhost:4000`. Leave unset to run the SPA without a gallery backend. |
| `PORT`             | Backend               | Port for the gallery HTTP server. Defaults to `4000`.                                                                |
| `GALLERY_DATA_DIR` | Backend               | Directory for the durable gallery data file. Defaults to `backend/.gallery-data`. Mount this path to durable storage in containers. |

### Migration From Static-Only Hosting

The existing production image is a static SPA served by nginx (`Dockerfile`
`prod` stage). **No changes to the SPA image are required** to add the gallery
backend:

1. **Keep serving the SPA** from the existing nginx `prod` image. The SPA runs
   fully without `VITE_GALLERY_URL` — autosave, JSON import/export, and
   shareable URLs all work with no backend.
2. **Deploy the gallery backend** as a separate container or process, built from
   the `backend` stage in the Dockerfile.
3. **Set `VITE_GALLERY_URL`** at build time when you want the SPA to connect to
   the gallery backend. If not set, the publish button shows an error on attempt
   (empty base URL results in a network error).
4. **Wire `docker-compose.yml`** to include a `gallery-backend` service. The
   `web` SPA service does **not** depend on `gallery-backend`, so the local dev
   environment continues to work without the backend service running.

## Operational Failure Paths

Backend unavailability and rejected publishes are non-fatal: they surface an
error in the UI without touching the current local build.

**Unavailable backend (network error):**

- If the gallery backend is unreachable, `fetch` throws and `galleryClient`
  returns `{ ok: false, reason: 'network-error', message: ... }`.
- `PersistenceControls` shows the error message and keeps `publishStatus` as
  `'error'`.
- The local build (autosave, `bricks` in the store) is **not mutated**.

**Rejected publish (422):**

- If the backend rejects a publish request with `422`, `galleryClient.publish`
  returns `{ ok: false, reason: 'validation-error', message: 'Publish rejected: validation failed' }`.
- `PersistenceControls` shows the error without changing the current build.

**Deleted content (410):**

- If a build that was previously loaded is later deleted, `GET /builds/:id`
  returns `410`.
- `galleryClient.load` maps this to `{ ok: false, reason: 'deleted', message: 'Build has been deleted' }`.
- The gallery UI surfaces a "build deleted" message; the current local build is
  not overwritten.

**General principle:** treat backend unavailability as a failure of
publishing/loading only, never as corruption of autosave or
imported/exported builds.
