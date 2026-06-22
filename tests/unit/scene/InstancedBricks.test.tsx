import ReactThreeTestRenderer from '@react-three/test-renderer'
import { describe, expect, it, vi } from 'vitest'

// We must mock `@react-three/drei`'s Instances and Instance components
// to avoid deep nested errors inside r3f testing without a real DOM/canvas.
vi.mock('@react-three/drei', () => ({
  Instances: (props: any) => <group data-testid="Instances" limit={props.limit} {...props} />,
  Instance: (props: any) => <group data-testid="Instance" {...props} />
}))

import { InstancedBricks } from '@/scene/InstancedBricks'
import type { RenderBrick } from '@/scene/instancing'

// Mock the parts geometry to avoid WebGL context issues and simplify test output
vi.mock('@/scene/parts/geometries', () => ({
  getPartGeometry: vi.fn((partId, dims) => ({
    isBufferGeometry: true,
    partId,
    ...dims,
  })),
}))

const mockGetDims = vi.fn().mockImplementation((partId: string) => {
  if (partId === 'brick-1x1') return { w: 1, d: 1, h: 1 }
  if (partId === 'brick-2x4') return { w: 2, d: 4, h: 3 }
  return { w: 1, d: 1, h: 1 }
})

const mockGetColor = vi.fn().mockImplementation((color: string) => {
  if (color === 'red') return '#ff0000'
  if (color === 'blue') return '#0000ff'
  return color
})

describe('InstancedBricks', () => {
  const sampleBricks: RenderBrick[] = [
    {
      id: 'brick-1',
      partId: 'brick-2x4',
      partType: 'brick',
      color: 'red',
      x: 0,
      y: 0,
      z: 0,
      rot: 0,
    },
    {
      id: 'brick-2',
      partId: 'brick-2x4',
      partType: 'brick',
      color: 'red',
      x: 2,
      y: 0,
      z: 0,
      rot: 0,
    },
    {
      id: 'brick-3',
      partId: 'brick-1x1',
      partType: 'brick',
      color: 'blue',
      x: 0,
      y: 0,
      z: 4,
      rot: 0,
    },
  ]

  it('renders nothing when there are no bricks', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <InstancedBricks
        bricks={[]}
        getDims={mockGetDims}
        getColor={mockGetColor}
      />,
    )

    expect(renderer.scene.children).toHaveLength(0)
  })

  it('groups bricks into Instances by part and color', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <InstancedBricks
        bricks={sampleBricks}
        getDims={mockGetDims}
        getColor={mockGetColor}
      />,
    )

    const instancesGroups = renderer.scene.findAll((node) => node.props['data-testid'] === 'Instances')
    expect(instancesGroups).toHaveLength(2)

    const group1 = instancesGroups[0]
    const group2 = instancesGroups[1]

    // Sort them so tests aren't flaky
    const [redGroup, blueGroup] = group1.props.limit === 2 ? [group1, group2] : [group2, group1]

    expect(redGroup.props.limit).toBe(2)
    const redInstances = redGroup.findAll((node) => node.props['data-testid'] === 'Instance')
    expect(redInstances).toHaveLength(2)
    const redMaterial = redGroup.findAll((node) => node.type === 'MeshStandardMaterial')[0]
    expect(redMaterial.props.color).toBe('#ff0000')
    const redGeometry = redGroup.findAll((node) => node.props.attach === 'geometry')[0]
    expect(redGeometry.props.object.partId).toBe('brick-2x4')

    expect(blueGroup.props.limit).toBe(1)
    const blueInstances = blueGroup.findAll((node) => node.props['data-testid'] === 'Instance')
    expect(blueInstances).toHaveLength(1)
    const blueMaterial = blueGroup.findAll((node) => node.type === 'MeshStandardMaterial')[0]
    expect(blueMaterial.props.color).toBe('#0000ff')
    const blueGeometry = blueGroup.findAll((node) => node.props.attach === 'geometry')[0]
    expect(blueGeometry.props.object.partId).toBe('brick-1x1')
  })

  it('forwards event handlers to instances with the correct brick reference', async () => {
    const onInstanceClick = vi.fn()
    const onInstancePointerMove = vi.fn()
    const onInstancePointerDown = vi.fn()
    const onInstanceContextMenu = vi.fn()

    const renderer = await ReactThreeTestRenderer.create(
      <InstancedBricks
        bricks={sampleBricks}
        getDims={mockGetDims}
        getColor={mockGetColor}
        onInstanceClick={onInstanceClick}
        onInstancePointerMove={onInstancePointerMove}
        onInstancePointerDown={onInstancePointerDown}
        onInstanceContextMenu={onInstanceContextMenu}
      />,
    )

    const instancesGroups = renderer.scene.findAll((node) => node.props['data-testid'] === 'Instances')
    // Get the instance corresponding to sampleBricks[0] (which is brick-1, 2x4, red)
    let instance: any
    let expectedBrick: any

    for (const group of instancesGroups) {
      if (group.props.limit === 2) {
        instance = group.findAll((node) => node.props['data-testid'] === 'Instance')[0]
        expectedBrick = sampleBricks[0]
        break
      }
    }

    // Simulate events
    const mockEvent = {} as any

    instance.props.onClick(mockEvent)
    instance.props.onPointerMove(mockEvent)
    instance.props.onPointerDown(mockEvent)
    instance.props.onContextMenu(mockEvent)

    // The handler should receive the correct original RenderBrick object
    expect(onInstanceClick).toHaveBeenCalledWith(expectedBrick, mockEvent)
    expect(onInstancePointerMove).toHaveBeenCalledWith(expectedBrick, mockEvent)
    expect(onInstancePointerDown).toHaveBeenCalledWith(expectedBrick, mockEvent)
    expect(onInstanceContextMenu).toHaveBeenCalledWith(expectedBrick, mockEvent)
  })

  it('provides geometry builder with base grid units instead of scaled scene units', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <InstancedBricks
        bricks={[sampleBricks[0]]}
        getDims={mockGetDims}
        getColor={mockGetColor}
      />,
    )

    const instancesGroup = renderer.scene.findAll((node) => node.props['data-testid'] === 'Instances')[0]
    // Get the primitive element that has the geometry attached
    const geometry = instancesGroup.findAll((node) => node.props.attach === 'geometry')[0]

    // getDims returns { w: 2, d: 4, h: 3 } for 'brick-2x4'
    // groupBricksForInstancing scales this to { w: 2 * STUD_SCENE_UNIT, h: 3 * PLATE_SCENE_UNIT, d: 4 * STUD_SCENE_UNIT }
    // InstancedBricks un-scales it back to { w: 2, h: 3, d: 4 } before passing it to getPartGeometry
    expect(geometry.props.object.w).toBeCloseTo(2)
    expect(geometry.props.object.h).toBeCloseTo(3)
    expect(geometry.props.object.d).toBeCloseTo(4)
    expect(geometry.props.object.hinge).toBeUndefined()
  })
})
