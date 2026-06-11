import { test, expect } from '@playwright/test'

interface DevStore {
  getState: () => {
    placeBrick: (b: object) => string | null
    bricks: Record<string, unknown>
  }
}

interface DevCursorStore {
  getState: () => {
    rot: number
    hoveredBrickId: string | null
  }
}

interface DevWindow {
  __blockyStore: DevStore
  __blockyCursorStore: DevCursorStore
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
      (window as unknown as Partial<DevWindow>).__blockyCursorStore !== undefined &&
      (window as unknown as Partial<DevWindow>).__blockyProjectToCanvas !== undefined,
    { timeout: 10000 },
  )
}

test.describe('touch edit controls', () => {
  test.use({ hasTouch: true })

  test('tap rotate button advances cursor rotation', async ({ page }) => {
    await page.goto('/')
    await waitForSceneHandles(page)

    const rotBefore = await page.evaluate(
      () => (window as unknown as DevWindow).__blockyCursorStore.getState().rot,
    )

    await page.locator('[data-testid="touch-rotate"]').tap()

    const rotAfter = await page.evaluate(
      () => (window as unknown as DevWindow).__blockyCursorStore.getState().rot,
    )

    expect(rotAfter).toBe((rotBefore + 1) % 4)
  })

  test('tap delete button removes the hovered brick', async ({ page }) => {
    await page.goto('/')
    await waitForSceneHandles(page)

    // Place a brick via store
    const brickId = await page.evaluate(() => {
      return (window as unknown as DevWindow).__blockyStore.getState().placeBrick({
        partId: 'brick-2x4',
        color: 'red',
        x: 4,
        y: 0,
        z: 4,
        rot: 0,
      })
    })
    expect(brickId).toBeTruthy()

    // Move pointer over the brick to set hoveredBrickId
    const brickPos = await page.evaluate(
      () => (window as unknown as DevWindow).__blockyProjectToCanvas(5, 1.5, 6),
    )
    await page.mouse.move(brickPos.x, brickPos.y)

    // Wait for hoveredBrickId to be set in the cursor store
    await page.waitForFunction(
      () => (window as unknown as DevWindow).__blockyCursorStore.getState().hoveredBrickId !== null,
      { timeout: 3000 },
    )

    // Tap the delete button
    await page.locator('[data-testid="touch-delete"]').tap()

    // Assert the brick was removed
    await page.waitForFunction(
      (id) =>
        !(id as string in (window as unknown as DevWindow).__blockyStore.getState().bricks),
      brickId,
      { timeout: 3000 },
    )

    const brickExists = await page.evaluate(
      (id) => (id as string) in (window as unknown as DevWindow).__blockyStore.getState().bricks,
      brickId,
    )
    expect(brickExists).toBe(false)
  })
})
