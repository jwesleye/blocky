import { render } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { useThree } from '@react-three/fiber'

import { ScreenshotCaptureBridge } from '@/scene/ScreenshotCaptureBridge'
import { SCREENSHOT_MIME_TYPE } from '@/lib/screenshotExport'

vi.mock('@react-three/fiber', () => ({
  useThree: vi.fn(),
}))

describe('ScreenshotCaptureBridge', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls onReady with a capture function', () => {
    const mockGl = {
      render: vi.fn(),
      domElement: {
        toBlob: vi.fn(),
      },
    }
    const mockScene = {}
    const mockCamera = {}

    vi.mocked(useThree).mockReturnValue({
      gl: mockGl,
      scene: mockScene,
      camera: mockCamera,
    } as any)

    const onReady = vi.fn()
    render(<ScreenshotCaptureBridge onReady={onReady} />)

    expect(onReady).toHaveBeenCalledTimes(1)
    expect(typeof onReady.mock.calls[0][0]).toBe('function')
  })

  it('capture function calls gl.render and toBlob, returning a Blob', async () => {
    const mockBlob = new Blob(['test'])
    const mockGl = {
      render: vi.fn(),
      domElement: {
        toBlob: vi.fn((cb, mimeType) => {
          cb(mockBlob)
        }),
      },
    }
    const mockScene = {}
    const mockCamera = {}

    vi.mocked(useThree).mockReturnValue({
      gl: mockGl,
      scene: mockScene,
      camera: mockCamera,
    } as any)

    const onReady = vi.fn()
    render(<ScreenshotCaptureBridge onReady={onReady} />)

    const capture = onReady.mock.calls[0][0]

    const promise = capture()

    expect(mockGl.render).toHaveBeenCalledWith(mockScene, mockCamera)
    expect(mockGl.domElement.toBlob).toHaveBeenCalledWith(expect.any(Function), SCREENSHOT_MIME_TYPE)

    const result = await promise
    expect(result).toBe(mockBlob)
  })

  it('rejects if blob is null', async () => {
    const mockGl = {
      render: vi.fn(),
      domElement: {
        toBlob: vi.fn((cb, mimeType) => {
          cb(null)
        }),
      },
    }
    const mockScene = {}
    const mockCamera = {}

    vi.mocked(useThree).mockReturnValue({
      gl: mockGl,
      scene: mockScene,
      camera: mockCamera,
    } as any)

    const onReady = vi.fn()
    render(<ScreenshotCaptureBridge onReady={onReady} />)

    const capture = onReady.mock.calls[0][0]

    await expect(capture()).rejects.toThrow('Screenshot capture returned an empty blob')
  })

  it('rejects if blob size is 0', async () => {
    const mockBlob = { size: 0 }
    const mockGl = {
      render: vi.fn(),
      domElement: {
        toBlob: vi.fn((cb, mimeType) => {
          cb(mockBlob)
        }),
      },
    }
    const mockScene = {}
    const mockCamera = {}

    vi.mocked(useThree).mockReturnValue({
      gl: mockGl,
      scene: mockScene,
      camera: mockCamera,
    } as any)

    const onReady = vi.fn()
    render(<ScreenshotCaptureBridge onReady={onReady} />)

    const capture = onReady.mock.calls[0][0]

    await expect(capture()).rejects.toThrow('Screenshot capture returned an empty blob')
  })
})
