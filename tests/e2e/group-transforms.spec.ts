import { test, expect } from '@playwright/test'

interface DevStore {
  getState: () => {
    placeBrick: (b: object) => string
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

test('mirror selection via UI controls', async ({ page }) => {
  await page.goto('/')

  await page.waitForFunction(
    () =>
      (window as unknown as { __blockyStore: unknown }).__blockyStore !==
      undefined,
  )

  // Asymmetric group: brick-2x4 at x=0 (W=2) and brick-1x1 at x=5 (W=1)
  // bounding box X: cells {0,1} and {5} → minX=0, maxX=5
  // mirror x: id1 new_x=0+5-(0+2-1)=4; id2 new_x=0+5-(5+1-1)=0
  const ids = await page.evaluate(() => {
    const store = (
      window as unknown as { __blockyStore: DevStore }
    ).__blockyStore.getState()
    const id1 = store.placeBrick({ partId: 'brick-2x4', color: 'red', x: 0, y: 0, z: 0, rot: 0 })
    const id2 = store.placeBrick({ partId: 'brick-1x1', color: 'blue', x: 5, y: 0, z: 0, rot: 0 })
    store.selectBrick(id1)
    store.selectBrick(id2, true)
    return [id1, id2]
  })

  // Drive the mirror through the real editing-UI button
  await page.click('[data-testid="mirror-x"]')

  // Verify reflected positions (asymmetric: id1 moves from 0→4, id2 from 5→0)
  const posAfterMirror = await page.evaluate((ids) => {
    const bricks = (
      window as unknown as { __blockyStore: DevStore }
    ).__blockyStore.getState().bricks
    return { id1x: bricks[ids[0]].x, id2x: bricks[ids[1]].x }
  }, ids)
  expect(posAfterMirror.id1x).toBe(4)
  expect(posAfterMirror.id2x).toBe(0)

  // Undo restores original positions
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

  // Redo re-applies the mirror
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

  // Invalid mirror: floating + grounded selection where mirror leaves the
  // floating brick with no support → rejected with user-visible feedback
  await page.evaluate(() => {
    const store = (
      window as unknown as { __blockyStore: DevStore }
    ).__blockyStore.getState()
    const floating = store.placeBrick({ partId: 'brick-1x1', color: 'red', x: 0, y: 3, z: 15, rot: 0 })
    const grounded = store.placeBrick({ partId: 'brick-1x1', color: 'blue', x: 5, y: 0, z: 15, rot: 0 })
    store.selectBrick(floating)
    store.selectBrick(grounded, true)
  })
  const countBefore = await page.evaluate(() =>
    Object.keys(
      (window as unknown as { __blockyStore: DevStore }).__blockyStore.getState().bricks,
    ).length,
  )
  // Drive the invalid mirror through the UI button — expects visible rejection feedback
  await page.click('[data-testid="mirror-x"]')
  await expect(page.locator('[data-testid="mirror-feedback"]')).toBeVisible()
  // State must be unchanged
  const countAfter = await page.evaluate(() =>
    Object.keys(
      (window as unknown as { __blockyStore: DevStore }).__blockyStore.getState().bricks,
    ).length,
  )
  expect(countAfter).toBe(countBefore)
})
