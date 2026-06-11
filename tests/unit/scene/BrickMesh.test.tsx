import ReactThreeTestRenderer from '@react-three/test-renderer'
import { describe, expect, it } from 'vitest'

import { BrickMesh } from '@/scene/BrickMesh'
import type { PlacedBrick } from '@/domain/model/types'

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

    // Studded geometry is a BufferGeometry (merged), not a named BoxGeometry
    const geomNodes = renderer.scene.findAll(
      (node) => node.props.object !== undefined,
    )
    expect(geomNodes.length).toBeGreaterThan(0)
    const geom = geomNodes[0]?.props.object
    expect(geom?.type).not.toBe('BoxGeometry')

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
      <BrickMesh brick={makeBrick({ partId: 'brick-2x4', x: 2, y: 1, z: 3, rot: 0 })} />,
    )

    const [mesh] = renderer.scene.findAll((node) => node.type === 'Mesh')
    expect(mesh).toBeDefined()
    // brick-2x4: width=2, length=4, height=3 → center at (2+1, 1+1.5, 3+2)
    expect(mesh?.props.position).toEqual([3, 2.5, 5])

    await renderer.unmount()
  })

  it('swaps width and length for rot=1 (90° rotation)', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <BrickMesh brick={makeBrick({ partId: 'brick-2x4', x: 0, y: 0, z: 0, rot: 1 })} />,
    )

    const [mesh] = renderer.scene.findAll((node) => node.type === 'Mesh')
    expect(mesh).toBeDefined()
    // rot=1: w=length=4, l=width=2 → center at (0+2, 0+1.5, 0+1)
    expect(mesh?.props.position).toEqual([2, 1.5, 1])

    await renderer.unmount()
  })

  it('applies half-stud offset when offset is set', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <BrickMesh
        brick={makeBrick({ partId: 'brick-1x1', x: 1, y: 0, z: 1, rot: 0, offset: { x: 1, z: 1 } })}
      />,
    )

    const [mesh] = renderer.scene.findAll((node) => node.type === 'Mesh')
    expect(mesh).toBeDefined()
    // offsetX = 0.5, offsetZ = 0.5 → posX = 1+0.5+0.5=2, posY=1.5, posZ=1+0.5+0.5=2
    expect(mesh?.props.position).toEqual([2, 1.5, 2])

    await renderer.unmount()
  })

  it('returns null for an unknown partId', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <BrickMesh brick={makeBrick({ partId: 'unknown-part' })} />,
    )

    expect(renderer.scene.findAll((node) => node.type === 'Mesh')).toHaveLength(0)

    await renderer.unmount()
  })
})
