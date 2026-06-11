import { act, renderHook } from '@testing-library/react'
import Graph from 'graphology'
import { beforeEach, describe, expect, it, vi } from 'vitest'

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
    baseplateSize: 32,
  })
  temporal.clear()
  temporal.resume()
}

type FakeFile = { text: () => Promise<string> }

function makeMockInput() {
  let handleChange:
    | ((event: { target: { files: FakeFile[] } }) => Promise<void>)
    | null = null

  const input = {
    type: '',
    accept: '',
    click: vi.fn(),
    set onchange(fn: typeof handleChange) {
      handleChange = fn
    },
    get onchange() {
      return handleChange
    },
  }

  const originalCreateElement = document.createElement.bind(document)
  vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
    if (tagName === 'input') return input as unknown as HTMLInputElement
    return originalCreateElement(tagName)
  })

  async function triggerChange(fileText: string) {
    await act(async () => {
      await handleChange?.({
        target: { files: [{ text: async () => fileText }] },
      })
    })
  }

  return { input, triggerChange }
}

describe('useBuildPersistence', () => {
  beforeEach(() => {
    resetStore()
    vi.restoreAllMocks()
  })

  it('exports the canonical build store as a JSON blob', async () => {
    useBuildStore.getState().setBaseplateSize(48)
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
      48,
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
      48,
    )

    const { input, triggerChange } = makeMockInput()
    const { result } = renderHook(() => useBuildPersistence())
    let importPromise: Promise<void>
    await act(async () => {
      importPromise = result.current.importFromJSON()
    })

    expect(input.click).toHaveBeenCalledTimes(1)

    await triggerChange(JSON.stringify(build))
    await importPromise!

    expect(Object.values(useBuildStore.getState().bricks)).toHaveLength(1)
    expect(useBuildStore.getState().baseplateSize).toBe(48)
  })

  it('alerts and does not update store when JSON is malformed', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
    const { triggerChange } = makeMockInput()

    const { result } = renderHook(() => useBuildPersistence())
    let importPromise: Promise<void>
    await act(async () => {
      importPromise = result.current.importFromJSON()
    })

    await triggerChange('{not json')
    await importPromise!

    expect(alertSpy).toHaveBeenCalledOnce()
    expect(alertSpy.mock.calls[0]?.[0]).toMatch(/Invalid build file/)
    expect(Object.values(useBuildStore.getState().bricks)).toHaveLength(0)
  })

  it('alerts and does not update store when JSON fails schema validation', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
    const { triggerChange } = makeMockInput()

    // version 99 is not in the valid version union, so validateBuild rejects it
    const schemaInvalid = JSON.stringify({
      version: 99,
      baseplate: { size: 32 },
      bricks: [],
    })

    const { result } = renderHook(() => useBuildPersistence())
    let importPromise: Promise<void>
    await act(async () => {
      importPromise = result.current.importFromJSON()
    })

    await triggerChange(schemaInvalid)
    await importPromise!

    expect(alertSpy).toHaveBeenCalledOnce()
    expect(alertSpy.mock.calls[0]?.[0]).toMatch(/Invalid build file/)
    expect(Object.values(useBuildStore.getState().bricks)).toHaveLength(0)
  })

  it('alerts and does not update store when build has unknown mount value', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
    const unknownMount = JSON.stringify({
      version: 3,
      baseplate: { size: 32 },
      bricks: [
        {
          partId: 'brick-1x1',
          color: 'red',
          x: 0,
          y: 0,
          z: 0,
          rot: 0,
          mount: 'sideways',
        },
      ],
    })

    const { triggerChange } = makeMockInput()
    const { result } = renderHook(() => useBuildPersistence())
    let importPromise: Promise<void>
    await act(async () => {
      importPromise = result.current.importFromJSON()
    })

    await triggerChange(unknownMount)
    await importPromise!

    expect(alertSpy).toHaveBeenCalledOnce()
    expect(alertSpy.mock.calls[0]?.[0]).toMatch(/Invalid build file/)
    expect(Object.values(useBuildStore.getState().bricks)).toHaveLength(0)
  })
})
