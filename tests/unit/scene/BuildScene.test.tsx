import Graph from 'graphology'
import ReactThreeTestRenderer from '@react-three/test-renderer'
import type { ReactNode } from 'react'
import type { PerspectiveCamera } from 'three'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { DEFAULT_COLOR_ID } from '@/domain/model/colors'
import { STUD } from '@/domain/grid'
import { DEFAULT_PART_ID } from '@/domain/parts/catalog'
import { BuildScene } from '@/scene/BuildScene'
import { useCursorStore } from '@/state/cursor'
import { type BuildStoreWithTemporal, useBuildStore } from '@/state/store'

vi.mock('@react-three/fiber', async () => {
  const actual =
    await vi.importActual<typeof import('@react-three/fiber')>(
      '@react-three/fiber',
    )

  return {
    ...actual,
    Canvas: ({ children }: { children: ReactNode }) => <>{children}</>,
    useThree: () => ({
      camera: {} as PerspectiveCamera,
      gl: {
        domElement: {
          getBoundingClientRect: () => ({
            left: 0,
            top: 0,
            width: 1,
            height: 1,
          }),
        },
      },
    }),
  }
})

vi.mock('@react-three/drei', () => ({
  OrbitControls: () => null,
}))

vi.mock('@/scene/CameraRig', () => ({
  CameraRig: () => null,
}))

vi.mock('@/scene/InstancedBricks', () => ({
  InstancedBricks: () => null,
}))

vi.mock('@/scene/Lighting', () => ({
  Lighting: () => null,
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

const resetCursorStore = () => {
  useCursorStore.setState({
    colorId: DEFAULT_COLOR_ID,
    partId: DEFAULT_PART_ID,
    rot: 0,
    rotation: 0,
    offset: undefined,
    cursorBrick: {
      partId: DEFAULT_PART_ID,
      colorId: DEFAULT_COLOR_ID,
      rot: 0,
      offset: undefined,
    },
    editingTool: 'place',
  })
}

describe('BuildScene', () => {
  beforeEach(() => {
    ;(globalThis as typeof globalThis & {
      IS_REACT_ACT_ENVIRONMENT?: boolean
    }).IS_REACT_ACT_ENVIRONMENT = true
    resetBuildStore()
    resetCursorStore()
  })

  it('renders a ghost brick after hovering the baseplate', async () => {
    const renderer = await ReactThreeTestRenderer.create(<BuildScene />)

    expect(
      renderer.scene.findAll((node) => node.props.name === 'ghost-brick'),
    ).toHaveLength(0)

    const [baseplate] = renderer.scene.findAll(
      (node) =>
        node.type === 'Mesh' && typeof node.props.onPointerMove === 'function',
    )

    expect(baseplate).toBeDefined()

    await renderer.fireEvent(baseplate, 'onPointerMove', {
      point: { x: 2 * STUD, y: 0, z: 3 * STUD },
      stopPropagation: () => {},
    })

    expect(
      renderer.scene.findAll((node) => node.props.name === 'ghost-brick'),
    ).toHaveLength(1)

    await renderer.unmount()
  })
})
