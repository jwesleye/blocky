import type { Build } from '@/domain/model/build'
import { safeParseSharedBuildPayload } from './sharedBuildContract'
import type {
  SharedBuildAuthorIdentity,
  SharedBuildPayload,
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
        | 'network-error'
        | 'validation-error'
        | 'server-error'
      message: string
    }

export interface GalleryClient {
  publish(request: GalleryPublishRequest): Promise<GalleryPublishResult>
  load(buildId: string): Promise<GalleryLoadResult>
}

export function createGalleryClient(baseUrl: string): GalleryClient {
  const url = (path: string) => `${baseUrl.replace(/\/$/, '')}${path}`

  return {
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
  }
}
