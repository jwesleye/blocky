import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

test('Export Screenshot downloads a non-empty PNG whose dimensions match the canvas drawing buffer', async ({
  page,
}) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })

  const canvas = page.locator('canvas')
  await expect(canvas).toBeVisible()

  await page.getByRole('button', { name: 'Add Sample Brick' }).click()

  const exportBtn = page.getByRole('button', { name: 'Export Screenshot' })
  await expect(exportBtn).toBeEnabled()

  const canvasDimensions = await page.evaluate(() => {
    const c = document.querySelector('canvas') as HTMLCanvasElement
    return { width: c.width, height: c.height }
  })

  const downloadPromise = page.waitForEvent('download')
  await exportBtn.click()
  const download = await downloadPromise

  expect(download.suggestedFilename()).toBe('blocky-build-screenshot.png')

  const tmpPath = join(tmpdir(), `blocky-screenshot-test-${Date.now()}.png`)
  await download.saveAs(tmpPath)
  const buffer = readFileSync(tmpPath)

  expect(buffer.length).toBeGreaterThan(0)

  expect(buffer[0]).toBe(0x89)
  expect(buffer[1]).toBe(0x50)
  expect(buffer[2]).toBe(0x4e)
  expect(buffer[3]).toBe(0x47)

  const pngWidth = buffer.readUInt32BE(16)
  const pngHeight = buffer.readUInt32BE(20)

  expect(pngWidth).toBe(canvasDimensions.width)
  expect(pngHeight).toBe(canvasDimensions.height)
})
