import Graph from 'graphology'
import ReactThreeTestRenderer from '@react-three/test-renderer'
import type { ReactNode } from 'react'
import type { PerspectiveCamera } from 'three'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { DEFAULT_COLOR_ID } from '@/domain/model/colors'
import { STUD } from '@/domain/grid'
import { DEFAULT_PART_ID } from '@/domain/parts/catalog'
import { BuildScene } from '@/scene/BuildScene'
import type { InstancedBricksProps } from '@/scene/InstancedBricks'
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

let lastInstancedBricksProps: InstancedBricksProps | null = null

vi.mock('@/scene/InstancedBricks', () => ({
  InstancedBricks: (props: InstancedBricksProps) => {
    lastInstancedBricksProps = props
    return null
  },
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
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true
    lastInstancedBricksProps = null
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

  it('renders a cylindrical ghost preview for round parts', async () => {
    useCursorStore.setState({ partId: 'round-brick-1x1' })

    const renderer = await ReactThreeTestRenderer.create(<BuildScene />)
    const [baseplate] = renderer.scene.findAll(
      (node) =>
        node.type === 'Mesh' && typeof node.props.onPointerMove === 'function',
    )

    await renderer.fireEvent(baseplate, 'onPointerMove', {
      point: { x: STUD, y: 0, z: STUD },
      stopPropagation: () => {},
    })

    expect(
      renderer.scene.findAll(
        (node) => node.props.object?.type === 'CylinderGeometry',
      ),
    ).toHaveLength(1)

    await renderer.unmount()
  })

  it('rotates slope ghost previews instead of swapping geometry dimensions', async () => {
    useCursorStore.setState({ partId: 'slope-2x1', rot: 1, rotation: 90 })

    const renderer = await ReactThreeTestRenderer.create(<BuildScene />)
    const [baseplate] = renderer.scene.findAll(
      (node) =>
        node.type === 'Mesh' && typeof node.props.onPointerMove === 'function',
    )

    await renderer.fireEvent(baseplate, 'onPointerMove', {
      point: { x: STUD, y: 0, z: 0 },
      stopPropagation: () => {},
    })

    const [ghost] = renderer.scene.findAll(
      (node) => node.props.name === 'ghost-brick',
    )
    const [geometryNode] = renderer.scene.findAll(
      (node) => node.props.object !== undefined,
    )

    geometryNode?.props.object.computeBoundingBox()

    expect(ghost?.props.position).toEqual([1.5, 1.5, 1])
    expect(ghost?.props.rotation).toEqual([0, Math.PI / 2, 0])
    expect(geometryNode?.props.object.boundingBox?.min.x).toBe(-1)
    expect(geometryNode?.props.object.boundingBox?.max.x).toBe(1)
    expect(geometryNode?.props.object.boundingBox?.min.z).toBe(-0.5)
    expect(geometryNode?.props.object.boundingBox?.max.z).toBe(0.5)

    await renderer.unmount()
  })

  it('moves the ghost above a hovered placed brick top face', async () => {
    useBuildStore.setState({
      bricks: {
        brick1: {
          id: 'brick1',
          partId: 'brick-2x4',
          color: DEFAULT_COLOR_ID,
          x: 0,
          y: 0,
          z: 0,
          rot: 0,
        },
      },
    })

    const renderer = await ReactThreeTestRenderer.create(<BuildScene />)

    expect(lastInstancedBricksProps).not.toBeNull()

    await ReactThreeTestRenderer.act(async () => {
      await lastInstancedBricksProps?.onInstancePointerMove?.(
        {
          id: 'brick1',
          partId: 'brick-2x4',
          partType: 'brick',
          color: DEFAULT_COLOR_ID,
          x: 0,
          y: 0,
          z: 0,
          rot: 0,
        },
        {
          face: { normal: { x: 0, y: 1, z: 0 } },
          point: { x: 0, y: 0, z: 0 },
          stopPropagation: () => {},
        } as never,
      )
    })

    const [ghost] = renderer.scene.findAll(
      (node) => node.props.name === 'ghost-brick',
    )

    expect(ghost?.props.position).toEqual([1, 4.5, 2])

    await renderer.unmount()
  })

  it('recolors a clicked brick while in paint mode', async () => {
    useBuildStore.setState({
      bricks: {
        brick1: {
          id: 'brick1',
          partId: 'brick-2x4',
          color: DEFAULT_COLOR_ID,
          x: 0,
          y: 0,
          z: 0,
          rot: 0,
        },
      },
    })
    useCursorStore.setState({
      editingTool: 'paint',
      colorId: 'blue',
    })

    const renderer = await ReactThreeTestRenderer.create(<BuildScene />)

    await ReactThreeTestRenderer.act(async () => {
      await lastInstancedBricksProps?.onInstanceClick?.(
        {
          id: 'brick1',
          partId: 'brick-2x4',
          partType: 'brick',
          color: DEFAULT_COLOR_ID,
          x: 0,
          y: 0,
          z: 0,
          rot: 0,
        },
        {
          stopPropagation: () => {},
        } as never,
      )
    })

    expect(useBuildStore.getState().bricks.brick1?.color).toBe('blue')

    await renderer.unmount()
  })
})
