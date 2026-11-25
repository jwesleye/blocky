import { test, expect } from '@playwright/test'

interface DevState {
  placeBrick: (b: object) => string | null
  selectBrick: (id: string, additive?: boolean) => void
  moveSelection: (delta: object) => boolean
  duplicateSelection: (delta: object) => boolean
  mirrorSelection: (axis: 'x' | 'z') => boolean
  previewMirrorSelection: (axis: 'x' | 'z') => boolean
  undo: () => void
  redo: () => void
  selection: { size: number }
  bricks: Record<string, { x: number; z: number; y: number }>
}

interface DevStore {
  getState: () => DevState
  setState: (fn: (state: DevState) => Partial<DevState>) => void
}

test('group move and duplicate via store handle', async ({ page }) => {
  await page.goto('/')

  await page.waitForFunction(
    () =>
      (window as unknown as { __blockyStore: unknown }).__blockyStore !==
      undefined,
  )

  await page.evaluate(() => {
    const store = (
      window as unknown as { __blockyStore: DevStore }
    ).__blockyStore.getState()
    const id1 = store.placeBrick({
      partId: 'brick-2x4',
      color: 'red',
      x: 0,
      y: 0,
      z: 0,
      rot: 0,
    })
    const id2 = store.placeBrick({
      partId: 'brick-2x4',
      color: 'blue',
      x: 2,
      y: 0,
      z: 0,
      rot: 0,
    })
    if (id1 === null || id2 === null) {
      throw new Error('grounded brick placement unexpectedly rejected')
    }

    store.selectBrick(id1)
    store.selectBrick(id2, true)
  })

  const selectionSize = await page.evaluate(() => {
    return (
      window as unknown as { __blockyStore: DevStore }
    ).__blockyStore.getState().selection.size
  })
  expect(selectionSize).toBe(2)

  const moveSuccess = await page.evaluate(() => {
    return (window as unknown as { __blockyStore: DevStore }).__blockyStore
      .getState()
      .moveSelection({ dx: 1, dy: 0, dz: 0 })
  })
  expect(moveSuccess).toBe(true)

  const positions = await page.evaluate(() => {
    const bricks = (
      window as unknown as { __blockyStore: DevStore }
    ).__blockyStore.getState().bricks
    return Object.values(bricks).map((b) => ({ x: b.x, z: b.z }))
  })
  expect(positions).toContainEqual({ x: 1, z: 0 })
  expect(positions).toContainEqual({ x: 3, z: 0 })

  const duplicateSuccess = await page.evaluate(() => {
    return (window as unknown as { __blockyStore: DevStore }).__blockyStore
      .getState()
      .duplicateSelection({ dx: 0, dy: 3, dz: 0 })
  })
  expect(duplicateSuccess).toBe(true)

  const brickCount = await page.evaluate(() => {
    return Object.keys(
      (
        window as unknown as { __blockyStore: DevStore }
      ).__blockyStore.getState().bricks,
    ).length
  })
  expect(brickCount).toBe(4)

  const newSelectionSize = await page.evaluate(() => {
    return (
      window as unknown as { __blockyStore: DevStore }
    ).__blockyStore.getState().selection.size
  })
  expect(newSelectionSize).toBe(2)

  await page.evaluate(() => {
    ;(window as unknown as { __blockyStore: DevStore }).__blockyStore
      .getState()
      .undo()
  })

  const countAfterUndo = await page.evaluate(() => {
    return Object.keys(
      (
        window as unknown as { __blockyStore: DevStore }
      ).__blockyStore.getState().bricks,
    ).length
  })
  expect(countAfterUndo).toBe(2)

  await page.evaluate(() => {
    ;(window as unknown as { __blockyStore: DevStore }).__blockyStore
      .getState()
      .redo()
  })

  const countAfterRedo = await page.evaluate(() => {
    return Object.keys(
      (
        window as unknown as { __blockyStore: DevStore }
      ).__blockyStore.getState().bricks,
    ).length
  })
  expect(countAfterRedo).toBe(4)
})

test('mirror selection via UI controls', async ({ page }) => {
  await page.goto('/')

  await page.waitForFunction(
    () =>
      (window as unknown as { __blockyStore: unknown }).__blockyStore !==
      undefined,
  )

  const ids = await page.evaluate(() => {
    const store = (
      window as unknown as { __blockyStore: DevStore }
    ).__blockyStore.getState()
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
      x: 5,
      y: 0,
      z: 0,
      rot: 0,
    })
    if (id1 === null || id2 === null) {
      throw new Error('grounded brick placement unexpectedly rejected')
    }
    store.selectBrick(id1)
    store.selectBrick(id2, true)
    return [id1, id2]
  })

  await page.click('[data-testid="mirror-x"]')

  const posAfterMirror = await page.evaluate((ids) => {
    const bricks = (
      window as unknown as { __blockyStore: DevStore }
    ).__blockyStore.getState().bricks
    return { id1x: bricks[ids[0]].x, id2x: bricks[ids[1]].x }
  }, ids)
  expect(posAfterMirror.id1x).toBe(4)
  expect(posAfterMirror.id2x).toBe(0)

  await page.evaluate(() => {
    ;(window as unknown as { __blockyStore: DevStore }).__blockyStore
      .getState()
      .undo()
  })
  const posAfterUndo = await page.evaluate((ids) => {
    const bricks = (
      window as unknown as { __blockyStore: DevStore }
    ).__blockyStore.getState().bricks
    return { id1x: bricks[ids[0]].x, id2x: bricks[ids[1]].x }
  }, ids)
  expect(posAfterUndo.id1x).toBe(0)
  expect(posAfterUndo.id2x).toBe(5)

  await page.evaluate(() => {
    ;(window as unknown as { __blockyStore: DevStore }).__blockyStore
      .getState()
      .redo()
  })
  const posAfterRedo = await page.evaluate((ids) => {
    const bricks = (
      window as unknown as { __blockyStore: DevStore }
    ).__blockyStore.getState().bricks
    return { id1x: bricks[ids[0]].x, id2x: bricks[ids[1]].x }
  }, ids)
  expect(posAfterRedo.id1x).toBe(4)
  expect(posAfterRedo.id2x).toBe(0)

  await page.evaluate(() => {
    const store = (window as unknown as { __blockyStore: DevStore })
      .__blockyStore
    const floatingId = 'floating-test'
    const groundedId = 'grounded-test'
    store.setState((state) => ({
      bricks: {
        ...state.bricks,
        [floatingId]: {
          id: floatingId,
          partId: 'brick-1x1',
          color: 'red',
          x: 0,
          y: 3,
          z: 15,
          rot: 0,
        },
        [groundedId]: {
          id: groundedId,
          partId: 'brick-1x1',
          color: 'blue',
          x: 5,
          y: 0,
          z: 15,
          rot: 0,
        },
      },
    }))
    store.getState().selectBrick(floatingId)
    store.getState().selectBrick(groundedId, true)
  })

  const countBefore = await page.evaluate(
    () =>
      Object.keys(
        (
          window as unknown as { __blockyStore: DevStore }
        ).__blockyStore.getState().bricks,
      ).length,
  )

  await page.click('[data-testid="mirror-x"]')
  await expect(page.locator('[data-testid="mirror-feedback"]')).toBeVisible()

  const countAfter = await page.evaluate(
    () =>
      Object.keys(
        (
          window as unknown as { __blockyStore: DevStore }
        ).__blockyStore.getState().bricks,
      ).length,
  )
  expect(countAfter).toBe(countBefore)
})
