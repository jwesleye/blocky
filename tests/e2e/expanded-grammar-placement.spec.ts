import { test, expect } from '@playwright/test'
import {
  getBrickCount,
  waitForStores,
  projectToCanvas,
} from './support/devWindow'

interface PlacedBrick {
  partId: string
  color: string
  x: number
  y: number
  z: number
  rot: number
  offset?: { x: number; z: number }
  mount?: 'px' | 'nx' | 'pz' | 'nz'
  hinge?: 'x' | 'z'
}

interface DevStore {
  getState: () => {
    bricks: Record<string, PlacedBrick>
    placeBrick: (brick: Omit<PlacedBrick, 'id'>) => void
  }
}

type WindowWithStore = { __blockyStore: DevStore }

async function gotoWithStore(page: import('@playwright/test').Page) {
  await page.goto('/')
  await page.waitForFunction(
    () =>
      (window as unknown as { __blockyStore?: unknown }).__blockyStore !==
      undefined,
  )
}

async function placeBrick(
  page: import('@playwright/test').Page,
  brick: Omit<PlacedBrick, 'id'>,
) {
  await page.evaluate((b) => {
    ;(window as unknown as WindowWithStore).__blockyStore
      .getState()
      .placeBrick(b)
  }, brick)
}

test('places a baseplate-mounted brick and rejects a floating elevated mounted placement', async ({
  page,
}) => {
  await gotoWithStore(page)

  await placeBrick(page, {
    partId: 'brick-1x1',
    color: 'blue',
    x: 10,
    y: 0,
    z: 10,
    rot: 0,
    mount: 'px',
  })

  let count = await getBrickCount(page)
  expect(count).toBe(1)

  await expect(page.locator('canvas')).toBeVisible()

  await placeBrick(page, {
    partId: 'brick-1x1',
    color: 'red',
    x: 10,
    y: 3,
    z: 10,
    rot: 0,
    mount: 'px',
  })

  count = await getBrickCount(page)
  expect(count).toBe(1)
})

test('rejects an elevated mounted brick when lateral support is still too unstable to survive collapse', async ({
  page,
}) => {
  await gotoWithStore(page)

  await placeBrick(page, {
    partId: 'brick-1x1',
    color: 'gray',
    x: 0,
    y: 0,
    z: 0,
    rot: 0,
  })
  await placeBrick(page, {
    partId: 'brick-1x1',
    color: 'gray',
    x: 0,
    y: 3,
    z: 0,
    rot: 0,
  })
  await placeBrick(page, {
    partId: 'brick-1x1',
    color: 'blue',
    x: 2,
    y: 3,
    z: 0,
    rot: 0,
    mount: 'px',
  })

  const count = await getBrickCount(page)
  expect(count).toBe(2)
})

test('places an offset brick and rejects overlapping offset placements', async ({
  page,
}) => {
  await gotoWithStore(page)

  await placeBrick(page, {
    partId: 'brick-1x1',
    color: 'yellow',
    x: 5,
    y: 0,
    z: 5,
    rot: 0,
    offset: { x: 1, z: 0 },
  })

  let count = await getBrickCount(page)
  expect(count).toBe(1)

  await expect(page.locator('canvas')).toBeVisible()

  await placeBrick(page, {
    partId: 'brick-1x1',
    color: 'red',
    x: 6,
    y: 0,
    z: 5,
    rot: 0,
  })

  count = await getBrickCount(page)
  expect(count).toBe(1)
})

test('places a baseplate-supported z-axis hinge brick and rejects a floating hinge placement', async ({
  page,
}) => {
  await gotoWithStore(page)

  await placeBrick(page, {
    partId: 'brick-1x1',
    color: 'blue',
    x: 8,
    y: 0,
    z: 8,
    rot: 0,
    hinge: 'z',
  })

  let count = await getBrickCount(page)
  expect(count).toBe(1)

  await expect(page.locator('canvas')).toBeVisible()

  await placeBrick(page, {
    partId: 'brick-1x1',
    color: 'red',
    x: 8,
    y: 3,
    z: 20,
    rot: 0,
    hinge: 'z',
  })

  count = await getBrickCount(page)
  expect(count).toBe(1)
})

test('explains unsupported hinge stacking and allows baseplate authoring', async ({
  page,
}) => {
  await gotoWithStore(page)
  await waitForStores(page)
  await placeBrick(page, {
    partId: 'brick-2x4',
    color: 'red',
    x: 10,
    y: 0,
    z: 10,
    rot: 0,
  })
  await page.getByTestId('toggle-hinge-x').click()
  const top = await projectToCanvas(page, 11, 3, 12)
  await page.mouse.move(top.x, top.y)
  await expect(page.getByTestId('placement-feedback')).toContainText(
    'Hinge stacking is not supported yet',
  )
  await page.mouse.click(top.x, top.y)
  expect(await getBrickCount(page)).toBe(1)

  const ground = await projectToCanvas(page, 4, 0, 4)
  await page.mouse.move(ground.x, ground.y)
  await page.waitForFunction(
    () =>
      (window as unknown as { __blockyGhostGrid: { y: number } | null })
        .__blockyGhostGrid?.y === 0,
  )
  await expect(page.getByTestId('placement-feedback')).toBeEmpty()
  await page.mouse.click(ground.x, ground.y)
  await expect(page.locator('.brick-count')).toHaveText('Bricks in build: 2')
  const hinges = await page.evaluate(() =>
    Object.values(
      (window as unknown as WindowWithStore).__blockyStore.getState().bricks,
    ).filter((brick) => brick.hinge === 'x'),
  )
  expect(hinges).toHaveLength(1)
  expect(hinges[0].y).toBe(0)
})
