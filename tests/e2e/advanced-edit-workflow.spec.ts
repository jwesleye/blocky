import { test, expect } from '@playwright/test'

interface DevBuildStore {
  getState: () => {
    placeBrick: (b: object) => string | null
    selectBrick: (id: string, additive?: boolean) => void
    moveSelection: (delta: object) => boolean
    recolorBrick: (id: string, color: string) => void
    undo: () => void
    redo: () => void
    selection: { size: number }
    bricks: Record<
      string,
      {
        id: string
        partId: string
        color: string
        x: number
        y: number
        z: number
      }
    >
  }
  setState: (
    fn: (
      state: ReturnType<DevBuildStore['getState']>,
    ) => Partial<ReturnType<DevBuildStore['getState']>>,
  ) => void
}

interface DevCursorStore {
  getState: () => {
    editingTool: string
    colorId: string
    setEditingTool: (tool: string) => void
  }
}

interface DevWindow {
  __blockyStore: DevBuildStore
  __blockyCursorStore: DevCursorStore
}

async function waitForStores(page: import('@playwright/test').Page) {
  await page.waitForFunction(
    () =>
      (window as unknown as Partial<DevWindow>).__blockyStore !== undefined &&
      (window as unknown as Partial<DevWindow>).__blockyCursorStore !==
        undefined,
  )
}

test('keyboard shortcuts p/b/i switch editing tool', async ({ page }) => {
  await page.goto('/')
  await waitForStores(page)

  // Switch to paint via keyboard shortcut B
  await page.keyboard.press('b')
  const toolAfterB = await page.evaluate(() => {
    return (window as unknown as DevWindow).__blockyCursorStore.getState()
      .editingTool
  })
  expect(toolAfterB).toBe('paint')

  // Switch to eyedropper via keyboard shortcut I
  await page.keyboard.press('i')
  const toolAfterI = await page.evaluate(() => {
    return (window as unknown as DevWindow).__blockyCursorStore.getState()
      .editingTool
  })
  expect(toolAfterI).toBe('eyedropper')

  // Switch to place via keyboard shortcut P
  await page.keyboard.press('p')
  const toolAfterP = await page.evaluate(() => {
    return (window as unknown as DevWindow).__blockyCursorStore.getState()
      .editingTool
  })
  expect(toolAfterP).toBe('place')

  // Pointer-driven switching still works (no regression)
  await page.click('[data-testid="tool-paint"]')
  await expect(page.locator('[data-testid="tool-paint"]')).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  const toolAfterClick = await page.evaluate(() => {
    return (window as unknown as DevWindow).__blockyCursorStore.getState()
      .editingTool
  })
  expect(toolAfterClick).toBe('paint')
})

test('advanced-edit workflow: multi-select → move → paint → undo/redo', async ({
  page,
}) => {
  await page.goto('/')
  await waitForStores(page)

  // Place two grounded bricks
  const ids = await page.evaluate(() => {
    const store = (window as unknown as DevWindow).__blockyStore.getState()
    const id1 = store.placeBrick({
      partId: 'brick-2x4',
      color: 'red',
      x: 0,
      y: 0,
      z: 0,
      rot: 0,
    })
    const id2 = store.placeBrick({
      partId: 'brick-1x1',
      color: 'blue',
      x: 8,
      y: 0,
      z: 0,
      rot: 0,
    })
    if (!id1 || !id2)
      throw new Error('grounded brick placement unexpectedly rejected')
    return [id1, id2]
  })
  expect(ids).toHaveLength(2)

  // Multi-select both bricks
  await page.evaluate((ids) => {
    const store = (window as unknown as DevWindow).__blockyStore.getState()
    store.selectBrick(ids[0])
    store.selectBrick(ids[1], true)
  }, ids)

  const selectionSize = await page.evaluate(() => {
    return (window as unknown as DevWindow).__blockyStore.getState().selection
      .size
  })
  expect(selectionSize).toBe(2)

  // Move the selection
  const moveOk = await page.evaluate(() => {
    return (window as unknown as DevWindow).__blockyStore
      .getState()
      .moveSelection({ dx: 1, dy: 0, dz: 0 })
  })
  expect(moveOk).toBe(true)

  const posAfterMove = await page.evaluate((ids) => {
    const bricks = (window as unknown as DevWindow).__blockyStore.getState()
      .bricks
    return { x1: bricks[ids[0]].x, x2: bricks[ids[1]].x }
  }, ids)
  expect(posAfterMove.x1).toBe(1)
  expect(posAfterMove.x2).toBe(9)

  // Switch to paint and recolor id1
  await page.evaluate(() => {
    ;(window as unknown as DevWindow).__blockyCursorStore
      .getState()
      .setEditingTool('paint')
  })
  await page.evaluate((ids) => {
    ;(window as unknown as DevWindow).__blockyStore
      .getState()
      .recolorBrick(ids[0], 'green')
  }, ids)

  const colorAfterPaint = await page.evaluate((ids) => {
    return (window as unknown as DevWindow).__blockyStore.getState().bricks[
      ids[0]
    ].color
  }, ids)
  expect(colorAfterPaint).toBe('green')

  const brickCountAfterPaint = await page.evaluate(() => {
    return Object.keys(
      (window as unknown as DevWindow).__blockyStore.getState().bricks,
    ).length
  })
  expect(brickCountAfterPaint).toBe(2)

  // Undo recolor
  await page.evaluate(() => {
    ;(window as unknown as DevWindow).__blockyStore.getState().undo()
  })
  const colorAfterUndo1 = await page.evaluate((ids) => {
    return (window as unknown as DevWindow).__blockyStore.getState().bricks[
      ids[0]
    ].color
  }, ids)
  expect(colorAfterUndo1).toBe('red')

  // Undo move
  await page.evaluate(() => {
    ;(window as unknown as DevWindow).__blockyStore.getState().undo()
  })
  const posAfterUndo2 = await page.evaluate((ids) => {
    const bricks = (window as unknown as DevWindow).__blockyStore.getState()
      .bricks
    return { x1: bricks[ids[0]].x, x2: bricks[ids[1]].x }
  }, ids)
  expect(posAfterUndo2.x1).toBe(0)
  expect(posAfterUndo2.x2).toBe(8)

  // Redo move
  await page.evaluate(() => {
    ;(window as unknown as DevWindow).__blockyStore.getState().redo()
  })
  const posAfterRedo1 = await page.evaluate((ids) => {
    const bricks = (window as unknown as DevWindow).__blockyStore.getState()
      .bricks
    return { x1: bricks[ids[0]].x, x2: bricks[ids[1]].x }
  }, ids)
  expect(posAfterRedo1.x1).toBe(1)
  expect(posAfterRedo1.x2).toBe(9)

  // Redo recolor
  await page.evaluate(() => {
    ;(window as unknown as DevWindow).__blockyStore.getState().redo()
  })
  const colorAfterRedo2 = await page.evaluate((ids) => {
    return (window as unknown as DevWindow).__blockyStore.getState().bricks[
      ids[0]
    ].color
  }, ids)
  expect(colorAfterRedo2).toBe('green')
})
