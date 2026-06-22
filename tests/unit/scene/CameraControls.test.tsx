import { describe, it, expect, vi } from 'vitest'
import ReactThreeTestRenderer from '@react-three/test-renderer'
import { CameraControls } from '@/scene/CameraControls'
import { CAMERA_DEFAULT_TARGET } from '@/scene/sceneConfig'
import { TOUCH } from 'three'

vi.mock('@react-three/drei', () => ({
  OrbitControls: (props: any) => <group data-testid="orbit-controls" {...props} />
}))

describe('CameraControls', () => {
  it('renders OrbitControls with expected props', async () => {
    const renderer = await ReactThreeTestRenderer.create(<CameraControls />)
    const controls = renderer.scene.children[0]

    expect(controls.props.makeDefault).toBe(true)
    expect(controls.props.enableRotate).toBe(true)
    expect(controls.props.enablePan).toBe(true)
    expect(controls.props.enableZoom).toBe(true)
    expect(controls.props.target).toBe(CAMERA_DEFAULT_TARGET)
    expect(controls.props.touches).toEqual({ ONE: TOUCH.ROTATE, TWO: TOUCH.DOLLY_PAN })
  })
})
