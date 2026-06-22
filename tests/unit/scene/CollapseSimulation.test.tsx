import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import ReactThreeTestRenderer from '@react-three/test-renderer'

// Mock rapier physics to return pure react elements instead of complicated Context providers which may not render easily
vi.mock('@react-three/rapier', () => {
  return {
    Physics: ({ children }: any) => <group name="physics">{children}</group>,
    RigidBody: (props: any) => <group name="rigid-body" {...props}>{props.children}</group>,
    CuboidCollider: (props: any) => <group name="collider" {...props} />
  }
})

import { CollapseSimulation } from '@/scene/CollapseSimulation'
import { createCollapseTransaction } from '@/domain/physics'

const mockTransaction = createCollapseTransaction({
  allBricks: [],
  collapsingBodies: [
    {
      id: 'body-1',
      partId: 'brick-1x1',
      color: '#ff0000',
      position: [0, 5, 0],
      size: [1, 1, 1],
    },
  ],
})

describe('CollapseSimulation', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders fixed ground by default', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <CollapseSimulation transaction={mockTransaction} />
    )

    const ground = renderer.scene.findAll((node) => node.props.type === 'fixed')
    expect(ground.length).toBeGreaterThan(0)
    expect(ground[0]?.props.position).toEqual([0, -0.5, 0])

    await renderer.unmount()
  })

  it('omits ground when ground={false}', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <CollapseSimulation transaction={mockTransaction} ground={false} />
    )

    const ground = renderer.scene.findAll((node) => node.props.type === 'fixed')
    expect(ground.length).toBe(0)

    await renderer.unmount()
  })

  it('renders dynamic bodies for collapsing items', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <CollapseSimulation transaction={mockTransaction} />
    )

    const dynamicBodies = renderer.scene.findAll(
      (node) => node.props.type === 'dynamic'
    )
    expect(dynamicBodies.length).toBe(1)
    expect(dynamicBodies[0]?.props.position).toEqual([0, 5, 0])

    await renderer.unmount()
  })

  it('advances the transaction automatically on tick intervals', async () => {
    const onComplete = vi.fn()
    const renderer = await ReactThreeTestRenderer.create(
      <CollapseSimulation
        transaction={mockTransaction}
        onComplete={onComplete}
        tickMs={50}
      />
    )

    // Not settled yet
    expect(onComplete).not.toHaveBeenCalled()

    await ReactThreeTestRenderer.act(async () => {
      vi.advanceTimersByTime(1000)
    })

    // Nothing settled
    expect(onComplete).not.toHaveBeenCalled()

    await renderer.unmount()
  })

  it('handles settling and completing the transaction via onSleep', async () => {
    const onComplete = vi.fn()
    const renderer = await ReactThreeTestRenderer.create(
      <CollapseSimulation
        transaction={mockTransaction}
        onComplete={onComplete}
        tickMs={50}
      />
    )

    const [dynamicBody] = renderer.scene.findAll(
      (node) => node.props.type === 'dynamic'
    )

    expect(dynamicBody).toBeDefined()

    await ReactThreeTestRenderer.act(async () => {
      dynamicBody?.props.onSleep?.()
    })

    // settle delay + fade out
    await ReactThreeTestRenderer.act(async () => {
      vi.advanceTimersByTime(2000)
    })

    expect(onComplete).toHaveBeenCalled()

    await renderer.unmount()
  })

  it('updates the simulation if transaction prop changes', async () => {
    let renderer: any
    await ReactThreeTestRenderer.act(async () => {
      renderer = await ReactThreeTestRenderer.create(
        <CollapseSimulation transaction={mockTransaction} />
      )
    })

    const [dynamicBody1] = renderer.scene.findAll(
      (node: any) => node.props.type === 'dynamic'
    )
    expect(dynamicBody1?.props.position).toEqual([0, 5, 0])

    const updatedTransaction = createCollapseTransaction({
      allBricks: [],
      collapsingBodies: [
        {
          id: 'body-2',
          partId: 'brick-2x2',
          color: '#00ff00',
          position: [10, 10, 10],
          size: [2, 2, 2],
        },
      ],
    })

    await ReactThreeTestRenderer.act(async () => {
      renderer.update(
        <CollapseSimulation transaction={updatedTransaction} />
      )
    })

    const [dynamicBody2] = renderer.scene.findAll(
      (node: any) => node.props.type === 'dynamic'
    )
    expect(dynamicBody2?.props.position).toEqual([10, 10, 10])

    await renderer.unmount()
  })
})
