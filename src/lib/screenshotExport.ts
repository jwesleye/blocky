export const SCREENSHOT_FILE_NAME = 'blocky-build-screenshot.png'
export const SCREENSHOT_MIME_TYPE = 'image/png'

export async function downloadScreenshot(blob: Blob): Promise<void> {
  if (blob.size === 0) {
    throw new Error('Screenshot capture returned an empty blob')
  }
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = SCREENSHOT_FILE_NAME
  anchor.click()
  URL.revokeObjectURL(url)
}
