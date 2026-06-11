import { test, expect } from '@playwright/test'

interface DevStore {
  getState: () => {
    placeBrick: (b: object) => string | null
    bricks: Record<string, unknown>
  }
}

interface DevWindow {
  __blockyStore: DevStore
  __blockyProjectToCanvas: (
    worldX: number,
    worldY: number,
    worldZ: number,
  ) => { x: number; y: number }
}

async function waitForSceneHandles(page: import('@playwright/test').Page) {
  await page.waitForFunction(
    () =>
      (window as unknown as Partial<DevWindow>).__blockyStore !== undefined &&
      (window as unknown as Partial<DevWindow>).__blockyProjectToCanvas !== undefined,
    { timeout: 10000 },
  )
}

test.describe('touch placement flow', () => {
  test.use({ hasTouch: true })

  test('tap on baseplate places a brick', async ({ page }) => {
    await page.goto('/')
    await waitForSceneHandles(page)

    const countBefore = await page.evaluate(
      () => Object.keys((window as unknown as DevWindow).__blockyStore.getState().bricks).length,
    )

    // Get canvas coordinates for a world point on the baseplate
    const pos = await page.evaluate(
      () => (window as unknown as DevWindow).__blockyProjectToCanvas(8, 0, 8),
    )

    // Use touchscreen.tap which fires pointerdown (sets ghost) then click (places)
    await page.touchscreen.tap(pos.x, pos.y)

    // Wait for the brick count to increment
    await page.waitForFunction(
      (expectedCount) =>
        Object.keys((window as unknown as DevWindow).__blockyStore.getState().bricks).length > expectedCount,
      countBefore,
      { timeout: 3000 },
    )

    const countAfter = await page.evaluate(
      () => Object.keys((window as unknown as DevWindow).__blockyStore.getState().bricks).length,
    )
    expect(countAfter).toBe(countBefore + 1)
  })

  test('drag on canvas does not place a brick', async ({ page }) => {
    await page.goto('/')
    await waitForSceneHandles(page)

    const countBefore = await page.evaluate(
      () => Object.keys((window as unknown as DevWindow).__blockyStore.getState().bricks).length,
    )

    const canvas = page.locator('canvas')
    const box = await canvas.boundingBox()
    expect(box).not.toBeNull()
    const cx = box!.x + box!.width / 2
    const cy = box!.y + box!.height / 2

    // Drag (orbit gesture) — should not place a brick
    await page.mouse.move(cx, cy)
    await page.mouse.down()
    await page.mouse.move(cx + 100, cy + 50, { steps: 10 })
    await page.mouse.up()

    await page.waitForTimeout(200)

    const countAfter = await page.evaluate(
      () => Object.keys((window as unknown as DevWindow).__blockyStore.getState().bricks).length,
    )
    expect(countAfter).toBe(countBefore)
  })
})
