import { render, waitFor } from '@testing-library/react'
import Graph from 'graphology'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { App } from '@/App'
import type { Build } from '@/domain/model/build'
import {
  AUTOSAVE_STORAGE_KEY,
  createShareUrl,
  loadBuild,
  saveBuild,
} from '@/domain/persistence'
import { type BuildStoreWithTemporal, useBuildStore } from '@/state/store'

// jsdom has no WebGL context, so mock the r3f <Canvas> (see BuildScene.test.tsx).
vi.mock('@react-three/fiber', () => ({
  Canvas: () => <canvas data-testid="scene-canvas" />,
}))

vi.mock('@/scene/BuildScene', () => ({
  BuildScene: () => <canvas data-testid="interactive-scene" />,
}))

const resetBuildStore = () => {
  const temporal = (
    useBuildStore as unknown as BuildStoreWithTemporal
  ).temporal.getState()
  temporal.pause()
  useBuildStore.setState({
    bricks: {},
    selection: new Set<string>(),
    connectionGraph: new Graph({ type: 'undirected', allowSelfLoops: false }),
    lastCollapse: null,
    baseplateSize: 32,
    activeCollapse: null,
  })
  temporal.clear()
  temporal.resume()
}

const seedBuild = (
  brick: {
    partId: string
    color: string
    x: number
    y: number
    z: number
    rot: 0 | 1 | 2 | 3
  },
  baseplateSize: Build['baseplate']['size'] = 32,
): Build => ({
  version: 1 as const,
  baseplate: { size: baseplateSize },
  bricks: [brick],
})

describe('App', () => {
  beforeEach(() => {
    resetBuildStore()
    localStorage.clear()
    window.history.replaceState({}, '', '/')
    vi.restoreAllMocks()
  })

  it('mounts the interactive scene inside the app shell', () => {
    const { getByTestId } = render(<App />)
    expect(getByTestId('interactive-scene')).toBeTruthy()
  })

  it('mirror controls have a labeled group and accessible button names', () => {
    const { getByRole } = render(<App />)
    expect(getByRole('group', { name: 'Mirror selection' })).toBeInTheDocument()
    expect(
      getByRole('button', { name: 'Mirror along X axis' }),
    ).toBeInTheDocument()
    expect(
      getByRole('button', { name: 'Mirror along Z axis' }),
    ).toBeInTheDocument()
  })
  it('hydrates the build store from the share URL before autosave', async () => {
    const autosavedBuild = seedBuild(
      {
        partId: 'brick-2x4',
        color: 'red',
        x: 0,
        y: 0,
        z: 0,
        rot: 0,
      },
      32,
    )
    const sharedBuild = seedBuild(
      {
        partId: 'brick-1x1',
        color: 'blue',
        x: 4,
        y: 0,
        z: 5,
        rot: 1,
      },
      48,
    )

    saveBuild(autosavedBuild)
    const shareSearch = new URL(
      createShareUrl(sharedBuild, window.location.href),
    ).search
    window.history.replaceState({}, '', `/${shareSearch}`)

    render(<App />)

    await waitFor(() => {
      expect(Object.values(useBuildStore.getState().bricks)).toEqual([
        expect.objectContaining({
          partId: 'brick-1x1',
          color: 'blue',
          x: 4,
          y: 0,
          z: 5,
          rot: 1,
        }),
      ])
      expect(useBuildStore.getState().baseplateSize).toBe(48)
    })

    await waitFor(() => {
      expect(localStorage.getItem(AUTOSAVE_STORAGE_KEY)).not.toBeNull()
      expect(
        JSON.parse(localStorage.getItem(AUTOSAVE_STORAGE_KEY) ?? ''),
      ).toEqual(
        expect.objectContaining({
          baseplate: expect.objectContaining({ size: 48 }),
        }),
      )
      expect(loadBuild()?.baseplate.size).toBe(48)
    })
  })

  it('discards an invalid shared-URL build and falls back to the autosave', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
    const autosavedBuild = seedBuild(
      {
        partId: 'brick-2x4',
        color: 'green',
        x: 2,
        y: 0,
        z: 1,
        rot: 2,
      },
      48,
    )
    // A floating brick (y=30, unconnected) — valid schema, invalid structure.
    const invalidSharedBuild: Build = {
      version: 1,
      baseplate: { size: 32 },
      bricks: [
        { partId: 'brick-1x1', color: 'blue', x: 5, y: 30, z: 5, rot: 0 },
      ],
    }

    saveBuild(autosavedBuild)
    const shareSearch = new URL(
      createShareUrl(invalidSharedBuild, window.location.href),
    ).search
    window.history.replaceState({}, '', `/${shareSearch}`)

    render(<App />)

    await waitFor(() => {
      expect(Object.values(useBuildStore.getState().bricks)).toEqual([
        expect.objectContaining({
          partId: 'brick-2x4',
          color: 'green',
          x: 2,
          y: 0,
          z: 1,
          rot: 2,
        }),
      ])
      expect(useBuildStore.getState().baseplateSize).toBe(48)
    })
    expect(alertSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        'Invalid build file: build violates structural invariants: 1 floating brick(s) not connected to the baseplate',
      ),
    )
  })

  it('discards an overlapping shared-URL build, alerts, and preserves the autosave', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
    const autosavedBuild = seedBuild(
      {
        partId: 'brick-2x4',
        color: 'yellow',
        x: 3,
        y: 0,
        z: 2,
        rot: 1,
      },
      48,
    )
    const invalidSharedBuild: Build = {
      version: 1,
      baseplate: { size: 32 },
      bricks: [
        { partId: 'brick-1x1', color: 'blue', x: 4, y: 0, z: 4, rot: 0 },
        { partId: 'brick-1x1', color: 'red', x: 4, y: 0, z: 4, rot: 0 },
      ],
    }

    saveBuild(autosavedBuild)
    const shareSearch = new URL(
      createShareUrl(invalidSharedBuild, window.location.href),
    ).search
    window.history.replaceState({}, '', `/${shareSearch}`)

    render(<App />)

    await waitFor(() => {
      expect(Object.values(useBuildStore.getState().bricks)).toEqual([
        expect.objectContaining({
          partId: 'brick-2x4',
          color: 'yellow',
          x: 3,
          y: 0,
          z: 2,
          rot: 1,
        }),
      ])
      expect(useBuildStore.getState().baseplateSize).toBe(48)
    })

    expect(alertSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        'Invalid build file: build violates structural invariants: 2 overlapping brick(s)',
      ),
    )
  })

  it('autosaves the shared baseplate size rather than the default after share hydration', async () => {
    const sharedBuild = seedBuild(
      { partId: 'brick-1x1', color: 'blue', x: 4, y: 0, z: 5, rot: 1 },
      48,
    )
    const shareSearch = new URL(
      createShareUrl(sharedBuild, window.location.href),
    ).search
    window.history.replaceState({}, '', `/${shareSearch}`)

    const { unmount } = render(<App />)

    await waitFor(() => {
      expect(useBuildStore.getState().baseplateSize).toBe(48)
    })

    unmount()

    const saved = loadBuild()
    expect(saved?.baseplate.size).toBe(48)
  })

  it('falls back to the autosaved build when no share URL is present', async () => {
    const autosavedBuild = seedBuild(
      {
        partId: 'brick-2x4',
        color: 'green',
        x: 2,
        y: 0,
        z: 1,
        rot: 2,
      },
      48,
    )

    saveBuild(autosavedBuild)

    render(<App />)

    await waitFor(() => {
      expect(Object.values(useBuildStore.getState().bricks)).toEqual([
        expect.objectContaining({
          partId: 'brick-2x4',
          color: 'green',
          x: 2,
          y: 0,
          z: 1,
          rot: 2,
        }),
      ])
      expect(useBuildStore.getState().baseplateSize).toBe(48)
      expect(localStorage.getItem(AUTOSAVE_STORAGE_KEY)).not.toBeNull()
    })
  })
})
