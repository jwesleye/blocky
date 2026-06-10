import { test, expect } from '@playwright/test'

test.describe('place-brick', () => {
  test('renders bricks placed via the store', async ({ page }) => {
    // Ensure no severe console errors
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })

    await page.goto('/')

    // Wait for the store handle to be available
    await page.waitForFunction(() => window.__blockyStore !== undefined)

    // Place two bricks
    await page.evaluate(() => {
      const store = window.__blockyStore!.getState()
      store.placeBrick({ partId: 'brick-2x4', color: 'red', x: 5, y: 0, z: 5, rot: 0 })
      store.placeBrick({ partId: 'brick-2x2', color: 'blue', x: 5, y: 3, z: 5, rot: 1 })
    })

    // Assert the store has 2 bricks
    const count = await page.evaluate(() => {
      return Object.keys(window.__blockyStore!.getState().bricks).length
    })
    expect(count).toBe(2)

    // Assert the canvas is visible
    const canvas = page.locator('canvas')
    await expect(canvas).toBeVisible()

    // Ensure no severe console errors
    expect(errors).toHaveLength(0)
  })
})
