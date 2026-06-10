import { expect, test } from '@playwright/test'

interface DevBuildStore {
  getState: () => {
    placeBrick: (b: object) => string | null
    undo: () => void
    redo: () => void
    bricks: Record<
      string,
      { id: string; partId: string; color: string; x: number; y: number; z: number }
    >
  }
}

interface DevCursorStore {
  getState: () => {
    editingTool: string
    colorId: string
    partId: string
    setColor: (id: string) => void
  }
}

interface PerspectiveCamera {
  projectionMatrix: { elements: number[] }
  matrixWorldInverse: { elements: number[] }
}

async function projectToCanvas(
  page: import('@playwright/test').Page,
  worldX: number,
  worldY: number,
  worldZ: number,
): Promise<{ x: number; y: number }> {
  return page.evaluate(
    ([wx, wy, wz]) => {
      const cam = (window as unknown as { __blockyCamera: PerspectiveCamera }).__blockyCamera
      const canvas = document.querySelector('canvas')!
      const rect = canvas.getBoundingClientRect()

      const pe = cam.projectionMatrix.elements
      const ve = cam.matrixWorldInverse.elements

      const vx = ve[0] * wx + ve[4] * wy + ve[8] * wz + ve[12]
      const vy = ve[1] * wx + ve[5] * wy + ve[9] * wz + ve[13]
      const vz = ve[2] * wx + ve[6] * wy + ve[10] * wz + ve[14]
      const vw = ve[3] * wx + ve[7] * wy + ve[11] * wz + ve[15]

      const cx = pe[0] * vx + pe[4] * vy + pe[8] * vz + pe[12] * vw
      const cy = pe[1] * vx + pe[5] * vy + pe[9] * vz + pe[13] * vw
      const cw = pe[3] * vx + pe[7] * vy + pe[11] * vz + pe[15] * vw

      const ndcX = cx / cw
      const ndcY = cy / cw

      return {
        x: rect.left + ((ndcX + 1) / 2) * rect.width,
        y: rect.top + ((-ndcY + 1) / 2) * rect.height,
      }
    },
    [worldX, worldY, worldZ] as [number, number, number],
  )
}

async function waitForStores(page: import('@playwright/test').Page) {
  await page.waitForFunction(
    () =>
      (window as unknown as { __blockyStore: unknown }).__blockyStore !== undefined &&
      (window as unknown as { __blockyCursorStore: unknown }).__blockyCursorStore !== undefined &&
      (window as unknown as { __blockyCamera: unknown }).__blockyCamera !== undefined,
  )
}

test('paint mode recolors a placed brick and undo restores the original color', async ({ page }) => {
  await page.goto('/')
  await waitForStores(page)

  const brickId = await page.evaluate(() => {
    const store = (window as unknown as { __blockyStore: DevBuildStore }).__blockyStore.getState()
    return store.placeBrick({ partId: 'brick-2x4', color: 'red', x: 0, y: 0, z: 0, rot: 0 })
  })
  expect(brickId).toBeTruthy()

  await page.evaluate(() => {
    const cursor = (window as unknown as { __blockyCursorStore: DevCursorStore }).__blockyCursorStore.getState()
    cursor.setColor('blue')
  })

  await page.click('[data-testid="tool-paint"]')
  await expect(page.locator('[data-testid="tool-paint"]')).toHaveAttribute('aria-pressed', 'true')

  const activeTool = await page.evaluate(() => {
    return (window as unknown as { __blockyCursorStore: DevCursorStore }).__blockyCursorStore.getState().editingTool
  })
  expect(activeTool).toBe('paint')

  const brickPos = await projectToCanvas(page, 1, 1.5, 2)
  await page.mouse.click(brickPos.x, brickPos.y)

  const emptyPos = await projectToCanvas(page, 20, 0, 20)
  await page.mouse.click(emptyPos.x, emptyPos.y)

  await page.waitForFunction(
    (id) => {
      const bricks = (window as unknown as { __blockyStore: DevBuildStore }).__blockyStore.getState().bricks
      return bricks[id as string]?.color === 'blue' && Object.keys(bricks).length === 1
    },
    brickId,
    { timeout: 5000 },
  )

  const colorAfterPaint = await page.evaluate((id) => {
    return (window as unknown as { __blockyStore: DevBuildStore }).__blockyStore.getState().bricks[id as string]?.color
  }, brickId)
  expect(colorAfterPaint).toBe('blue')

  await page.evaluate(() => {
    ;(window as unknown as { __blockyStore: DevBuildStore }).__blockyStore.getState().undo()
  })

  const colorAfterUndo = await page.evaluate((id) => {
    return (window as unknown as { __blockyStore: DevBuildStore }).__blockyStore.getState().bricks[id as string]?.color
  }, brickId)
  expect(colorAfterUndo).toBe('red')

  await page.evaluate(() => {
    ;(window as unknown as { __blockyStore: DevBuildStore }).__blockyStore.getState().redo()
  })

  const colorAfterRedo = await page.evaluate((id) => {
    return (window as unknown as { __blockyStore: DevBuildStore }).__blockyStore.getState().bricks[id as string]?.color
  }, brickId)
  expect(colorAfterRedo).toBe('blue')
})

test('eyedropper samples a placed brick into the active cursor', async ({ page }) => {
  await page.goto('/')
  await waitForStores(page)

  await page.evaluate(() => {
    const store = (window as unknown as { __blockyStore: DevBuildStore }).__blockyStore.getState()
    store.placeBrick({ partId: 'brick-2x4', color: 'red', x: 0, y: 0, z: 0, rot: 0 })
    store.placeBrick({ partId: 'brick-1x1', color: 'green', x: 8, y: 0, z: 0, rot: 0 })
  })

  await page.click('[data-testid="tool-eyedropper"]')
  await expect(page.locator('[data-testid="tool-eyedropper"]')).toHaveAttribute('aria-pressed', 'true')

  const toolAfterClick = await page.evaluate(() => {
    return (window as unknown as { __blockyCursorStore: DevCursorStore }).__blockyCursorStore.getState().editingTool
  })
  expect(toolAfterClick).toBe('eyedropper')

  const samplePos = await projectToCanvas(page, 8.5, 1.5, 0.5)
  await page.mouse.click(samplePos.x, samplePos.y)

  const emptyPos = await projectToCanvas(page, 20, 0, 20)
  await page.mouse.click(emptyPos.x, emptyPos.y)

  await page.waitForFunction(
    () => {
      const cursor = (window as unknown as { __blockyCursorStore: DevCursorStore }).__blockyCursorStore.getState()
      const bricks = (window as unknown as { __blockyStore: DevBuildStore }).__blockyStore.getState().bricks
      return cursor.colorId === 'green' && cursor.partId === 'brick-1x1' && Object.keys(bricks).length === 2
    },
    undefined,
    { timeout: 5000 },
  )

  const { colorId, partId } = await page.evaluate(() => {
    const state = (window as unknown as { __blockyCursorStore: DevCursorStore }).__blockyCursorStore.getState()
    return { colorId: state.colorId, partId: state.partId }
  })
  expect(colorId).toBe('green')
  expect(partId).toBe('brick-1x1')

  const brickCount = await page.evaluate(() => {
    return Object.keys((window as unknown as { __blockyStore: DevBuildStore }).__blockyStore.getState().bricks).length
  })
  expect(brickCount).toBe(2)
})

test('switching back to place mode allows normal placement after eyedropper', async ({ page }) => {
  await page.goto('/')
  await waitForStores(page)

  await page.evaluate(() => {
    const store = (window as unknown as { __blockyStore: DevBuildStore }).__blockyStore.getState()
    store.placeBrick({ partId: 'brick-2x4', color: 'red', x: 0, y: 0, z: 0, rot: 0 })
  })

  await page.click('[data-testid="tool-eyedropper"]')
  await expect(page.locator('[data-testid="tool-eyedropper"]')).toHaveAttribute('aria-pressed', 'true')

  const eyedropperPos = await projectToCanvas(page, 1, 1.5, 2)
  await page.mouse.click(eyedropperPos.x, eyedropperPos.y)

  await page.click('[data-testid="tool-place"]')
  await expect(page.locator('[data-testid="tool-place"]')).toHaveAttribute('aria-pressed', 'true')

  const activeTool = await page.evaluate(() => {
    return (window as unknown as { __blockyCursorStore: DevCursorStore }).__blockyCursorStore.getState().editingTool
  })
  expect(activeTool).toBe('place')

  const placePos = await projectToCanvas(page, 4, 0, 0)
  await page.mouse.click(placePos.x, placePos.y)

  await page.waitForFunction(
    () => Object.keys((window as unknown as { __blockyStore: DevBuildStore }).__blockyStore.getState().bricks).length === 2,
    undefined,
    { timeout: 5000 },
  )

  const brickCount = await page.evaluate(() => {
    return Object.keys((window as unknown as { __blockyStore: DevBuildStore }).__blockyStore.getState().bricks).length
  })
  expect(brickCount).toBe(2)
})
