import { test, expect } from '@playwright/test'

interface DevStore {
  getState: () => {
    placeBrick: (b: object) => string
    selectBrick: (id: string, additive?: boolean) => void
    moveSelection: (delta: object) => boolean
    duplicateSelection: (delta: object) => boolean
    undo: () => void
    redo: () => void
    selection: { size: number }
    bricks: Record<string, { x: number; z: number }>
  }
}

test('group move and duplicate via store handle', async ({ page }) => {
  await page.goto('/')

  // Wait for store to be ready
  await page.waitForFunction(
    () =>
      (window as unknown as { __blockyStore: unknown }).__blockyStore !==
      undefined,
  )

  // Place two bricks
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
    // Select both
    store.selectBrick(id1)
    store.selectBrick(id2, true)
  })

  // Verify selection
  const selectionSize = await page.evaluate(() => {
    return (
      window as unknown as { __blockyStore: DevStore }
    ).__blockyStore.getState().selection.size
  })
  expect(selectionSize).toBe(2)

  // Move selection
  const moveSuccess = await page.evaluate(() => {
    return (window as unknown as { __blockyStore: DevStore }).__blockyStore
      .getState()
      .moveSelection({ dx: 1, dy: 0, dz: 0 })
  })
  expect(moveSuccess).toBe(true)

  // Check positions
  const positions = await page.evaluate(() => {
    const bricks = (
      window as unknown as { __blockyStore: DevStore }
    ).__blockyStore.getState().bricks
    return Object.values(bricks).map((b) => ({ x: b.x, z: b.z }))
  })
  expect(positions).toContainEqual({ x: 1, z: 0 })
  expect(positions).toContainEqual({ x: 3, z: 0 })

  // Duplicate selection
  const duplicateSuccess = await page.evaluate(() => {
    return (window as unknown as { __blockyStore: DevStore }).__blockyStore
      .getState()
      .duplicateSelection({ dx: 0, dy: 3, dz: 0 })
  })
  expect(duplicateSuccess).toBe(true)

  // Check brick count (should be 4)
  const brickCount = await page.evaluate(() => {
    return Object.keys(
      (
        window as unknown as { __blockyStore: DevStore }
      ).__blockyStore.getState().bricks,
    ).length
  })
  expect(brickCount).toBe(4)

  // Selection should now be the 2 new clones
  const newSelectionSize = await page.evaluate(() => {
    return (
      window as unknown as { __blockyStore: DevStore }
    ).__blockyStore.getState().selection.size
  })
  expect(newSelectionSize).toBe(2)

  // Undo duplicate
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

  // Redo duplicate
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
