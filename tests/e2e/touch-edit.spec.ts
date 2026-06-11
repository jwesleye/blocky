import { test, expect, type Page } from '@playwright/test'
import {
  projectToCanvas,
  waitForDevWindow,
  type DevWindow,
} from './support/devWindow'
import { touchPointerTap } from './touch-gestures'

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

type TouchEditWindow = Omit<
  DevWindow,
  '__blockyStore' | '__blockyCursorStore'
> & {
  __blockyStore: DevStore
  __blockyCursorStore: DevCursorStore
}

async function tapUntilBrickHovered(
  page: Page,
  point: { x: number; y: number },
) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await touchPointerTap(page, point)

    const hoveredBrickId = await page.evaluate(
      () =>
        (window as unknown as TouchEditWindow).__blockyCursorStore.getState()
          .hoveredBrickId,
    )
    if (hoveredBrickId !== null) return

    await page.waitForTimeout(100)
  }

  await page.waitForFunction(
    () =>
      (window as unknown as TouchEditWindow).__blockyCursorStore.getState()
        .hoveredBrickId !== null,
    { timeout: 3000 },
  )
}

test.describe('touch edit controls', () => {
  test.use({ hasTouch: true })

  test('tap rotate button advances cursor rotation', async ({ page }) => {
    await page.goto('/')
    await waitForDevWindow(page, {
      requireProjectToCanvas: true,
      timeout: 10000,
    })

    const rotBefore = await page.evaluate(
      () =>
        (window as unknown as TouchEditWindow).__blockyCursorStore.getState()
          .rot,
    )

    await page.locator('[data-testid="touch-rotate"]').tap()

    const rotAfter = await page.evaluate(
      () =>
        (window as unknown as TouchEditWindow).__blockyCursorStore.getState()
          .rot,
    )

    expect(rotAfter).toBe((rotBefore + 1) % 4)
  })

  test('tap delete button removes the hovered brick', async ({ page }) => {
    await page.goto('/')
    await waitForDevWindow(page, {
      requireProjectToCanvas: true,
      timeout: 10000,
    })

    // Place a brick via store
    const brickId = await page.evaluate(() => {
      return (window as unknown as TouchEditWindow).__blockyStore
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

    const brickPos = await projectToCanvas(page, 5, 1.5, 6)
    await tapUntilBrickHovered(page, brickPos)

    // Tap the delete button
    await page.locator('[data-testid="touch-delete"]').tap()

    // Assert the brick was removed
    await page.waitForFunction(
      (id) =>
        !(
          (id as string) in
          (window as unknown as TouchEditWindow).__blockyStore.getState().bricks
        ),
      brickId,
      { timeout: 3000 },
    )

    const brickExists = await page.evaluate(
      (id) =>
        (id as string) in
        (window as unknown as TouchEditWindow).__blockyStore.getState().bricks,
      brickId,
    )
    expect(brickExists).toBe(false)
  })

  test('moving back to the baseplate clears hovered brick state', async ({
    page,
  }) => {
    await page.goto('/')
    await waitForDevWindow(page, {
      requireProjectToCanvas: true,
      timeout: 10000,
    })

    const brickId = await page.evaluate(() => {
      return (window as unknown as TouchEditWindow).__blockyStore
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

    const brickPos = await projectToCanvas(page, 5, 1.5, 6)
    await tapUntilBrickHovered(page, brickPos)

    const baseplatePos = await projectToCanvas(page, 12, 0, 12)
    await touchPointerTap(page, baseplatePos)

    await page.waitForFunction(
      () =>
        (window as unknown as TouchEditWindow).__blockyCursorStore.getState()
          .hoveredBrickId === null,
      { timeout: 3000 },
    )

    await expect(page.locator('[data-testid="touch-delete"]')).toBeDisabled()
  })
})
