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
- Deletion, moderation, and abuse handling are future backend concerns and must
  operate on the gallery wrapper without changing the `Build` schema.

## Constraints For Follow-on Work

- Keep all implementation in the JS/TS ecosystem.
- Do not make the existing production image depend on a backend for local-only
  flows.
- Do not fork `BuildSchema`; compose it inside the shared-build contract.
- Treat backend unavailability as a failure of publishing/loading only, never as
  corruption of autosave or imported/exported builds.
