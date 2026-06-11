import { test, expect } from '@playwright/test'
import { touchPointerDrag } from './touch-gestures'

test.describe('touch camera controls', () => {
  test.use({ hasTouch: true })

  test('drag on canvas moves the camera', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('canvas')).toBeVisible()

    // Wait for the dev camera handle to be available
    await page.waitForFunction(
      () =>
        (window as unknown as { __blockyCamera?: unknown }).__blockyCamera !==
        undefined,
      { timeout: 10000 },
    )

    const before = await page.evaluate(() => {
      const cam = (
        window as unknown as {
          __blockyCamera: { position: { x: number; y: number; z: number } }
        }
      ).__blockyCamera
      return { x: cam.position.x, y: cam.position.y, z: cam.position.z }
    })

    const canvas = page.locator('canvas')
    const box = await canvas.boundingBox()
    expect(box).not.toBeNull()
    const cx = box!.x + box!.width / 2
    const cy = box!.y + box!.height / 2

    await touchPointerDrag(page, { x: cx, y: cy }, { x: cx + 120, y: cy + 60 })

    // Allow the camera update to propagate
    await page.waitForTimeout(150)

    const after = await page.evaluate(() => {
      const cam = (
        window as unknown as {
          __blockyCamera: { position: { x: number; y: number; z: number } }
        }
      ).__blockyCamera
      return { x: cam.position.x, y: cam.position.y, z: cam.position.z }
    })

    const moved =
      Math.abs(after.x - before.x) > 0.01 ||
      Math.abs(after.y - before.y) > 0.01 ||
      Math.abs(after.z - before.z) > 0.01

    expect(moved).toBe(true)
  })
})
