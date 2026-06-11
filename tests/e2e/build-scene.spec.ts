import { test, expect } from '@playwright/test'

interface PlacedBrick {
  id: string
  partId: string
  color: string
  x: number
  y: number
  z: number
  rot: number
}

interface DevStore {
  getState: () => {
    placeBrick: (b: object) => string | null
    deleteBrick: (id: string) => void
    bricks: Record<string, PlacedBrick>
  }
}

interface DevCursorStore {
  getState: () => {
    rot: number
    editingTool: string
  }
}

interface DevWindow {
  __blockyStore: DevStore
  __blockyCursorStore: DevCursorStore
  __blockyCamera: unknown
  __blockyProjectToCanvas: (
    worldX: number,
    worldY: number,
    worldZ: number,
  ) => { x: number; y: number }
}

async function waitForStores(page: import('@playwright/test').Page) {
  await page.waitForFunction(
    () =>
      (window as unknown as Partial<DevWindow>).__blockyStore !== undefined &&
      (window as unknown as Partial<DevWindow>).__blockyCursorStore !==
        undefined &&
      (window as unknown as Partial<DevWindow>).__blockyCamera !== undefined &&
      (window as unknown as Partial<DevWindow>).__blockyProjectToCanvas !==
        undefined,
  )
}

async function projectToCanvas(
  page: import('@playwright/test').Page,
  worldX: number,
  worldY: number,
  worldZ: number,
): Promise<{ x: number; y: number }> {
  return page.evaluate(
    ([wx, wy, wz]) =>
      (window as unknown as DevWindow).__blockyProjectToCanvas(wx, wy, wz),
    [worldX, worldY, worldZ] as [number, number, number],
  )
}

async function getBrickCount(page: import('@playwright/test').Page) {
  return page.evaluate(
    () =>
      Object.keys(
        (window as unknown as DevWindow).__blockyStore.getState().bricks,
      ).length,
  )
}

test('seeded bricks render to nonblank canvas, Build Status absent', async ({
  page,
}) => {
  await page.goto('/')

  await page.waitForFunction(
    () =>
      (window as unknown as { __blockyStore: unknown }).__blockyStore !==
      undefined,
  )

  // Seed two differently colored bricks at non-overlapping coordinates
  await page.evaluate(() => {
    const store = (
      window as unknown as { __blockyStore: DevStore }
    ).__blockyStore.getState()
    store.placeBrick({
      partId: 'brick-2x4',
      color: 'red',
      x: 0,
      y: 0,
      z: 0,
      rot: 0,
    })
    store.placeBrick({
      partId: 'brick-2x4',
      color: 'blue',
      x: 6,
      y: 0,
      z: 0,
      rot: 0,
    })
  })

  // Canvas must be visible
  await expect(page.locator('canvas')).toBeVisible()

  // Build Status panel must be gone
  await expect(page.getByText('Build Status')).toHaveCount(0)

  // Canvas must become nonblank — poll until R3F paints colored geometry
  await page.waitForFunction(
    () => {
      const canvas = document.querySelector(
        'canvas',
      ) as HTMLCanvasElement | null
      if (!canvas) return false

      // Draw WebGL canvas onto an offscreen 2D canvas to read pixels
      const offscreen = document.createElement('canvas')
      offscreen.width = canvas.width || 300
      offscreen.height = canvas.height || 150
      const ctx = offscreen.getContext('2d')
      if (!ctx) return false

      ctx.drawImage(canvas, 0, 0)
      const data = ctx.getImageData(
        0,
        0,
        offscreen.width,
        offscreen.height,
      ).data

      // Count distinct colors (sample every 4th pixel for performance)
      const colors = new Set<number>()
      for (let i = 0; i < data.length; i += 16) {
        // pack R,G,B into single int (ignore alpha)
        colors.add((data[i] << 16) | (data[i + 1] << 8) | data[i + 2])
        if (colors.size > 1) return true
      }
      return colors.size > 1
    },
    undefined,
    { timeout: 10000 },
  )
})

test('ghost click-to-place: hovering baseplate and clicking places exactly one brick', async ({
  page,
}) => {
  await page.goto('/')
  await waitForStores(page)

  // Explicitly activate place mode via the toolbar (also serves as a warm-up interaction)
  await page.click('[data-testid="tool-place"]')
  await expect(page.locator('[data-testid="tool-place"]')).toHaveAttribute(
    'aria-pressed',
    'true',
  )

  expect(await getBrickCount(page)).toBe(0)

  // Move pointer to a clear area of the baseplate, wait for ghostGrid to be set,
  // then click to place
  const pos = await projectToCanvas(page, 4, 0, 4)
  await page.mouse.move(pos.x, pos.y)
  await page.waitForTimeout(200)
  await page.mouse.click(pos.x, pos.y)

  await page.waitForFunction(
    () =>
      Object.keys(
        (window as unknown as DevWindow).__blockyStore.getState().bricks,
      ).length === 1,
    undefined,
    { timeout: 5000 },
  )

  expect(await getBrickCount(page)).toBe(1)
})

test('ghost click-to-place: clicking in paint mode does not add a brick', async ({
  page,
}) => {
  await page.goto('/')
  await waitForStores(page)

  // Switch to paint mode via the UI toolbar button
  await page.click('[data-testid="tool-paint"]')
  await expect(page.locator('[data-testid="tool-paint"]')).toHaveAttribute(
    'aria-pressed',
    'true',
  )

  const pos = await projectToCanvas(page, 3, 0, 3)
  await page.mouse.move(pos.x, pos.y)
  await page.mouse.click(pos.x, pos.y)

  // Wait a frame for any async placement that should NOT happen
  await page.waitForTimeout(500)

  const count = await getBrickCount(page)
  expect(count).toBe(0)
})

test('R-rotate: pressing R increments cursor rotation mod 4', async ({
  page,
}) => {
  await page.goto('/')
  await waitForStores(page)

  const initialRot = await page.evaluate(
    () => (window as unknown as DevWindow).__blockyCursorStore.getState().rot,
  )
  expect(initialRot).toBe(0)

  // Focus the canvas so it receives keyboard events
  await page.locator('canvas').focus()
  await page.keyboard.press('r')

  const rot1 = await page.evaluate(
    () => (window as unknown as DevWindow).__blockyCursorStore.getState().rot,
  )
  expect(rot1).toBe(1)

  await page.keyboard.press('r')
  await page.keyboard.press('r')
  await page.keyboard.press('r')

  const rot4 = await page.evaluate(
    () => (window as unknown as DevWindow).__blockyCursorStore.getState().rot,
  )
  expect(rot4).toBe(0)
})

test('right-click to delete: context-menu on a placed brick removes it from the store', async ({
  page,
}) => {
  await page.goto('/')
  await waitForStores(page)

  const brickId = await page.evaluate(() =>
    (window as unknown as DevWindow).__blockyStore
      .getState()
      .placeBrick({
        partId: 'brick-2x4',
        color: 'red',
        x: 0,
        y: 0,
        z: 0,
        rot: 0,
      }),
  )
  expect(brickId).toBeTruthy()
  expect(await getBrickCount(page)).toBe(1)

  // Project the brick's world center (width/2=1, height/2=1.5, length/2=2) to canvas and right-click
  const brickPos = await projectToCanvas(page, 1, 1.5, 2)
  await page.mouse.click(brickPos.x, brickPos.y, { button: 'right' })

  await page.waitForFunction(
    () =>
      Object.keys(
        (window as unknown as DevWindow).__blockyStore.getState().bricks,
      ).length === 0,
    undefined,
    { timeout: 5000 },
  )

  expect(await getBrickCount(page)).toBe(0)
})
