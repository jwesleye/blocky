import { test, expect } from '@playwright/test'

interface CollapseState {
  placeBrick: (b: object) => string | null
  triggerCollapse: () => void
  bricks: Record<string, unknown>
}

interface CollapseDevStore {
  getState: () => CollapseState
  setState: (fn: (state: CollapseState) => Partial<CollapseState>) => void
}

interface CollapseDebug {
  dynamicBodyCount: number
}

test('collapse spawns dynamic bodies and shrinks the build', async ({
  page,
}) => {
  await page.goto('/')

  await page.waitForFunction(
    () =>
      (window as unknown as { __blockyStore?: unknown }).__blockyStore !==
        undefined &&
      (window as unknown as { __blockyCollapseDebug?: unknown })
        .__blockyCollapseDebug !== undefined,
  )

  const initialCount = await page.evaluate(() => {
    const store = (window as unknown as { __blockyStore: CollapseDevStore })
      .__blockyStore
    store.setState((state) => ({
      bricks: {
        ...state.bricks,
        'grounded-1': {
          id: 'grounded-1',
          partId: 'brick-2x4',
          color: 'red',
          x: 0,
          y: 0,
          z: 0,
          rot: 0,
        },
        'float-blue': {
          id: 'float-blue',
          partId: 'brick-1x1',
          color: 'blue',
          x: 10,
          y: 3,
          z: 10,
          rot: 0,
        },
        'float-green': {
          id: 'float-green',
          partId: 'brick-1x1',
          color: 'green',
          x: 14,
          y: 3,
          z: 10,
          rot: 0,
        },
      },
    }))
    return Object.keys(store.getState().bricks).length
  })
  expect(initialCount).toBe(3)

  await page.evaluate(() => {
    ;(window as unknown as { __blockyStore: CollapseDevStore }).__blockyStore
      .getState()
      .triggerCollapse()
  })

  const afterCount = await page.evaluate(
    () =>
      Object.keys(
        (
          window as unknown as { __blockyStore: CollapseDevStore }
        ).__blockyStore.getState().bricks,
      ).length,
  )
  expect(afterCount).toBeLessThan(initialCount)
  expect(afterCount).toBe(1)

  await page.waitForFunction(
    () =>
      (window as unknown as { __blockyCollapseDebug: CollapseDebug })
        .__blockyCollapseDebug.dynamicBodyCount > 0,
  )
  const dynamicBodyCount = await page.evaluate(
    () =>
      (window as unknown as { __blockyCollapseDebug: CollapseDebug })
        .__blockyCollapseDebug.dynamicBodyCount,
  )
  expect(dynamicBodyCount).toBeGreaterThan(0)
})
