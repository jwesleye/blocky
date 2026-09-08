import { expect, test } from '@playwright/test'

import { projectToCanvas, waitForStores } from './support/devWindow'

interface SelectionStore {
  getState: () => {
    placeBrick: (brick: object) => string | null
    selection: Set<string>
  }
}

test('select mode supports click toggling and baseplate box selection', async ({
  page,
}) => {
  await page.goto('/')
  await waitForStores(page)

  const ids = await page.evaluate(() => {
    const store = (
      window as unknown as { __blockyStore: SelectionStore }
    ).__blockyStore.getState()
    const first = store.placeBrick({
      partId: 'brick-1x1',
      color: 'red',
      x: 10,
      y: 0,
      z: 10,
      rot: 0,
    })
    const second = store.placeBrick({
      partId: 'brick-1x1',
      color: 'blue',
      x: 14,
      y: 0,
      z: 10,
      rot: 0,
    })
    if (!first || !second) throw new Error('grounded placements were rejected')
    return [first, second]
  })

  await page.getByTestId('tool-select').click()

  const firstTop = await projectToCanvas(page, 10.5, 3, 10.5)
  const secondTop = await projectToCanvas(page, 14.5, 3, 10.5)
  await page.mouse.click(firstTop.x, firstTop.y)
  await page.keyboard.down('Shift')
  await page.mouse.click(secondTop.x, secondTop.y)
  await page.keyboard.up('Shift')

  await expect(page.getByTestId('selection-count')).toHaveText(
    '2 bricks selected',
  )

  await page.keyboard.down('Shift')
  await page.mouse.click(firstTop.x, firstTop.y)
  await page.keyboard.up('Shift')
  await expect(page.getByTestId('selection-count')).toHaveText(
    '1 brick selected',
  )

  // (9, 0, 9) is hidden behind the first brick from the default camera.
  // Start on visible empty baseplate so this actually begins a box gesture.
  const boxStart = await projectToCanvas(page, 9, 0, 7)
  // Leave a full stud of clearance from brick edges at the end as well;
  // subpixel rounding on tablet must not turn the endpoint into a brick hit.
  const boxEnd = await projectToCanvas(page, 16, 0, 12)
  await page.mouse.move(boxStart.x, boxStart.y)
  await page.waitForFunction(() => {
    const grid = (
      window as unknown as {
        __blockyGhostGrid: { x: number; y: number; z: number } | null
      }
    ).__blockyGhostGrid
    return grid?.x === 9 && grid.y === 0 && grid.z === 7
  })
  const cameraBefore = await page.evaluate(() => {
    const position = (
      window as unknown as {
        __blockyCamera: { position: { x: number; y: number; z: number } }
      }
    ).__blockyCamera.position
    return { x: position.x, y: position.y, z: position.z }
  })
  await page.mouse.down()
  await page.mouse.move(boxEnd.x, boxEnd.y, { steps: 4 })
  await page.waitForFunction(() => {
    const grid = (
      window as unknown as {
        __blockyGhostGrid: { x: number; y: number; z: number } | null
      }
    ).__blockyGhostGrid
    return grid?.x === 16 && grid.y === 0 && grid.z === 12
  })
  await page.mouse.up()
  const cameraAfter = await page.evaluate(() => {
    const position = (
      window as unknown as {
        __blockyCamera: { position: { x: number; y: number; z: number } }
      }
    ).__blockyCamera.position
    return { x: position.x, y: position.y, z: position.z }
  })
  expect(cameraAfter).toEqual(cameraBefore)

  await page.waitForFunction((selectedIds) => {
    const selection = (
      window as unknown as { __blockyStore: SelectionStore }
    ).__blockyStore.getState().selection
    return selectedIds.every((id) => selection.has(id)) && selection.size === 2
  }, ids)
})
