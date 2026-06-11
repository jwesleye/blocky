import { render, waitFor } from '@testing-library/react'
import Graph from 'graphology'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { App } from '@/App'
import type { Build } from '@/domain/model/build'
import {
  AUTOSAVE_STORAGE_KEY,
  createShareUrl,
  saveBuild,
} from '@/domain/persistence'
import { type BuildStoreWithTemporal, useBuildStore } from '@/state/store'

// jsdom has no WebGL context, so mock the canonical scene surface.
vi.mock('@react-three/fiber', () => ({
  Canvas: () => <canvas data-testid="scene-canvas" />,
}))

vi.mock('@/scene/Scene', () => ({
  Scene: () => <canvas data-testid="interactive-scene" />,
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
