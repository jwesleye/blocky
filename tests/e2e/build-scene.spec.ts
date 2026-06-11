import { test, expect } from '@playwright/test'

interface DevStore {
  getState: () => {
    placeBrick: (b: object) => string
    bricks: Record<string, unknown>
  }
}

interface DevCursorStore {
  getState: () => {
    rot: number
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

async function waitForSceneDebugHandles(page: import('@playwright/test').Page) {
  await page.waitForFunction(
    () =>
      (window as unknown as Partial<DevWindow>).__blockyStore !== undefined &&
      (window as unknown as Partial<DevWindow>).__blockyCursorStore !==
        undefined &&
      (window as unknown as Partial<DevWindow>).__blockyProjectToCanvas !==
        undefined,
  )
}

async function projectToCanvas(
  page: import('@playwright/test').Page,
  worldX: number,
  worldY: number,
  worldZ: number,
) {
  return page.evaluate(
    ([wx, wy, wz]) =>
      (window as unknown as DevWindow).__blockyProjectToCanvas(wx, wy, wz),
    [worldX, worldY, worldZ] as [number, number, number],
  )
}

test('seeded bricks render to nonblank canvas, Build Status absent', async ({
  page,
}) => {
  await page.goto('/')

  await waitForSceneDebugHandles(page)

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

test('place mode deletes an existing brick on click and R rotates the cursor modulo 4', async ({
  page,
}) => {
  await page.goto('/')
  await waitForSceneDebugHandles(page)

  const brickId = await page.evaluate(() => {
    const store = (window as unknown as DevWindow).__blockyStore.getState()
    return store.placeBrick({
      partId: 'brick-2x4',
      color: 'red',
      x: 0,
      y: 0,
      z: 0,
      rot: 0,
    })
  })
  expect(brickId).toBeTruthy()

  const brickPos = await projectToCanvas(page, 1, 1.5, 2)
  await page.mouse.click(brickPos.x, brickPos.y)

  await page.waitForFunction(
    (id) =>
      !(
        (id as string) in
        (window as unknown as DevWindow).__blockyStore.getState().bricks
      ),
    brickId,
  )

  const canvas = page.locator('canvas')
  await canvas.focus()

  const beforeRot = await page.evaluate(
    () => (window as unknown as DevWindow).__blockyCursorStore.getState().rot,
  )
  await page.keyboard.press('r')

  const afterRot = await page.evaluate(
    () => (window as unknown as DevWindow).__blockyCursorStore.getState().rot,
  )
  expect(afterRot).toBe((beforeRot + 1) % 4)
})
