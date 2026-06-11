import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  resolveDefaultGalleryClient,
  resolveGalleryBaseUrl,
} from '@/domain/persistence/galleryConfig'

describe('galleryConfig', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('falls back to demo fixtures when VITE_GALLERY_URL is empty', async () => {
    vi.stubEnv('VITE_GALLERY_URL', '')

    expect(resolveGalleryBaseUrl()).toBe('')

    const { client, mode } = resolveDefaultGalleryClient()
    const result = await client.list()

    expect(mode).toBe('demo')
    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }

    expect(result.builds.map((build) => build.title)).toEqual([
      'Starter House',
      'Color Steps',
    ])
  })

  it('uses the live backend when VITE_GALLERY_URL is configured', async () => {
    vi.stubEnv('VITE_GALLERY_URL', 'http://localhost:4000')
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ builds: [] }), { status: 200 }),
    )

    expect(resolveGalleryBaseUrl()).toBe('http://localhost:4000')

    const { client, mode } = resolveDefaultGalleryClient()
    const result = await client.list()

    expect(mode).toBe('live')
    expect(result.ok).toBe(true)
    expect(fetch).toHaveBeenCalledWith('http://localhost:4000/builds')
  })
})
