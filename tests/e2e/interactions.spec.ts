import { test, expect } from '@playwright/test'

test.describe('interactions', () => {
  test('places, rotates, deletes, and triggers collapse with undo', async ({
    page,
  }) => {
    await page.goto('/')

    // Wait for store handles
    await page.waitForFunction(() => window.__blockyStore !== undefined)
    await page.waitForFunction(() => window.__blockyCursorStore !== undefined)

    // 1. Place a brick
    await page.evaluate(() => {
      const store = window.__blockyStore!.getState()
      store.placeBrick({
        partId: 'brick-2x4',
        color: 'red',
        x: 5,
        y: 0,
        z: 5,
        rot: 0,
      })
    })

    // 2. Press 'R' to rotate and assert cursor rotation state advanced
    const initialRot = await page.evaluate(
      () => window.__blockyCursorStore!.getState().rot,
    )
    expect(initialRot).toBe(0)

    await page.keyboard.press('R')

    const newRot = await page.evaluate(
      () => window.__blockyCursorStore!.getState().rot,
    )
    expect(newRot).toBe(1)

    // 3. Place a second brick stacked on the first one
    await page.evaluate(() => {
      const store = window.__blockyStore!.getState()
      // height of brick-2x4 is 3 plates, so stacked at y=3
      store.placeBrick({
        partId: 'brick-2x4',
        color: 'blue',
        x: 5,
        y: 3,
        z: 5,
        rot: 1,
      })
    })

    let count = await page.evaluate(
      () => Object.keys(window.__blockyStore!.getState().bricks).length,
    )
    expect(count).toBe(2)

    // 4. Delete the lower one, assert upper one is removed by collapse
    await page.evaluate(() => {
      const store = window.__blockyStore!.getState()
      const bricks = Object.values(store.bricks)
      const lower = bricks.find((b) => b.y === 0)
      if (lower) {
        store.deleteBrick(lower.id)
        store.triggerCollapse()
      }
    })

    // After collapse, the upper brick should fall, leaving 0 bricks in the store
    count = await page.evaluate(
      () => Object.keys(window.__blockyStore!.getState().bricks).length,
    )
    expect(count).toBe(0)

    // 5. Undo and assert the pre-delete count (2) is restored
    await page.evaluate(() => {
      // deleteBrick and triggerCollapse are two separate zustand sets, so they create two zundo history entries.
      // We must undo both to restore the pre-delete state.
      window.__blockyStore!.getState().undo() // undoes the collapse
      window.__blockyStore!.getState().undo() // undoes the delete
    })

    count = await page.evaluate(
      () => Object.keys(window.__blockyStore!.getState().bricks).length,
    )
    expect(count).toBe(2)
  })
})
