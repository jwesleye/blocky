import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'

import { BASEPLATE_SIZE_STUDS } from '@/domain/grid'
import type { Build } from '@/domain/model/build'
import {
  loadBuild,
  saveBuild,
  AUTOSAVE_STORAGE_KEY,
} from '@/domain/persistence/autosave'
import type { KeyValueStorage } from '@/domain/persistence/autosave'
import { createGalleryClient } from '@/domain/persistence/galleryClient'
import {
  SHARED_BUILD_CONTRACT_VERSION,
} from '@/domain/persistence/sharedBuildContract'
import type { SharedBuildPayload } from '@/domain/persistence/sharedBuildContract'

const makeBuild = (): Build => ({
  version: 1,
  baseplate: { size: BASEPLATE_SIZE_STUDS },
  bricks: [],
})

const makePublishResponse = (): SharedBuildPayload => ({
  contractVersion: SHARED_BUILD_CONTRACT_VERSION,
  buildId: 'srv_abc123',
  build: makeBuild(),
  gallery: {
    title: 'Test Build',
    visibility: 'public',
    author: { identityMode: 'anonymous' },
    publishedAt: '2026-06-08T00:00:00.000Z',
    updatedAt: '2026-06-08T00:00:00.000Z',
  },
})

function memoryStorage(): KeyValueStorage & { map: Map<string, string> } {
  const map = new Map<string, string>()
  return {
    map,
    getItem: (k) => (map.has(k) ? (map.get(k) as string) : null),
    setItem: (k, v) => { map.set(k, v) },
    removeItem: (k) => { map.delete(k) },
  }
}

describe('galleryClient.publish', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns the server payload on successful publish (201)', async () => {
    const serverPayload = makePublishResponse()
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(serverPayload), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    const client = createGalleryClient('http://localhost:4000')
    const result = await client.publish({
      build: makeBuild(),
      gallery: {
        title: 'Test Build',
        visibility: 'public',
        author: { identityMode: 'anonymous' },
      },
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.payload.buildId).toBe('srv_abc123')
      expect(result.payload.gallery.title).toBe('Test Build')
    }
  })

  it('posts to /builds with the build and gallery metadata', async () => {
    const serverPayload = makePublishResponse()
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(serverPayload), { status: 201 }),
    )

    const client = createGalleryClient('http://localhost:4000')
    await client.publish({
      build: makeBuild(),
      gallery: {
        title: 'My Build',
        visibility: 'unlisted',
        author: { identityMode: 'anonymous', displayName: 'Tester' },
      },
    })

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:4000/builds',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      }),
    )
  })

  it('returns network-error result when fetch throws', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Failed to fetch'))

    const client = createGalleryClient('http://localhost:4000')
    const result = await client.publish({
      build: makeBuild(),
      gallery: {
        title: 'Test',
        visibility: 'public',
        author: { identityMode: 'anonymous' },
      },
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toBe('network-error')
    }
  })

  it('returns unauthorized result when server responds 401', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response('Unauthorized', { status: 401 }),
    )

    const client = createGalleryClient('http://localhost:4000')
    const result = await client.publish({
      build: makeBuild(),
      gallery: {
        title: 'Test',
        visibility: 'public',
        author: { identityMode: 'anonymous' },
      },
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toBe('unauthorized')
    }
  })

  it('returns server-error result for non-2xx non-401 responses', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response('Internal Server Error', { status: 500 }),
    )

    const client = createGalleryClient('http://localhost:4000')
    const result = await client.publish({
      build: makeBuild(),
      gallery: {
        title: 'Test',
        visibility: 'public',
        author: { identityMode: 'anonymous' },
      },
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toBe('server-error')
    }
  })

  it('does not mutate local autosave state on publish failure', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network Error'))

    const storage = memoryStorage()
    const build = makeBuild()
    saveBuild(build, storage)
    const savedBefore = loadBuild(storage)

    const client = createGalleryClient('http://localhost:4000')
    await client.publish({
      build,
      gallery: {
        title: 'Test',
        visibility: 'public',
        author: { identityMode: 'anonymous' },
      },
    })

    expect(storage.map.has(AUTOSAVE_STORAGE_KEY)).toBe(true)
    expect(loadBuild(storage)).toEqual(savedBefore)
  })
})

describe('galleryClient.load', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns the shared build payload on successful load (200)', async () => {
    const serverPayload = makePublishResponse()
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(serverPayload), { status: 200 }),
    )

    const client = createGalleryClient('http://localhost:4000')
    const result = await client.load('srv_abc123')

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.payload.buildId).toBe('srv_abc123')
    }
  })

  it('fetches from /builds/:id', async () => {
    const serverPayload = makePublishResponse()
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(serverPayload), { status: 200 }),
    )

    const client = createGalleryClient('http://localhost:4000')
    await client.load('srv_abc123')

    expect(fetch).toHaveBeenCalledWith('http://localhost:4000/builds/srv_abc123')
  })

  it('returns not-found result when server responds 404', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response('Not Found', { status: 404 }),
    )

    const client = createGalleryClient('http://localhost:4000')
    const result = await client.load('nonexistent')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toBe('not-found')
    }
  })

  it('returns network-error result when fetch throws', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Failed to fetch'))

    const client = createGalleryClient('http://localhost:4000')
    const result = await client.load('srv_abc123')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toBe('network-error')
    }
  })

  it('returns validation-error when server returns malformed payload', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ not: 'a valid payload' }), { status: 200 }),
    )

    const client = createGalleryClient('http://localhost:4000')
    const result = await client.load('srv_abc123')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toBe('validation-error')
    }
  })
})
