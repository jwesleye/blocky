import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import Graph from 'graphology'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Gallery } from '@/components/Gallery'
import { BASEPLATE_SIZE_STUDS } from '@/domain/grid'
import type { Build } from '@/domain/model/build'
import type { GalleryClient } from '@/domain/persistence/galleryClient'
import * as galleryConfig from '@/domain/persistence/galleryConfig'
import { SHARED_BUILD_CONTRACT_VERSION } from '@/domain/persistence/sharedBuildContract'
import type { SharedBuildPayload } from '@/domain/persistence/sharedBuildContract'
import { type BuildStoreWithTemporal, useBuildStore } from '@/state/store'

const makeBuild = (count = 2): Build => ({
  version: 1,
  baseplate: { size: BASEPLATE_SIZE_STUDS },
  bricks: Array.from({ length: count }, (_, index) => ({
    partId: 'brick-2x4',
    color: index % 2 === 0 ? 'red' : 'blue',
    x: index * 3,
    y: 0,
    z: 0,
    rot: 0,
  })),
})

const makePayload = (build: Build = makeBuild()): SharedBuildPayload => ({
  contractVersion: SHARED_BUILD_CONTRACT_VERSION,
  buildId: 'fixture-house',
  build,
  gallery: {
    title: 'Fixture House',
    visibility: 'public',
    author: { identityMode: 'anonymous', displayName: 'Casey' },
    publishedAt: '2026-06-08T00:00:00.000Z',
    updatedAt: '2026-06-08T00:00:00.000Z',
  },
})

const makeClient = (overrides: Partial<GalleryClient> = {}): GalleryClient => ({
  publish: async () => ({
    ok: false,
    reason: 'server-error',
    message: 'Publishing is not used by Gallery',
  }),
  list: async () => ({
    ok: true,
    builds: [
      {
        id: 'fixture-house',
        title: 'Fixture House',
        author: 'Casey',
        brickCount: 2,
        updatedAt: '2026-06-08T00:00:00.000Z',
      },
    ],
  }),
  load: async () => ({ ok: true, payload: makePayload() }),
  reportBuild: async () => ({ ok: true }),
  deleteBuild: async () => ({ ok: true }),
  ...overrides,
})

const resetStore = () => {
  const temporal = (
    useBuildStore as unknown as BuildStoreWithTemporal
  ).temporal.getState()
  temporal.pause()
  useBuildStore.setState({
    bricks: {},
    selection: new Set<string>(),
    connectionGraph: new Graph({ type: 'undirected', allowSelfLoops: false }),
    lastCollapse: null,
    baseplateSize: BASEPLATE_SIZE_STUDS,
    activeCollapse: null,
  })
  temporal.clear()
  temporal.resume()
}

describe('Gallery', () => {
  beforeEach(resetStore)
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('renders published build metadata from the gallery client', async () => {
    render(<Gallery client={makeClient()} />)

    expect(await screen.findByText('Fixture House')).toBeInTheDocument()
    expect(screen.getByText('Casey')).toBeInTheDocument()
    expect(screen.getByText('2 bricks')).toBeInTheDocument()
  })

  it('loads a selected published build into the editor store', async () => {
    render(<Gallery client={makeClient()} />)

    fireEvent.click(await screen.findByRole('button', { name: 'Load' }))

    await waitFor(() => {
      expect(Object.keys(useBuildStore.getState().bricks)).toHaveLength(2)
    })
  })

  it('shows an error and preserves the current build when load data is malformed', async () => {
    useBuildStore.setState({
      bricks: {
        existing: {
          id: 'existing',
          partId: 'brick-2x4',
          color: 'green',
          x: 0,
          y: 0,
          z: 0,
          rot: 0,
        },
      },
    })

    const malformed = {
      ...makePayload(),
      build: { ...makeBuild(), baseplate: { size: 12 } },
    } as unknown as SharedBuildPayload

    render(
      <Gallery
        client={makeClient({
          load: async () => ({ ok: true, payload: malformed }),
        })}
      />,
    )

    fireEvent.click(await screen.findByRole('button', { name: 'Load' }))

    expect(await screen.findByText(/could not load/i)).toBeInTheDocument()
    expect(Object.keys(useBuildStore.getState().bricks)).toEqual(['existing'])
  })

  it('renders an unavailable gallery error without crashing', async () => {
    render(
      <Gallery
        client={makeClient({
          list: async () => ({
            ok: false,
            reason: 'network-error',
            message: 'Gallery unavailable',
          }),
        })}
      />,
    )

    expect(await screen.findByText('Gallery unavailable')).toBeInTheDocument()
  })

  it('renders an empty state when no builds are available', async () => {
    render(
      <Gallery
        client={makeClient({ list: async () => ({ ok: true, builds: [] }) })}
      />,
    )

    expect(
      await screen.findByText('No published builds yet.'),
    ).toBeInTheDocument()
  })

  it('shows a demo gallery label when no backend URL is configured', async () => {
    vi.stubEnv('VITE_GALLERY_URL', '')

    render(<Gallery />)

    expect(await screen.findByText('Starter House')).toBeInTheDocument()
    expect(screen.getByText('Demo gallery')).toBeInTheDocument()
  })

  it('loads the default gallery client once when no client prop is provided', async () => {
    vi.stubEnv('VITE_GALLERY_URL', '')

    const list = vi.fn(async () => ({
      ok: true as const,
      builds: [
        {
          id: 'fixture-house',
          title: 'Fixture House',
          author: 'Casey',
          brickCount: 2,
          updatedAt: '2026-06-08T00:00:00.000Z',
        },
      ],
    }))

    vi.spyOn(galleryConfig, 'resolveDefaultGalleryClient').mockReturnValue({
      client: makeClient({ list }),
      mode: 'demo',
    })

    render(<Gallery />)

    expect(await screen.findByText('Fixture House')).toBeInTheDocument()
    await waitFor(() => {
      expect(list).toHaveBeenCalledTimes(1)
    })
  })
})
