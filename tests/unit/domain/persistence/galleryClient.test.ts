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
import { createFixtureGalleryClient } from '@/domain/persistence/galleryClient'
import { SHARED_BUILD_CONTRACT_VERSION } from '@/domain/persistence/sharedBuildContract'
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
    setItem: (k, v) => {
      map.set(k, v)
    },
    removeItem: (k) => {
      map.delete(k)
    },
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
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
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

  it('returns validation-error result when server responds 422', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({ error: 'Invalid publish request', details: [] }),
        { status: 422 },
      ),
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
      expect(result.reason).toBe('validation-error')
    }
  })

  it('returns server-error result for non-2xx non-401 non-422 responses', async () => {
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

describe('galleryClient.list', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns summaries for published builds on successful list (200)', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify([makePublishResponse()]), { status: 200 }),
    )

    const client = createGalleryClient('http://localhost:4000')
    const result = await client.list()

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.builds).toEqual([
        expect.objectContaining({
          id: 'srv_abc123',
          title: 'Test Build',
          author: 'Anonymous',
          brickCount: 0,
        }),
      ])
    }
  })

  it('returns validation-error when the list payload is malformed', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify([{ not: 'a build' }]), { status: 200 }),
    )

    const client = createGalleryClient('http://localhost:4000')
    const result = await client.list()

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toBe('validation-error')
    }
  })

  it('returns network-error result when list fetch throws', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Failed to fetch'))

    const client = createGalleryClient('http://localhost:4000')
    const result = await client.list()

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toBe('network-error')
    }
  })
})

describe('fixture gallery client', () => {
  it('lists fixture-backed published builds with metadata', async () => {
    const client = createFixtureGalleryClient()
    const result = await client.list()

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.builds.length).toBeGreaterThan(0)
      expect(result.builds[0]).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          title: expect.any(String),
          author: expect.any(String),
          brickCount: expect.any(Number),
        }),
      )
    }
  })

  it('loads a fixture build by id', async () => {
    const client = createFixtureGalleryClient()
    const listed = await client.list()
    expect(listed.ok).toBe(true)
    if (!listed.ok) return

    const loaded = await client.load(listed.builds[0].id)

    expect(loaded.ok).toBe(true)
    if (loaded.ok) {
      expect(loaded.payload.buildId).toBe(listed.builds[0].id)
      expect(loaded.payload.build.bricks).toHaveLength(
        listed.builds[0].brickCount,
      )
    }
  })

  it('rejects malformed fixture payloads before exposing them', async () => {
    const malformed = {
      ...makePublishResponse(),
      build: { ...makeBuild(), baseplate: { size: 12 } },
    }
    const client = createFixtureGalleryClient([malformed])

    const listed = await client.list()
    const loaded = await client.load('srv_abc123')

    expect(listed.ok).toBe(false)
    expect(loaded.ok).toBe(false)
    if (!loaded.ok) {
      expect(loaded.reason).toBe('validation-error')
    }
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

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:4000/builds/srv_abc123',
    )
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

  it('returns deleted result when server responds 410', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Build has been deleted' }), {
        status: 410,
      }),
    )

    const client = createGalleryClient('http://localhost:4000')
    const result = await client.load('deleted_build')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toBe('deleted')
    }
  })

  it('deleted reason is distinct from not-found and network-error', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response('', { status: 410 }),
    )

    const client = createGalleryClient('http://localhost:4000')
    const result = await client.load('deleted_build')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).not.toBe('not-found')
      expect(result.reason).not.toBe('network-error')
      expect(result.reason).toBe('deleted')
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

describe('galleryClient.reportBuild', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns ok:true on a successful report (201)', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ reported: true }), { status: 201 }),
    )

    const client = createGalleryClient('http://localhost:4000')
    const result = await client.reportBuild('srv_abc123', { reason: 'spam' })

    expect(result.ok).toBe(true)
  })

  it('posts to /builds/:id/reports', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ reported: true }), { status: 201 }),
    )

    const client = createGalleryClient('http://localhost:4000')
    await client.reportBuild('srv_abc123', { reason: 'spam' })

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:4000/builds/srv_abc123/reports',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('returns not-found result on 404', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response('Not Found', { status: 404 }),
    )

    const client = createGalleryClient('http://localhost:4000')
    const result = await client.reportBuild('unknown', { reason: 'spam' })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toBe('not-found')
    }
  })

  it('returns validation-error result on 422', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'bad reason' }), { status: 422 }),
    )

    const client = createGalleryClient('http://localhost:4000')
    const result = await client.reportBuild('srv_abc123', {
      reason: 'other',
      details: 'x',
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toBe('validation-error')
    }
  })

  it('returns network-error result when fetch throws', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))

    const client = createGalleryClient('http://localhost:4000')
    const result = await client.reportBuild('srv_abc123', { reason: 'abuse' })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toBe('network-error')
    }
  })
})

describe('galleryClient.deleteBuild', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns ok:true on successful deletion (200)', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ deleted: true }), { status: 200 }),
    )

    const client = createGalleryClient('http://localhost:4000')
    const result = await client.deleteBuild('srv_abc123', { userId: 'user1' })

    expect(result.ok).toBe(true)
  })

  it('sends DELETE to /builds/:id with x-user-id header', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ deleted: true }), { status: 200 }),
    )

    const client = createGalleryClient('http://localhost:4000')
    await client.deleteBuild('srv_abc123', { userId: 'user1' })

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:4000/builds/srv_abc123',
      expect.objectContaining({
        method: 'DELETE',
        headers: expect.objectContaining({ 'x-user-id': 'user1' }),
      }),
    )
  })

  it('returns unauthorized result on 403', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response('Forbidden', { status: 403 }),
    )

    const client = createGalleryClient('http://localhost:4000')
    const result = await client.deleteBuild('srv_abc123', {
      userId: 'wrong_user',
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toBe('unauthorized')
    }
  })

  it('returns not-found result on 404', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response('Not Found', { status: 404 }),
    )

    const client = createGalleryClient('http://localhost:4000')
    const result = await client.deleteBuild('unknown', { userId: 'user1' })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toBe('not-found')
    }
  })

  it('returns network-error result when fetch throws', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))

    const client = createGalleryClient('http://localhost:4000')
    const result = await client.deleteBuild('srv_abc123', { userId: 'user1' })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toBe('network-error')
    }
  })
})
