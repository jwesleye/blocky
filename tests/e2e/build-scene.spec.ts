import { test, expect } from '@playwright/test'

interface DevBrick {
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
    bricks: Record<string, DevBrick>
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
  await page.goto('/', { waitUntil: 'domcontentloaded' })

  await waitForSceneDebugHandles(page)

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

  await expect(page.locator('canvas')).toBeVisible()
  await expect(page.getByText('Build Status')).toHaveCount(0)

  await page.waitForFunction(
    () => {
      const canvas = document.querySelector(
        'canvas',
      ) as HTMLCanvasElement | null
      if (!canvas) return false

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

      const colors = new Set<number>()
      for (let i = 0; i < data.length; i += 16) {
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
  await page.goto('/', { waitUntil: 'domcontentloaded' })
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

test('canvas click places brick on a valid baseplate position', async ({
  page,
}) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })

  await waitForSceneDebugHandles(page)

  const canvas = page.locator('canvas')
  await expect(canvas).toBeVisible()

  const baseplatePos = await projectToCanvas(page, 4, 0, 4)
  await page.mouse.move(baseplatePos.x, baseplatePos.y)
  await page.waitForTimeout(200)
  await page.mouse.click(baseplatePos.x, baseplatePos.y)

  await page.waitForFunction(
    () => {
      const store = (window as unknown as { __blockyStore: DevStore })
        .__blockyStore
      return Object.keys(store.getState().bricks).length === 1
    },
    undefined,
    { timeout: 5000 },
  )

  const brick = await page.evaluate(() => {
    const store = (window as unknown as { __blockyStore: DevStore })
      .__blockyStore
    return Object.values(store.getState().bricks)[0]
  })

  expect(brick.partId).toBe('brick-2x4')
  expect(brick.color).toBe('red')
  expect(brick.y).toBe(0)
  expect(Number.isInteger(brick.x)).toBe(true)
  expect(Number.isInteger(brick.z)).toBe(true)
})

test('store allows stacked placement above an existing brick', async ({
  page,
}) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })

  await page.waitForFunction(
    () =>
      (window as unknown as { __blockyStore: unknown }).__blockyStore !==
      undefined,
  )

  const result = await page.evaluate(() => {
    const store = (window as unknown as { __blockyStore: DevStore })
      .__blockyStore

    const firstId = store.getState().placeBrick({
      partId: 'brick-2x4',
      color: 'red',
      x: 10,
      y: 0,
      z: 10,
      rot: 0,
    })

    const secondId = store.getState().placeBrick({
      partId: 'brick-2x4',
      color: 'blue',
      x: 10,
      y: 3,
      z: 10,
      rot: 0,
    })

    return {
      firstId,
      secondId,
      bricks: Object.values(store.getState().bricks),
    }
  })

  expect(result.firstId).toBeTruthy()
  expect(result.secondId).toBeTruthy()
  expect(result.bricks).toHaveLength(2)
  const yCoords = result.bricks.map((brick) => brick.y).sort((a, b) => a - b)
  expect(yCoords).toEqual([0, 3])
})

test('store rejects colliding repeat placement at the same coordinates', async ({
  page,
}) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })

  await page.waitForFunction(
    () =>
      (window as unknown as { __blockyStore: unknown }).__blockyStore !==
      undefined,
  )

  const result = await page.evaluate(() => {
    const store = (window as unknown as { __blockyStore: DevStore })
      .__blockyStore

    const firstId = store.getState().placeBrick({
      partId: 'brick-2x4',
      color: 'red',
      x: 10,
      y: 0,
      z: 10,
      rot: 0,
    })

    const secondId = store.getState().placeBrick({
      partId: 'brick-2x4',
      color: 'blue',
      x: 10,
      y: 0,
      z: 10,
      rot: 0,
    })

    return {
      firstId,
      secondId,
      brickCount: Object.keys(store.getState().bricks).length,
    }
  })

  expect(result.firstId).toBeTruthy()
  expect(result.secondId).toBeNull()
  expect(result.brickCount).toBe(1)
})
