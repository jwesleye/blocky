import { test, expect } from '@playwright/test'
import {
  getBrickCount,
  projectToCanvas,
  waitForDevWindow,
  type DevWindow,
} from './support/devWindow'

interface DevStore {
  getState: () => {
    placeBrick: (b: object) => string | null
    bricks: Record<string, unknown>
  }
}

type TouchPlacementWindow = Omit<DevWindow, '__blockyStore'> & {
  __blockyStore: DevStore
}

test.describe('touch placement flow', () => {
  test.use({ hasTouch: true })

  test('tap on baseplate places a brick', async ({ page }) => {
    await page.goto('/')
    await waitForDevWindow(page, {
      requireCursorStore: false,
      requireProjectToCanvas: true,
      timeout: 10000,
    })

    const countBefore = await getBrickCount(page)

    // Get canvas coordinates for a world point on the baseplate
    const pos = await projectToCanvas(page, 8, 0, 8)

    // Use touchscreen.tap which fires pointerdown (sets ghost) then click (places)
    await page.touchscreen.tap(pos.x, pos.y)

    // Wait for the brick count to increment
    await page.waitForFunction(
      (expectedCount) =>
        Object.keys(
          (window as unknown as TouchPlacementWindow).__blockyStore.getState()
            .bricks,
        ).length > expectedCount,
      countBefore,
      { timeout: 3000 },
    )

    const countAfter = await getBrickCount(page)
    expect(countAfter).toBe(countBefore + 1)
  })

  test('drag on canvas does not place a brick', async ({ page }) => {
    await page.goto('/')
    await waitForDevWindow(page, {
      requireCursorStore: false,
      requireProjectToCanvas: true,
      timeout: 10000,
    })

    const countBefore = await getBrickCount(page)

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

    const countAfter = await getBrickCount(page)
    expect(countAfter).toBe(countBefore)
  })

  test('tap on an existing brick in place mode does not delete it', async ({
    page,
  }) => {
    await page.goto('/')
    await waitForDevWindow(page, {
      requireCursorStore: false,
      requireProjectToCanvas: true,
      timeout: 10000,
    })

    const brickId = await page.evaluate(() => {
      return (window as unknown as TouchPlacementWindow).__blockyStore
        .getState()
        .placeBrick({
          partId: 'brick-2x4',
          color: 'red',
          x: 4,
          y: 0,
          z: 4,
          rot: 0,
        })
    })
    expect(brickId).toBeTruthy()

    const countBefore = await getBrickCount(page)

    const brickPos = await projectToCanvas(page, 5, 1.5, 6)
    await page.touchscreen.tap(brickPos.x, brickPos.y)
    await page.waitForTimeout(200)

    const result = await page.evaluate((id) => {
      const bricks = (
        window as unknown as TouchPlacementWindow
      ).__blockyStore.getState().bricks
      return {
        count: Object.keys(bricks).length,
        exists: (id as string) in bricks,
      }
    }, brickId)

    expect(result.exists).toBe(true)
    expect(result.count).toBe(countBefore)
  })
})
