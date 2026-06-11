import ReactThreeTestRenderer from '@react-three/test-renderer'
import { describe, expect, it } from 'vitest'

import type { PlacedBrick } from '@/domain/model/types'
import { BrickMesh } from '@/scene/BrickMesh'

function makeBrick(overrides: Partial<PlacedBrick> = {}): PlacedBrick {
  return {
    id: 'test-brick',
    partId: 'brick-1x1',
    color: 'red',
    x: 0,
    y: 0,
    z: 0,
    rot: 0,
    ...overrides,
  }
}

describe('BrickMesh', () => {
  it('uses the geometry factory for brick-1x1 (studded, not a plain box)', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <BrickMesh brick={makeBrick({ partId: 'brick-1x1' })} />,
    )

    const geomNodes = renderer.scene.findAll(
      (node) => node.props.object !== undefined,
    )
    expect(geomNodes.length).toBeGreaterThan(0)
    expect(geomNodes[0]?.props.object?.type).not.toBe('BoxGeometry')

    await renderer.unmount()
  })

  it('uses cylinder geometry for round-brick-1x1', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <BrickMesh brick={makeBrick({ partId: 'round-brick-1x1' })} />,
    )

    expect(
      renderer.scene.findAll(
        (node) => node.props.object?.type === 'CylinderGeometry',
      ),
    ).toHaveLength(1)

    await renderer.unmount()
  })

  it('uses cone geometry for cone-1x1', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <BrickMesh brick={makeBrick({ partId: 'cone-1x1' })} />,
    )

    expect(
      renderer.scene.findAll(
        (node) => node.props.object?.type === 'ConeGeometry',
      ),
    ).toHaveLength(1)

    await renderer.unmount()
  })

  it('uses tile geometry (plain box) for tile-1x1', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <BrickMesh brick={makeBrick({ partId: 'tile-1x1' })} />,
    )

    expect(
      renderer.scene.findAll(
        (node) => node.props.object?.type === 'BoxGeometry',
      ),
    ).toHaveLength(1)

    await renderer.unmount()
  })

  it('positions the mesh at brick center with rot=0', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <BrickMesh
        brick={makeBrick({ partId: 'brick-2x4', x: 2, y: 1, z: 3, rot: 0 })}
      />,
    )

    const [mesh] = renderer.scene.findAll((node) => node.type === 'Mesh')
    expect(mesh?.props.position).toEqual([3, 2.5, 5])
    expect(mesh?.props.rotation).toEqual([0, 0, 0])

    await renderer.unmount()
  })

  it('swaps footprint position and rotates the mesh for rot=1', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <BrickMesh
        brick={makeBrick({ partId: 'brick-2x4', x: 0, y: 0, z: 0, rot: 1 })}
      />,
    )

    const [mesh] = renderer.scene.findAll((node) => node.type === 'Mesh')
    expect(mesh?.props.position).toEqual([2, 1.5, 1])
    expect(mesh?.props.rotation).toEqual([0, Math.PI / 2, 0])

    await renderer.unmount()
  })

  it('keeps slope geometry in its base dimensions and rotates the preview mesh', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <BrickMesh
        brick={makeBrick({ partId: 'slope-2x1', x: 0, y: 0, z: 0, rot: 1 })}
      />,
    )

    const [mesh] = renderer.scene.findAll((node) => node.type === 'Mesh')
    const [geometryNode] = renderer.scene.findAll(
      (node) => node.props.object !== undefined,
    )

    geometryNode?.props.object.computeBoundingBox()

    expect(mesh?.props.position).toEqual([0.5, 1.5, 1])
    expect(mesh?.props.rotation).toEqual([0, Math.PI / 2, 0])
    expect(geometryNode?.props.object.boundingBox?.min.x).toBe(-1)
    expect(geometryNode?.props.object.boundingBox?.max.x).toBe(1)
    expect(geometryNode?.props.object.boundingBox?.min.z).toBe(-0.5)
    expect(geometryNode?.props.object.boundingBox?.max.z).toBe(0.5)

    await renderer.unmount()
  })

  it('applies half-stud offset when offset is set', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <BrickMesh
        brick={makeBrick({
          partId: 'brick-1x1',
          x: 1,
          y: 0,
          z: 1,
          rot: 0,
          offset: { x: 1, z: 1 },
        })}
      />,
    )

    const [mesh] = renderer.scene.findAll((node) => node.type === 'Mesh')
    expect(mesh?.props.position).toEqual([2, 1.5, 2])

    await renderer.unmount()
  })

  it('applies non-zero X/Z rotation for a mounted brick (mount: px)', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <BrickMesh brick={makeBrick({ mount: 'px' })} />,
    )

    const [mesh] = renderer.scene.findAll((node) => node.type === 'Mesh')
    const rotation = mesh?.props.rotation as [number, number, number]
    expect(rotation[2]).not.toBe(0)

    await renderer.unmount()
  })

  it('keeps rotation [0, 0, 0] for a brick with no mount and rot 0', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <BrickMesh brick={makeBrick()} />,
    )

    const [mesh] = renderer.scene.findAll((node) => node.type === 'Mesh')
    expect(mesh?.props.rotation).toEqual([0, 0, 0])

    await renderer.unmount()
  })

  it('returns null for an unknown partId', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <BrickMesh brick={makeBrick({ partId: 'unknown-part' })} />,
    )

    expect(renderer.scene.findAll((node) => node.type === 'Mesh')).toHaveLength(
      0,
    )

    await renderer.unmount()
  })
})
