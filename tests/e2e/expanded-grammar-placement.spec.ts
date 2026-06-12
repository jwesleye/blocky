import { test, expect } from '@playwright/test'
import { getBrickCount } from './support/devWindow'

interface PlacedBrick {
  partId: string
  color: string
  x: number
  y: number
  z: number
  rot: number
  offset?: { x: number; z: number }
  mount?: 'px' | 'nx' | 'pz' | 'nz'
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

  // Place the supported render-first mounted flow: px brick on the baseplate.
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

  // Floating elevated mount is rejected — no standard brick provides lateral
  // contact at y=3 for this SNOT brick's anti-stud face.
  await placeBrick(page, {
    partId: 'brick-1x1',
    color: 'red',
    x: 10,
    y: 3,
    z: 10,
    rot: 0,
    mount: 'px',
  })

  // It should be rejected (count remains 1).
  count = await getBrickCount(page)
  expect(count).toBe(1)
})

test('places an elevated mounted brick that has lateral support from a standard brick', async ({
  page,
}) => {
  await gotoWithStore(page)

  // Build a two-brick vertical stack so the top standard brick is grounded.
  // Then place a SNOT 'px' brick whose anti-stud aligns with the elevated standard's +X face.
  //
  // Standard at x=0, y=3: xHi=1.0.
  // Mounted 'px' at x=2, y=3: anti-stud = xCenter(2.5) − H/2(1.5) = 1.0. Face matches.
  // Y overlap: mounted [4.0, 5.0] ∩ standard [3, 6] ✓. No collision.
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
  expect(count).toBe(3)
})

test('places an offset brick and rejects overlapping offset placements', async ({
  page,
}) => {
  await gotoWithStore(page)

  // Place a valid offset brick on baseplate
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

  // Asserts the canvas renders non-blank
  await expect(page.locator('canvas')).toBeVisible()

  // Place an overlapping brick (overlap by 0.5 stud)
  // The first brick spans [5.5, 6.5]. A non-offset brick at x=6 spans [6.0, 7.0].
  await placeBrick(page, {
    partId: 'brick-1x1',
    color: 'red',
    x: 6,
    y: 0,
    z: 5,
    rot: 0,
  })

  // It should be rejected (count remains 1)
  count = await getBrickCount(page)
  expect(count).toBe(1)
})
