import { beforeEach, describe, it, expect, vi } from 'vitest'
import ReactThreeTestRenderer from '@react-three/test-renderer'
import { CameraControls } from '@/scene/CameraControls'
import { CAMERA_DEFAULT_TARGET } from '@/scene/sceneConfig'
import { TOUCH } from 'three'
import { useCursorStore } from '@/state/cursor'

vi.mock('@react-three/drei', () => ({
  OrbitControls: (props: Record<string, unknown>) => (
    <group data-testid="orbit-controls" {...props} />
  ),
}))

describe('CameraControls', () => {
  beforeEach(() => useCursorStore.setState({ editingTool: 'place' }))
  it('renders OrbitControls with expected props', async () => {
    const renderer = await ReactThreeTestRenderer.create(<CameraControls />)
    const controls = renderer.scene.children[0]

    expect(controls.props.makeDefault).toBe(true)
    expect(controls.props.enableRotate).toBe(true)
    expect(controls.props.enablePan).toBe(true)
    expect(controls.props.enableZoom).toBe(true)
    expect(controls.props.target).toBe(CAMERA_DEFAULT_TARGET)
    expect(controls.props.touches).toEqual({
      ONE: TOUCH.ROTATE,
      TWO: TOUCH.DOLLY_PAN,
    })
    await renderer.unmount()
  })
  it('reserves selection drags while retaining pan/zoom and restores orbit in place mode', async () => {
    useCursorStore.setState({ editingTool: 'select' })
    const renderer = await ReactThreeTestRenderer.create(<CameraControls />)
    expect(renderer.scene.children[0].props.enableRotate).toBe(false)
    expect(renderer.scene.children[0].props.enablePan).toBe(true)
    expect(renderer.scene.children[0].props.enableZoom).toBe(true)
    await ReactThreeTestRenderer.act(async () => {
      useCursorStore.setState({ editingTool: 'place' })
    })
    expect(renderer.scene.children[0].props.enableRotate).toBe(true)
    await renderer.unmount()
  })
})
