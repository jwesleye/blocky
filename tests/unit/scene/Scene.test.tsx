import Graph from 'graphology'
import ReactThreeTestRenderer from '@react-three/test-renderer'
import type { ReactNode } from 'react'
import type { PerspectiveCamera } from 'three'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { DEFAULT_COLOR_ID } from '@/domain/model/colors'
import { STUD } from '@/domain/grid'
import { DEFAULT_PART_ID } from '@/domain/parts/catalog'
import type { RenderBrick } from '@/scene/instancing'
import { Scene } from '@/scene/Scene'
import { useCursorStore } from '@/state/cursor'
import { type BuildStoreWithTemporal, useBuildStore } from '@/state/store'

const instancedBricksSpy = vi.fn()

interface InstancedBricksMockProps {
  bricks: readonly RenderBrick[]
  onInstanceClick: (
    brick: RenderBrick,
    event: { stopPropagation: () => void },
  ) => void
}

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
  OrbitControls: () => <group name="orbit-controls" />,
}))

vi.mock('@/scene/CameraRig', () => ({
  CameraRig: () => <group name="camera-rig" />,
}))

vi.mock('@/scene/InstancedBricks', () => ({
  InstancedBricks: (props: InstancedBricksMockProps) => {
    instancedBricksSpy(props)
    return <group name="instanced-bricks" />
  },
}))

vi.mock('@/scene/SceneEnvironment', () => ({
  SceneEnvironment: ({ presetId }: { presetId: string }) => (
    <group name="scene-environment" userData={{ presetId }} />
  ),
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

describe('Scene', () => {
  beforeEach(() => {
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true
    instancedBricksSpy.mockClear()
    resetBuildStore()
    resetCursorStore()
  })

  it('composes environment lighting, camera controls, camera reset rig, and instanced bricks from the build store', async () => {
    useBuildStore.setState({
      bricks: {
        red: {
          id: 'red',
          partId: 'brick-2x4',
          color: 'red',
          x: 0,
          y: 0,
          z: 0,
          rot: 0,
        },
        blue: {
          id: 'blue',
          partId: 'brick-1x1',
          color: 'blue',
          x: 6,
          y: 0,
          z: 0,
          rot: 1,
        },
      },
    })

    const renderer = await ReactThreeTestRenderer.create(
      <Scene presetId="night" />,
    )

    expect(
      renderer.scene.findAll(
        (node) =>
          node.props.name === 'scene-environment' &&
          node.props.userData?.presetId === 'night',
      ),
    ).toHaveLength(1)
    expect(
      renderer.scene.findAll((node) => node.props.name === 'camera-rig'),
    ).toHaveLength(1)
    expect(
      renderer.scene.findAll((node) => node.props.name === 'orbit-controls'),
    ).toHaveLength(1)
    expect(
      renderer.scene.findAll((node) => node.props.name === 'instanced-bricks'),
    ).toHaveLength(1)

    expect(instancedBricksSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        bricks: expect.arrayContaining([
          expect.objectContaining({
            id: 'red',
            partId: 'brick-2x4',
            partType: 'brick',
          }),
          expect.objectContaining({
            id: 'blue',
            partId: 'brick-1x1',
            partType: 'brick',
          }),
        ]),
      }),
    )

    await renderer.unmount()
  })

  it('renders a ghost brick after hovering the baseplate', async () => {
    const renderer = await ReactThreeTestRenderer.create(<Scene />)

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

  it('deletes a clicked brick while the place tool is active', async () => {
    useBuildStore.setState({
      bricks: {
        red: {
          id: 'red',
          partId: 'brick-2x4',
          color: 'red',
          x: 0,
          y: 0,
          z: 0,
          rot: 0,
        },
      },
    })

    const renderer = await ReactThreeTestRenderer.create(<Scene />)
    const props = instancedBricksSpy.mock.calls.at(
      -1,
    )?.[0] as InstancedBricksMockProps

    props.onInstanceClick(
      {
        id: 'red',
        partId: 'brick-2x4',
        partType: 'brick',
        color: 'red',
        x: 0,
        y: 0,
        z: 0,
        rot: 0,
      },
      { stopPropagation: vi.fn() },
    )

    expect(useBuildStore.getState().bricks.red).toBeUndefined()

    await renderer.unmount()
  })
})
