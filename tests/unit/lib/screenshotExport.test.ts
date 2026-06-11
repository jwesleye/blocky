import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'

import {
  SCREENSHOT_FILE_NAME,
  SCREENSHOT_MIME_TYPE,
  downloadScreenshot,
} from '@/lib/screenshotExport'

describe('screenshotExport constants', () => {
  it('uses a deterministic file name', () => {
    expect(SCREENSHOT_FILE_NAME).toBe('blocky-build-screenshot.png')
  })

  it('uses image/png MIME type', () => {
    expect(SCREENSHOT_MIME_TYPE).toBe('image/png')
  })
})

describe('downloadScreenshot', () => {
  const FAKE_URL = 'blob:http://localhost/test-url'

  let createObjectURL: ReturnType<typeof vi.fn>
  let revokeObjectURL: ReturnType<typeof vi.fn>
  let mockAnchor: {
    href: string
    download: string
    click: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    createObjectURL = vi.fn().mockReturnValue(FAKE_URL)
    revokeObjectURL = vi.fn()
    mockAnchor = { href: '', download: '', click: vi.fn() }

    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'a') return mockAnchor as unknown as HTMLAnchorElement
      return document.createElement.call(document, tag)
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('throws for an empty blob', async () => {
    const emptyBlob = new Blob([], { type: 'image/png' })
    await expect(downloadScreenshot(emptyBlob)).rejects.toThrow()
  })

  it('creates an object URL for a non-empty blob', async () => {
    const blob = new Blob(['fake-png-data'], { type: 'image/png' })
    await downloadScreenshot(blob)
    expect(createObjectURL).toHaveBeenCalledWith(blob)
  })

  it('sets href and download on the anchor and triggers click', async () => {
    const blob = new Blob(['fake-png-data'], { type: 'image/png' })
    await downloadScreenshot(blob)
    expect(mockAnchor.href).toBe(FAKE_URL)
    expect(mockAnchor.download).toBe(SCREENSHOT_FILE_NAME)
    expect(mockAnchor.click).toHaveBeenCalledOnce()
  })

  it('revokes the object URL after triggering the download', async () => {
    const blob = new Blob(['fake-png-data'], { type: 'image/png' })
    await downloadScreenshot(blob)
    expect(revokeObjectURL).toHaveBeenCalledWith(FAKE_URL)
  })
})
