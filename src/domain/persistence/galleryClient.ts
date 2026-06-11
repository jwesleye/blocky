import type { Build } from '@/domain/model/build'
import { BASEPLATE_SIZE_STUDS } from '@/domain/grid'
import { safeParseSharedBuildPayload } from './sharedBuildContract'
import type {
  SharedBuildAuthorIdentity,
  SharedBuildPayload,
} from './sharedBuildContract'
import {
  SHARED_BUILD_CONTRACT_VERSION,
  SharedBuildPayloadSchema,
} from './sharedBuildContract'

export interface GalleryPublishRequest {
  build: Build
  gallery: {
    title: string
    description?: string
    visibility: 'public' | 'unlisted'
    author: SharedBuildAuthorIdentity
  }
}

export type GalleryPublishResult =
  | { ok: true; payload: SharedBuildPayload }
  | {
      ok: false
      reason:
        | 'network-error'
        | 'unauthorized'
        | 'validation-error'
        | 'server-error'
      message: string
    }

export type GalleryLoadResult =
  | { ok: true; payload: SharedBuildPayload }
  | {
      ok: false
      reason:
        | 'not-found'
        | 'deleted'
        | 'network-error'
        | 'validation-error'
        | 'server-error'
      message: string
    }

export interface GalleryBuildSummary {
  id: string
  title: string
  author: string
  brickCount: number
  updatedAt: string
}

export type GalleryListResult =
  | { ok: true; builds: GalleryBuildSummary[] }
  | {
      ok: false
      reason: 'network-error' | 'validation-error' | 'server-error'
      message: string
    }

export interface GalleryReportRequest {
  reason: 'spam' | 'abuse' | 'copyright' | 'other'
  details?: string
}

export type GalleryReportResult =
  | { ok: true }
  | {
      ok: false
      reason:
        | 'not-found'
        | 'validation-error'
        | 'network-error'
        | 'server-error'
      message: string
    }

export interface GalleryDeleteIdentity {
  userId: string
}

export type GalleryDeleteResult =
  | { ok: true }
  | {
      ok: false
      reason: 'not-found' | 'unauthorized' | 'network-error' | 'server-error'
      message: string
    }

export interface GalleryClient {
  list(): Promise<GalleryListResult>
  publish(request: GalleryPublishRequest): Promise<GalleryPublishResult>
  load(buildId: string): Promise<GalleryLoadResult>
  reportBuild(
    buildId: string,
    report: GalleryReportRequest,
  ): Promise<GalleryReportResult>
  deleteBuild(
    buildId: string,
    identity: GalleryDeleteIdentity,
  ): Promise<GalleryDeleteResult>
}

const authorLabel = (author: SharedBuildAuthorIdentity): string => {
  if (author.identityMode === 'authenticated') return author.displayName
  return author.displayName ?? 'Anonymous'
}

const summarizePayload = (
  payload: SharedBuildPayload,
): GalleryBuildSummary => ({
  id: payload.buildId,
  title: payload.gallery.title,
  author: authorLabel(payload.gallery.author),
  brickCount: payload.build.bricks.length,
  updatedAt: payload.gallery.updatedAt,
})

const parsePayloadList = (json: string): SharedBuildPayload[] | null => {
  let data: unknown
  try {
    data = JSON.parse(json)
  } catch {
    return null
  }

  const result = SharedBuildPayloadSchema.array().safeParse(data)
  return result.success ? result.data : null
}

export function createGalleryClient(baseUrl: string): GalleryClient {
  const url = (path: string) => `${baseUrl.replace(/\/$/, '')}${path}`

  return {
    async list() {
      let response: Response
      try {
        response = await fetch(url('/builds'))
      } catch (err) {
        return {
          ok: false,
          reason: 'network-error',
          message: err instanceof Error ? err.message : 'Network error',
        }
      }

      if (!response.ok) {
        return {
          ok: false,
          reason: 'server-error',
          message: `Server error: ${response.status}`,
        }
      }

      let raw: string
      try {
        raw = await response.text()
      } catch {
        return {
          ok: false,
          reason: 'server-error',
          message: 'Failed to read response body',
        }
      }

      const payloads = parsePayloadList(raw)
      if (!payloads) {
        return {
          ok: false,
          reason: 'validation-error',
          message: 'Server returned invalid gallery list',
        }
      }

      return { ok: true, builds: payloads.map(summarizePayload) }
    },

    async publish(request) {
      let response: Response
      try {
        response = await fetch(url('/builds'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
        })
      } catch (err) {
        return {
          ok: false,
          reason: 'network-error',
          message: err instanceof Error ? err.message : 'Network error',
        }
      }

      if (response.status === 401) {
        return {
          ok: false,
          reason: 'unauthorized',
          message: 'Authentication required',
        }
      }

      if (response.status === 422) {
        return {
          ok: false,
          reason: 'validation-error',
          message: 'Publish rejected: validation failed',
        }
      }

      if (!response.ok) {
        return {
          ok: false,
          reason: 'server-error',
          message: `Server error: ${response.status}`,
        }
      }

      let raw: string
      try {
        raw = await response.text()
      } catch {
        return {
          ok: false,
          reason: 'server-error',
          message: 'Failed to read response body',
        }
      }

      const payload = safeParseSharedBuildPayload(raw)
      if (!payload) {
        return {
          ok: false,
          reason: 'validation-error',
          message: 'Server returned invalid payload',
        }
      }

      return { ok: true, payload }
    },

    async load(buildId) {
      let response: Response
      try {
        response = await fetch(url(`/builds/${encodeURIComponent(buildId)}`))
      } catch (err) {
        return {
          ok: false,
          reason: 'network-error',
          message: err instanceof Error ? err.message : 'Network error',
        }
      }

      if (response.status === 404) {
        return { ok: false, reason: 'not-found', message: 'Build not found' }
      }

      if (response.status === 410) {
        return {
          ok: false,
          reason: 'deleted',
          message: 'Build has been deleted',
        }
      }

      if (!response.ok) {
        return {
          ok: false,
          reason: 'server-error',
          message: `Server error: ${response.status}`,
        }
      }

      let raw: string
      try {
        raw = await response.text()
      } catch {
        return {
          ok: false,
          reason: 'server-error',
          message: 'Failed to read response body',
        }
      }

      const payload = safeParseSharedBuildPayload(raw)
      if (!payload) {
        return {
          ok: false,
          reason: 'validation-error',
          message: 'Server returned invalid payload',
        }
      }

      return { ok: true, payload }
    },

    async reportBuild(buildId, report) {
      let response: Response
      try {
        response = await fetch(
          url(`/builds/${encodeURIComponent(buildId)}/reports`),
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(report),
          },
        )
      } catch (err) {
        return {
          ok: false,
          reason: 'network-error',
          message: err instanceof Error ? err.message : 'Network error',
        }
      }

      if (response.status === 404) {
        return { ok: false, reason: 'not-found', message: 'Build not found' }
      }

      if (response.status === 422) {
        return {
          ok: false,
          reason: 'validation-error',
          message: 'Invalid report request',
        }
      }

      if (!response.ok) {
        return {
          ok: false,
          reason: 'server-error',
          message: `Server error: ${response.status}`,
        }
      }

      return { ok: true }
    },

    async deleteBuild(buildId, identity) {
      let response: Response
      try {
        response = await fetch(url(`/builds/${encodeURIComponent(buildId)}`), {
          method: 'DELETE',
          headers: { 'x-user-id': identity.userId },
        })
      } catch (err) {
        return {
          ok: false,
          reason: 'network-error',
          message: err instanceof Error ? err.message : 'Network error',
        }
      }

      if (response.status === 404) {
        return { ok: false, reason: 'not-found', message: 'Build not found' }
      }

      if (response.status === 403) {
        return {
          ok: false,
          reason: 'unauthorized',
          message: 'Unauthorized: not the build owner',
        }
      }

      if (!response.ok) {
        return {
          ok: false,
          reason: 'server-error',
          message: `Server error: ${response.status}`,
        }
      }

      return { ok: true }
    },
  }
}

const fixtureBuilds: SharedBuildPayload[] = [
  {
    contractVersion: SHARED_BUILD_CONTRACT_VERSION,
    buildId: 'fixture-starter-house',
    build: {
      version: 1,
      baseplate: { size: BASEPLATE_SIZE_STUDS },
      bricks: [
        { partId: 'brick-2x4', color: 'red', x: 8, y: 0, z: 8, rot: 0 },
        { partId: 'brick-2x4', color: 'red', x: 12, y: 0, z: 8, rot: 0 },
        { partId: 'brick-2x4', color: 'blue', x: 8, y: 3, z: 8, rot: 0 },
        { partId: 'brick-2x4', color: 'blue', x: 12, y: 3, z: 8, rot: 0 },
      ],
    },
    gallery: {
      title: 'Starter House',
      description: 'A compact starter wall with two stacked rows.',
      visibility: 'public',
      author: { identityMode: 'anonymous', displayName: 'Blocky Team' },
      publishedAt: '2026-06-08T00:00:00.000Z',
      updatedAt: '2026-06-08T00:00:00.000Z',
    },
  },
  {
    contractVersion: SHARED_BUILD_CONTRACT_VERSION,
    buildId: 'fixture-color-steps',
    build: {
      version: 1,
      baseplate: { size: BASEPLATE_SIZE_STUDS },
      bricks: [
        { partId: 'plate-2x4', color: 'green', x: 5, y: 0, z: 12, rot: 0 },
        { partId: 'plate-2x4', color: 'yellow', x: 7, y: 1, z: 12, rot: 0 },
        { partId: 'plate-2x4', color: 'orange', x: 9, y: 2, z: 12, rot: 0 },
      ],
    },
    gallery: {
      title: 'Color Steps',
      description: 'A small stepped color study.',
      visibility: 'public',
      author: { identityMode: 'anonymous' },
      publishedAt: '2026-06-08T01:00:00.000Z',
      updatedAt: '2026-06-08T01:00:00.000Z',
    },
  },
]

export function createFixtureGalleryClient(
  payloads: unknown[] = fixtureBuilds,
): GalleryClient {
  const parsePayloads = (): SharedBuildPayload[] | null => {
    const result = SharedBuildPayloadSchema.array().safeParse(payloads)
    return result.success ? result.data : null
  }

  return {
    async list() {
      const parsed = parsePayloads()
      if (!parsed) {
        return {
          ok: false,
          reason: 'validation-error',
          message: 'Fixture gallery contains invalid builds',
        }
      }

      return { ok: true, builds: parsed.map(summarizePayload) }
    },

    async publish() {
      return {
        ok: false,
        reason: 'server-error',
        message: 'Fixture gallery is read-only',
      }
    },

    async load(buildId) {
      const parsed = parsePayloads()
      if (!parsed) {
        return {
          ok: false,
          reason: 'validation-error',
          message: 'Fixture gallery contains invalid builds',
        }
      }

      const payload = parsed.find((candidate) => candidate.buildId === buildId)
      if (!payload) {
        return { ok: false, reason: 'not-found', message: 'Build not found' }
      }

      return { ok: true, payload }
    },

    async reportBuild() {
      return {
        ok: false,
        reason: 'server-error',
        message: 'Fixture gallery is read-only',
      }
    },

    async deleteBuild() {
      return {
        ok: false,
        reason: 'server-error',
        message: 'Fixture gallery is read-only',
      }
    },
  }
}
