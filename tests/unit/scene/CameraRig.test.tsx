import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, act } from '@testing-library/react'
import { CameraRig } from '@/scene/CameraRig'
import { useCameraStore } from '@/state/cameraStore'
import * as r3f from '@react-three/fiber'
import { CAMERA_DEFAULT_POSITION, CAMERA_DEFAULT_TARGET } from '@/scene/sceneConfig'

vi.mock('@react-three/fiber', () => ({
  useThree: vi.fn(),
}))

describe('CameraRig', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useCameraStore.setState({ resetNonce: 0 })
  })

  it('updates camera and controls on mount', () => {
    const mockCamera = {
      position: { set: vi.fn() },
      lookAt: vi.fn(),
      updateProjectionMatrix: vi.fn(),
    }
    const mockControls = {
      target: { set: vi.fn() },
      update: vi.fn(),
    }

    vi.mocked(r3f.useThree).mockReturnValue({
      camera: mockCamera,
      controls: mockControls,
    } as unknown as r3f.RootState)

    render(<CameraRig />)

    expect(mockCamera.position.set).toHaveBeenCalledWith(...CAMERA_DEFAULT_POSITION)
    expect(mockControls.target.set).toHaveBeenCalledWith(...CAMERA_DEFAULT_TARGET)
    expect(mockControls.update).toHaveBeenCalled()
    expect(mockCamera.lookAt).toHaveBeenCalledWith(...CAMERA_DEFAULT_TARGET)
    expect(mockCamera.updateProjectionMatrix).toHaveBeenCalled()
  })

  it('updates camera on resetNonce change', () => {
    const mockCamera = {
      position: { set: vi.fn() },
      lookAt: vi.fn(),
      updateProjectionMatrix: vi.fn(),
    }

    vi.mocked(r3f.useThree).mockReturnValue({
      camera: mockCamera,
      controls: null,
    } as unknown as r3f.RootState)

    render(<CameraRig />)

    mockCamera.position.set.mockClear()
    mockCamera.lookAt.mockClear()
    mockCamera.updateProjectionMatrix.mockClear()

    act(() => {
      useCameraStore.setState({ resetNonce: 1 })
    })

    expect(mockCamera.position.set).toHaveBeenCalledWith(...CAMERA_DEFAULT_POSITION)
    expect(mockCamera.lookAt).toHaveBeenCalledWith(...CAMERA_DEFAULT_TARGET)
    expect(mockCamera.updateProjectionMatrix).toHaveBeenCalled()
  })
})
