import { test, expect } from '@playwright/test'

interface DevBuildStore {
  getState: () => {
    placeBrick: (b: object) => string | null
    recolorBrick: (id: string, color: string) => void
    undo: () => void
    redo: () => void
    bricks: Record<string, { id: string; partId: string; color: string; x: number; y: number; z: number }>
  }
}

interface DevCursorStore {
  getState: () => {
    editingTool: string
    colorId: string
    partId: string
    setEditingTool: (tool: string) => void
    setColor: (id: string) => void
    sampleBrick: (brick: { partId: string; color: string }) => void
  }
}

test('paint mode recolors a placed brick and undo restores the original color', async ({ page }) => {
  await page.goto('/')

  await page.waitForFunction(
    () =>
      (window as unknown as { __blockyStore: unknown }).__blockyStore !== undefined &&
      (window as unknown as { __blockyCursorStore: unknown }).__blockyCursorStore !== undefined,
  )

  // Place a red brick
  const brickId = await page.evaluate(() => {
    const store = (window as unknown as { __blockyStore: DevBuildStore }).__blockyStore.getState()
    return store.placeBrick({ partId: 'brick-1x1', color: 'red', x: 0, y: 0, z: 0, rot: 0 })
  })
  expect(brickId).toBeTruthy()

  // Switch to paint mode with blue active color
  await page.evaluate(() => {
    const cursor = (window as unknown as { __blockyCursorStore: DevCursorStore }).__blockyCursorStore.getState()
    cursor.setEditingTool('paint')
    cursor.setColor('blue')
  })

  const activeTool = await page.evaluate(() => {
    return (window as unknown as { __blockyCursorStore: DevCursorStore }).__blockyCursorStore.getState().editingTool
  })
  expect(activeTool).toBe('paint')

  // Simulate paint by calling recolorBrick directly (scene click dispatch)
  await page.evaluate((id) => {
    const store = (window as unknown as { __blockyStore: DevBuildStore }).__blockyStore.getState()
    store.recolorBrick(id as string, 'blue')
  }, brickId)

  const colorAfterPaint = await page.evaluate((id) => {
    return (window as unknown as { __blockyStore: DevBuildStore }).__blockyStore.getState().bricks[id as string]?.color
  }, brickId)
  expect(colorAfterPaint).toBe('blue')

  // Undo should restore red
  await page.evaluate(() => {
    (window as unknown as { __blockyStore: DevBuildStore }).__blockyStore.getState().undo()
  })

  const colorAfterUndo = await page.evaluate((id) => {
    return (window as unknown as { __blockyStore: DevBuildStore }).__blockyStore.getState().bricks[id as string]?.color
  }, brickId)
  expect(colorAfterUndo).toBe('red')

  // Redo reapplies blue
  await page.evaluate(() => {
    (window as unknown as { __blockyStore: DevBuildStore }).__blockyStore.getState().redo()
  })

  const colorAfterRedo = await page.evaluate((id) => {
    return (window as unknown as { __blockyStore: DevBuildStore }).__blockyStore.getState().bricks[id as string]?.color
  }, brickId)
  expect(colorAfterRedo).toBe('blue')
})

test('eyedropper samples a placed brick into the active cursor', async ({ page }) => {
  await page.goto('/')

  await page.waitForFunction(
    () =>
      (window as unknown as { __blockyStore: unknown }).__blockyStore !== undefined &&
      (window as unknown as { __blockyCursorStore: unknown }).__blockyCursorStore !== undefined,
  )

  // Place two bricks with different colors/parts
  await page.evaluate(() => {
    const store = (window as unknown as { __blockyStore: DevBuildStore }).__blockyStore.getState()
    store.placeBrick({ partId: 'brick-2x4', color: 'red', x: 0, y: 0, z: 0, rot: 0 })
    store.placeBrick({ partId: 'brick-1x1', color: 'green', x: 8, y: 0, z: 0, rot: 0 })
  })

  // Switch to eyedropper mode
  await page.evaluate(() => {
    const cursor = (window as unknown as { __blockyCursorStore: DevCursorStore }).__blockyCursorStore.getState()
    cursor.setEditingTool('eyedropper')
  })

  // Sample the green brick-1x1
  await page.evaluate(() => {
    const cursor = (window as unknown as { __blockyCursorStore: DevCursorStore }).__blockyCursorStore.getState()
    cursor.sampleBrick({ partId: 'brick-1x1', color: 'green' })
  })

  const { colorId, partId } = await page.evaluate(() => {
    const state = (window as unknown as { __blockyCursorStore: DevCursorStore }).__blockyCursorStore.getState()
    return { colorId: state.colorId, partId: state.partId }
  })
  expect(colorId).toBe('green')
  expect(partId).toBe('brick-1x1')

  // Build store must not have changed
  const brickCount = await page.evaluate(() => {
    return Object.keys((window as unknown as { __blockyStore: DevBuildStore }).__blockyStore.getState().bricks).length
  })
  expect(brickCount).toBe(2)
})

test('switching back to place mode allows normal placement after eyedropper', async ({ page }) => {
  await page.goto('/')

  await page.waitForFunction(
    () =>
      (window as unknown as { __blockyStore: unknown }).__blockyStore !== undefined &&
      (window as unknown as { __blockyCursorStore: unknown }).__blockyCursorStore !== undefined,
  )

  // Place a seed brick
  await page.evaluate(() => {
    const store = (window as unknown as { __blockyStore: DevBuildStore }).__blockyStore.getState()
    store.placeBrick({ partId: 'brick-1x1', color: 'red', x: 0, y: 0, z: 0, rot: 0 })
  })

  // Use eyedropper then switch back to place
  await page.evaluate(() => {
    const cursor = (window as unknown as { __blockyCursorStore: DevCursorStore }).__blockyCursorStore.getState()
    cursor.setEditingTool('eyedropper')
    cursor.sampleBrick({ partId: 'brick-1x1', color: 'red' })
    cursor.setEditingTool('place')
  })

  const activeTool = await page.evaluate(() => {
    return (window as unknown as { __blockyCursorStore: DevCursorStore }).__blockyCursorStore.getState().editingTool
  })
  expect(activeTool).toBe('place')

  // Normal placement still works
  const newId = await page.evaluate(() => {
    const store = (window as unknown as { __blockyStore: DevBuildStore }).__blockyStore.getState()
    return store.placeBrick({ partId: 'brick-1x1', color: 'red', x: 4, y: 0, z: 0, rot: 0 })
  })
  expect(newId).toBeTruthy()

  const brickCount = await page.evaluate(() => {
    return Object.keys((window as unknown as { __blockyStore: DevBuildStore }).__blockyStore.getState().bricks).length
  })
  expect(brickCount).toBe(2)
})
