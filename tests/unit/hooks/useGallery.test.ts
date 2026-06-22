import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useGallery } from '@/hooks/useGallery'
import { createFixtureGalleryClient } from '@/domain/persistence/galleryClient'
import { useBuildStore } from '@/state/store'

const mockClient = createFixtureGalleryClient()

vi.mock('@/domain/persistence/galleryConfig', () => ({
  resolveDefaultGalleryClient: vi.fn(() => ({
    client: mockClient,
    mode: 'local',
  })),
}))

describe('useGallery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useBuildStore.setState({
      bricks: {},
      selection: new Set<string>(),
      lastCollapse: null,
    })
  })

  it('initializes with default state', async () => {
    const { result } = renderHook(() => useGallery())

    expect(result.current.loading).toBe(true)
    expect(result.current.error).toBe(null)
    expect(result.current.builds).toEqual([])
    expect(result.current.mode).toBe('local')
    expect(result.current.loadingBuildId).toBe(null)

    // Wait for the initial refresh to complete
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
  })

  describe('refresh', () => {
    it('successfully fetches builds', async () => {
      const { result } = renderHook(() => useGallery())

      await act(async () => {
        // Wait for the initial effect to run
        await new Promise((resolve) => setTimeout(resolve, 0))
        await result.current.refresh()
      })

      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBe(null)
      expect(result.current.builds.length).toBeGreaterThan(0)
    })

    it('sets error when fetch fails', async () => {
      // Mock list to return an error just for this test
      vi.spyOn(mockClient, 'list').mockResolvedValueOnce({
        ok: false,
        reason: 'network-error',
        message: 'Network error',
      })

      const { result } = renderHook(() => useGallery())

      await act(async () => {
        // Wait for the initial effect, which will use the mocked error
        await new Promise((resolve) => setTimeout(resolve, 0))
      })

      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBe('Network error')
      expect(result.current.builds).toEqual([])
    })
  })

  describe('loadBuild', () => {
    it('successfully loads a build and updates store', async () => {
      const { result } = renderHook(() => useGallery())

      let loadResult = false
      await act(async () => {
        // Wait for initial refresh to complete
        await new Promise((resolve) => setTimeout(resolve, 0))
        loadResult = await result.current.loadBuild('fixture-starter-house')
      })

      expect(loadResult).toBe(true)
      expect(result.current.error).toBe(null)
      expect(result.current.loadingBuildId).toBe(null)

      const storeState = useBuildStore.getState()
      expect(Object.keys(storeState.bricks).length).toBeGreaterThan(0)
    })

    it('sets error when load fails at client level', async () => {
      vi.spyOn(mockClient, 'load').mockResolvedValueOnce({
        ok: false,
        reason: 'not-found',
        message: 'Build not found',
      })

      const { result } = renderHook(() => useGallery())

      let loadResult = true
      await act(async () => {
        // Wait for initial refresh
        await new Promise((resolve) => setTimeout(resolve, 0))
        loadResult = await result.current.loadBuild('non-existent-build')
      })

      expect(loadResult).toBe(false)
      expect(result.current.error).toBe('Build not found')
      expect(result.current.loadingBuildId).toBe(null)

      const storeState = useBuildStore.getState()
      expect(Object.keys(storeState.bricks).length).toBe(0)
    })

    it('sets error when loaded build is invalid', async () => {
      vi.spyOn(mockClient, 'load').mockResolvedValueOnce({
        ok: true,
        payload: {
          buildId: 'invalid-build',
          contractVersion: 1,
          build: {
            version: 999, // Invalid version
            baseplate: { size: 32 },
            bricks: [],
          },
          gallery: {
            title: 'Invalid',
            description: '',
            visibility: 'public',
            author: { identityMode: 'anonymous' },
            publishedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
        }
      } as any)

      const { result } = renderHook(() => useGallery())

      let loadResult = true
      await act(async () => {
        // Wait for initial refresh
        await new Promise((resolve) => setTimeout(resolve, 0))
        loadResult = await result.current.loadBuild('invalid-build')
      })

      expect(loadResult).toBe(false)
      expect(result.current.error).toBe('Could not load published build.')
      expect(result.current.loadingBuildId).toBe(null)

      const storeState = useBuildStore.getState()
      expect(Object.keys(storeState.bricks).length).toBe(0)
    })
  })
})
