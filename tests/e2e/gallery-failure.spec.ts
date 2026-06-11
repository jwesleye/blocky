import { test, expect } from '@playwright/test'

interface BlockyStore {
  getState: () => {
    placeBrick: (b: object) => string
    bricks: Record<string, object>
  }
}

test.describe('gallery publish failure paths', () => {
  test('rejected publish (422) shows error and leaves brick count unchanged', async ({
    page,
  }) => {
    await page.goto('/')

    await page.waitForFunction(
      () =>
        (window as unknown as { __blockyStore: unknown }).__blockyStore !==
        undefined,
    )

    await page.evaluate(() => {
      const store = (
        window as unknown as { __blockyStore: BlockyStore }
      ).__blockyStore.getState()
      store.placeBrick({
        partId: 'brick-2x4',
        color: 'red',
        x: 0,
        y: 0,
        z: 0,
        rot: 0,
      })
    })

    const initialCount = await page.evaluate(() => {
      const store = (
        window as unknown as { __blockyStore: BlockyStore }
      ).__blockyStore.getState()
      return Object.keys(store.bricks).length
    })

    await page.route('**/builds', (route) => {
      void route.fulfill({
        status: 422,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Invalid publish request', details: [] }),
      })
    })

    page.once('dialog', async (dialog) => {
      if (dialog.type() === 'prompt') {
        await dialog.accept('Test Build')
      } else {
        await dialog.dismiss()
      }
    })

    await page.getByRole('button', { name: 'Publish to Gallery' }).click()

    await expect(
      page.getByText(/publish rejected|validation|server error/i),
    ).toBeVisible({ timeout: 5000 })

    const finalCount = await page.evaluate(() => {
      const store = (
        window as unknown as { __blockyStore: BlockyStore }
      ).__blockyStore.getState()
      return Object.keys(store.bricks).length
    })
    expect(finalCount).toBe(initialCount)
  })

  test('unavailable backend shows error and leaves brick count unchanged', async ({
    page,
  }) => {
    await page.goto('/')

    await page.waitForFunction(
      () =>
        (window as unknown as { __blockyStore: unknown }).__blockyStore !==
        undefined,
    )

    await page.evaluate(() => {
      const store = (
        window as unknown as { __blockyStore: BlockyStore }
      ).__blockyStore.getState()
      store.placeBrick({
        partId: 'brick-2x4',
        color: 'blue',
        x: 2,
        y: 0,
        z: 2,
        rot: 0,
      })
    })

    const initialCount = await page.evaluate(() => {
      const store = (
        window as unknown as { __blockyStore: BlockyStore }
      ).__blockyStore.getState()
      return Object.keys(store.bricks).length
    })

    await page.route('**/builds', (route) => {
      void route.abort()
    })

    page.once('dialog', async (dialog) => {
      if (dialog.type() === 'prompt') {
        await dialog.accept('Test Build')
      } else {
        await dialog.dismiss()
      }
    })

    await page.getByRole('button', { name: 'Publish to Gallery' }).click()

    await expect(
      page.getByText(/failed to fetch|network error|error/i),
    ).toBeVisible({ timeout: 5000 })

    const finalCount = await page.evaluate(() => {
      const store = (
        window as unknown as { __blockyStore: BlockyStore }
      ).__blockyStore.getState()
      return Object.keys(store.bricks).length
    })
    expect(finalCount).toBe(initialCount)
  })
})
