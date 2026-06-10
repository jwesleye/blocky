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

  // Wait for the dev store and collapse debug hook to be exposed on window.
  await page.waitForFunction(
    () =>
      (window as unknown as { __blockyStore?: unknown }).__blockyStore !==
        undefined &&
      (window as unknown as { __blockyCollapseDebug?: unknown })
        .__blockyCollapseDebug !== undefined,
  )

  // Seed a deterministic unbalanced build: one grounded brick that stays put and
  // two bricks floating far away with no stud path to the baseplate (they fall).
  // We use setState to bypass the grounding gate for the floating bricks.
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

  // Trigger the collapse.
  await page.evaluate(() => {
    ;(window as unknown as { __blockyStore: CollapseDevStore }).__blockyStore
      .getState()
      .triggerCollapse()
  })

  // The sheared bricks are removed from the build model immediately.
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

  // At least one dynamic body exists during the collapse animation.
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
