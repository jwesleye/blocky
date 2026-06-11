import { expect, test } from '@playwright/test'
import {
  waitForStores,
  projectToCanvas,
  type DevWindow,
} from './support/devWindow'

test('paint mode recolors a placed brick and undo restores the original color', async ({
  page,
}) => {
  await page.goto('/')
  await waitForStores(page)

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

  await page.evaluate(() => {
    const cursor = (
      window as unknown as DevWindow
    ).__blockyCursorStore.getState()
    cursor.setColor('blue')
  })

  await page.click('[data-testid="tool-paint"]')
  await expect(page.locator('[data-testid="tool-paint"]')).toHaveAttribute(
    'aria-pressed',
    'true',
  )

  const activeTool = await page.evaluate(() => {
    return (window as unknown as DevWindow).__blockyCursorStore.getState()
      .editingTool
  })
  expect(activeTool).toBe('paint')

  const brickPos = await projectToCanvas(page, 1, 1.5, 2)
  await page.mouse.click(brickPos.x, brickPos.y)

  const emptyPos = await projectToCanvas(page, 20, 0, 20)
  await page.mouse.click(emptyPos.x, emptyPos.y)

  await page.waitForFunction(
    (id) => {
      const bricks = (window as unknown as DevWindow).__blockyStore.getState()
        .bricks
      return (
        bricks[id as string]?.color === 'blue' &&
        Object.keys(bricks).length === 1
      )
    },
    brickId,
    { timeout: 5000 },
  )

  const colorAfterPaint = await page.evaluate((id) => {
    return (window as unknown as DevWindow).__blockyStore.getState().bricks[
      id as string
    ]?.color
  }, brickId)
  expect(colorAfterPaint).toBe('blue')

  await page.evaluate(() => {
    ;(window as unknown as DevWindow).__blockyStore.getState().undo()
  })

  const colorAfterUndo = await page.evaluate((id) => {
    return (window as unknown as DevWindow).__blockyStore.getState().bricks[
      id as string
    ]?.color
  }, brickId)
  expect(colorAfterUndo).toBe('red')

  await page.evaluate(() => {
    ;(window as unknown as DevWindow).__blockyStore.getState().redo()
  })

  const colorAfterRedo = await page.evaluate((id) => {
    return (window as unknown as DevWindow).__blockyStore.getState().bricks[
      id as string
    ]?.color
  }, brickId)
  expect(colorAfterRedo).toBe('blue')
})

test('eyedropper samples a placed brick into the active cursor', async ({
  page,
}) => {
  await page.goto('/')
  await waitForStores(page)

  await page.evaluate(() => {
    const store = (window as unknown as DevWindow).__blockyStore.getState()
    store.placeBrick({
      partId: 'brick-2x4',
      color: 'red',
      x: 0,
      y: 0,
      z: 0,
      rot: 0,
    })
    store.placeBrick({
      partId: 'brick-1x1',
      color: 'green',
      x: 8,
      y: 0,
      z: 0,
      rot: 0,
    })
  })

  await page.click('[data-testid="tool-eyedropper"]')
  await expect(page.locator('[data-testid="tool-eyedropper"]')).toHaveAttribute(
    'aria-pressed',
    'true',
  )

  const toolAfterClick = await page.evaluate(() => {
    return (window as unknown as DevWindow).__blockyCursorStore.getState()
      .editingTool
  })
  expect(toolAfterClick).toBe('eyedropper')

  const samplePos = await projectToCanvas(page, 8.5, 1.5, 0.5)
  await page.mouse.click(samplePos.x, samplePos.y)

  const emptyPos = await projectToCanvas(page, 20, 0, 20)
  await page.mouse.click(emptyPos.x, emptyPos.y)

  await page.waitForFunction(
    () => {
      const cursor = (
        window as unknown as DevWindow
      ).__blockyCursorStore.getState()
      const bricks = (window as unknown as DevWindow).__blockyStore.getState()
        .bricks
      return (
        cursor.colorId === 'green' &&
        cursor.partId === 'brick-1x1' &&
        Object.keys(bricks).length === 2
      )
    },
    undefined,
    { timeout: 5000 },
  )

  const { colorId, partId } = await page.evaluate(() => {
    const state = (
      window as unknown as DevWindow
    ).__blockyCursorStore.getState()
    return { colorId: state.colorId, partId: state.partId }
  })
  expect(colorId).toBe('green')
  expect(partId).toBe('brick-1x1')

  const brickCount = await page.evaluate(() => {
    return Object.keys(
      (window as unknown as DevWindow).__blockyStore.getState().bricks,
    ).length
  })
  expect(brickCount).toBe(2)
})

test('switching back to place mode allows normal placement after eyedropper', async ({
  page,
}) => {
  await page.goto('/')
  await waitForStores(page)

  await page.evaluate(() => {
    const store = (window as unknown as DevWindow).__blockyStore.getState()
    store.placeBrick({
      partId: 'brick-2x4',
      color: 'red',
      x: 0,
      y: 0,
      z: 0,
      rot: 0,
    })
  })

  await page.click('[data-testid="tool-eyedropper"]')
  await expect(page.locator('[data-testid="tool-eyedropper"]')).toHaveAttribute(
    'aria-pressed',
    'true',
  )

  const eyedropperPos = await projectToCanvas(page, 1, 1.5, 2)
  await page.mouse.click(eyedropperPos.x, eyedropperPos.y)

  await page.click('[data-testid="tool-place"]')
  await expect(page.locator('[data-testid="tool-place"]')).toHaveAttribute(
    'aria-pressed',
    'true',
  )

  const activeTool = await page.evaluate(() => {
    return (window as unknown as DevWindow).__blockyCursorStore.getState()
      .editingTool
  })
  expect(activeTool).toBe('place')

  const placePos = await projectToCanvas(page, 4, 0, 0)
  await page.mouse.move(placePos.x, placePos.y)
  await page.mouse.click(placePos.x, placePos.y)

  await page.waitForFunction(
    () =>
      Object.keys(
        (window as unknown as DevWindow).__blockyStore.getState().bricks,
      ).length === 2,
    undefined,
    { timeout: 5000 },
  )

  const brickCount = await page.evaluate(() => {
    return Object.keys(
      (window as unknown as DevWindow).__blockyStore.getState().bricks,
    ).length
  })
  expect(brickCount).toBe(2)
})
