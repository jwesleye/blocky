import { act, renderHook } from '@testing-library/react'
import Graph from 'graphology'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { BASEPLATE_SIZE_STUDS } from '@/domain/grid'
import { bricksToBuild } from '@/domain/model/build'
import { useBuildPersistence } from '@/hooks/useBuildPersistence'
import { type BuildStoreWithTemporal, useBuildStore } from '@/state/store'

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
  })
  temporal.clear()
  temporal.resume()
}

describe('useBuildPersistence', () => {
  beforeEach(() => {
    resetStore()
    vi.restoreAllMocks()
  })

  it('exports the canonical build store as a JSON blob', async () => {
    useBuildStore.getState().placeBrick({
      partId: 'brick-2x4',
      color: 'red',
      x: 0,
      y: 0,
      z: 0,
      rot: 0,
    })

    const createObjectURL = vi.fn((blob: Blob) => {
      void blob
      return 'blob:mock'
    })
    const revokeObjectURL = vi.fn()
    Object.defineProperty(URL, 'createObjectURL', {
      value: createObjectURL,
      configurable: true,
      writable: true,
    })
    Object.defineProperty(URL, 'revokeObjectURL', {
      value: revokeObjectURL,
      configurable: true,
      writable: true,
    })
    const anchorClick = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {})

    const { result } = renderHook(() => useBuildPersistence())
    act(() => {
      result.current.exportToJSON()
    })

    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob))
    const blobArg = createObjectURL.mock.calls[0]?.[0]
    expect(blobArg).toBeInstanceOf(Blob)
    if (!(blobArg instanceof Blob)) {
      throw new Error('Expected createObjectURL to receive a Blob')
    }
    const blob = blobArg
    const expectedBuild = bricksToBuild(
      [
        {
          id: 'seed',
          partId: 'brick-2x4',
          color: 'red',
          x: 0,
          y: 0,
          z: 0,
          rot: 0,
        },
      ],
      BASEPLATE_SIZE_STUDS,
    )
    expect(blob.size).toBe(
      new Blob([JSON.stringify(expectedBuild, null, 2)], {
        type: 'application/json',
      }).size,
    )
    expect(anchorClick).toHaveBeenCalledTimes(1)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock')
  })

  it('imports JSON into the canonical build store', async () => {
    const build = bricksToBuild(
      [
        {
          id: 'seed',
          partId: 'brick-2x4',
          color: 'blue',
          x: 1,
          y: 0,
          z: 2,
          rot: 0,
        },
      ],
      BASEPLATE_SIZE_STUDS,
    )

    let handleChange:
      | ((event: { target: { files: Array<{ text: () => Promise<string> }> } }) => Promise<void>)
      | null = null

    const input = {
      type: '',
      accept: '',
      click: vi.fn(),
      set onchange(fn) {
        handleChange = fn
      },
      get onchange() {
        return handleChange
      },
    }

    const originalCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
      if (tagName === 'input') {
        return input as unknown as HTMLInputElement
      }
      return originalCreateElement(tagName)
    })

    const { result } = renderHook(() => useBuildPersistence())
    let importPromise: Promise<void>
    await act(async () => {
      importPromise = result.current.importFromJSON()
    })

    expect(input.click).toHaveBeenCalledTimes(1)
    expect(handleChange).not.toBeNull()

    await act(async () => {
      await handleChange?.({
        target: {
          files: [
            {
              text: async () => JSON.stringify(build),
            },
          ],
        },
      })
    })

    await importPromise!

    expect(Object.values(useBuildStore.getState().bricks)).toHaveLength(1)
  })
})
