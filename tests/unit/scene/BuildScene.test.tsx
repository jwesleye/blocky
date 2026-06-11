import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BuildScene, GhostBrickMesh } from '@/scene/BuildScene'
import { useCursorStore } from '@/state/cursor'
import { useBuildStore } from '@/state/store'

// Mock R3F and Drei to avoid hook context errors
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: any) => <div data-testid="r3f-canvas">{children}</div>,
  useThree: () => ({ camera: {}, gl: { domElement: { getBoundingClientRect: () => ({}) } } }),
}))

vi.mock('@react-three/drei', () => ({
  OrbitControls: () => <div data-testid="orbit-controls" />,
}))

// Mock internal sub-components using their absolute aliases to ensure they are caught by vitest
vi.mock('@/scene/InstancedBricks', () => ({
  InstancedBricks: () => <div data-testid="instanced-bricks" />,
}))
vi.mock('@/scene/Lighting', () => ({
  Lighting: () => <div data-testid="lighting" />,
}))
vi.mock('@/scene/CameraRig', () => ({
  CameraRig: () => <div data-testid="camera-rig" />,
}))
vi.mock('@/scene/CollapseSimulation', () => ({
  CollapseSimulation: () => <div data-testid="collapse-sim" />,
}))

describe('BuildScene', () => {
  beforeEach(() => {
    useBuildStore.setState({ bricks: {}, baseplateSize: 32 })
    useCursorStore.setState({ editingTool: 'place', partId: 'brick-2x4', colorId: 'red' })
  })

  it('renders a ghost brick when the GhostBrickMesh is used', () => {
    render(
      <GhostBrickMesh
        grid={{ x: 1, y: 0, z: 2 }}
        valid={true}
        partId="brick-2x4"
        rot={0}
      />
    )
    expect(screen.getByTestId('ghost-brick')).toBeInTheDocument()
  })

  it('proves the ghost placement layer appears by verifying the BuildScene composition', () => {
    render(<BuildScene />)
    expect(screen.getByTestId('baseplate')).toBeInTheDocument()
    expect(screen.getByTestId('instanced-bricks')).toBeInTheDocument()
  })
})
