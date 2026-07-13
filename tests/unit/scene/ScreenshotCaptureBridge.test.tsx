import { render } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ScreenshotCaptureBridge } from '@/scene/ScreenshotCaptureBridge'
import { SCREENSHOT_MIME_TYPE } from '@/lib/screenshotExport'

const mockRender = vi.fn()
const mockToBlob = vi.fn()

const mockGl = {
  render: mockRender,
  domElement: {
    toBlob: mockToBlob,
  },
}
const mockScene = {}
const mockCamera = {}

vi.mock('@react-three/fiber', () => ({
  useThree: () => ({
    gl: mockGl,
    scene: mockScene,
    camera: mockCamera,
  }),
}))

describe('ScreenshotCaptureBridge', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls onReady with a capture function', () => {
    const onReady = vi.fn()
    render(<ScreenshotCaptureBridge onReady={onReady} />)
    expect(onReady).toHaveBeenCalledWith(expect.any(Function))
  })

  it('capture function calls gl.render and resolves with a Blob', async () => {
    const onReady = vi.fn()
    render(<ScreenshotCaptureBridge onReady={onReady} />)

    const capture = onReady.mock.calls[0][0]

    const mockBlob = { size: 1024 } as Blob
    mockToBlob.mockImplementationOnce((cb) => {
      cb(mockBlob)
    })

    const result = await capture()

    expect(mockRender).toHaveBeenCalledWith(mockScene, mockCamera)
    expect(mockToBlob).toHaveBeenCalledWith(
      expect.any(Function),
      SCREENSHOT_MIME_TYPE,
    )
    expect(result).toBe(mockBlob)
  })

  it('capture function rejects if blob is null', async () => {
    const onReady = vi.fn()
    render(<ScreenshotCaptureBridge onReady={onReady} />)

    const capture = onReady.mock.calls[0][0]

    mockToBlob.mockImplementationOnce((cb) => {
      cb(null)
    })

    await expect(capture()).rejects.toThrow(
      'Screenshot capture returned an empty blob',
    )
  })

  it('capture function rejects if blob size is 0', async () => {
    const onReady = vi.fn()
    render(<ScreenshotCaptureBridge onReady={onReady} />)

    const capture = onReady.mock.calls[0][0]

    const mockBlob = { size: 0 } as Blob
    mockToBlob.mockImplementationOnce((cb) => {
      cb(mockBlob)
    })

    await expect(capture()).rejects.toThrow(
      'Screenshot capture returned an empty blob',
    )
  })
})
