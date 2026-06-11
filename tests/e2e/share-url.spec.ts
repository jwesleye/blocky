import { test, expect } from '@playwright/test'

interface SerializedBrick {
  partId: string
  color: string
  x: number
  y: number
  z: number
  rot: number
}

interface StoredBrick extends SerializedBrick {
  id: string
}

interface DevStore {
  setState: (state: {
    bricks: Record<string, StoredBrick>
    selection?: Set<string>
    lastCollapse?: null
    baseplateSize?: number
  }) => void
  getState: () => {
    bricks: Record<string, StoredBrick>
    baseplateSize: number
  }
}

type WindowWithStore = { __blockyStore: DevStore }

const AUTOSAVE_STORAGE_KEY = 'blocky.build.autosave.v1'

const sharedBuildBricks: SerializedBrick[] = [
  {
    partId: 'brick-2x4',
    color: 'red',
    x: 0,
    y: 0,
    z: 0,
    rot: 0,
  },
  {
    partId: 'brick-1x2',
    color: 'blue',
    x: 4,
    y: 0,
    z: 3,
    rot: 1,
  },
]

const autosavedBricks: SerializedBrick[] = [
  {
    partId: 'brick-1x1',
    color: 'yellow',
    x: 9,
    y: 0,
    z: 9,
    rot: 0,
  },
]

async function gotoWithStore(page: import('@playwright/test').Page) {
  await page.goto('/')
  await page.waitForFunction(
    () =>
      (window as unknown as { __blockyStore?: unknown }).__blockyStore !==
      undefined,
  )
}

async function seedBuild(
  page: import('@playwright/test').Page,
  bricks: SerializedBrick[],
  baseplateSize: number,
) {
  await page.evaluate(
    ({ seededBricks, seededBaseplateSize }) => {
      ;(window as unknown as WindowWithStore).__blockyStore.setState({
        bricks: Object.fromEntries(
          seededBricks.map((brick, index) => [
            `seed-${index}`,
            { id: `seed-${index}`, ...brick },
          ]),
        ),
        selection: new Set(),
        lastCollapse: null,
        baseplateSize: seededBaseplateSize,
      })
    },
    { seededBricks: bricks, seededBaseplateSize: baseplateSize },
  )

  await expect(
    page.getByText(`Bricks in build: ${bricks.length}`),
  ).toBeVisible()
}

async function readShareUrl(
  page: import('@playwright/test').Page,
): Promise<string> {
  await page.getByRole('button', { name: 'Share Link' }).click()
  return page.getByTestId('share-url').inputValue()
}

async function waitForAutosave(page: import('@playwright/test').Page) {
  await page.waitForFunction(
    ([storageKey]) => localStorage.getItem(storageKey) !== null,
    [AUTOSAVE_STORAGE_KEY],
  )
}

async function currentState(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const state = (
      window as unknown as WindowWithStore
    ).__blockyStore.getState()
    return {
      bricks: Object.values(state.bricks),
      baseplateSize: state.baseplateSize,
    }
  })
}

test('restores a shared build from the URL on startup', async ({ page }) => {
  await gotoWithStore(page)
  await seedBuild(page, sharedBuildBricks, 48)

  const shareUrl = await readShareUrl(page)

  await page.evaluate(
    ([storageKey]) => {
      localStorage.removeItem(storageKey)
    },
    [AUTOSAVE_STORAGE_KEY],
  )

  await page.goto(shareUrl)
  await page.waitForFunction(
    ([expectedCount]) =>
      Object.keys(
        (window as unknown as WindowWithStore).__blockyStore.getState().bricks,
      ).length === expectedCount,
    [sharedBuildBricks.length],
  )

  await expect(
    page.getByText(`Bricks in build: ${sharedBuildBricks.length}`),
  ).toBeVisible()

  const restored = await currentState(page)
  expect(restored.baseplateSize).toBe(48)
  expect(restored.bricks).toEqual(
    expect.arrayContaining(
      sharedBuildBricks.map((brick) => expect.objectContaining({ ...brick })),
    ),
  )
})

test('prefers the shared URL build over a different autosaved build', async ({
  page,
}) => {
  await gotoWithStore(page)
  await seedBuild(page, sharedBuildBricks, 48)

  const shareUrl = await readShareUrl(page)

  await seedBuild(page, autosavedBricks, 32)
  await waitForAutosave(page)

  await page.goto(shareUrl)
  await page.waitForFunction(
    ([expectedCount]) =>
      Object.keys(
        (window as unknown as WindowWithStore).__blockyStore.getState().bricks,
      ).length === expectedCount,
    [sharedBuildBricks.length],
  )

  const restored = await currentState(page)
  expect(restored.baseplateSize).toBe(48)
  expect(restored.bricks).toHaveLength(sharedBuildBricks.length)
  expect(restored.bricks).toEqual(
    expect.arrayContaining(
      sharedBuildBricks.map((brick) => expect.objectContaining({ ...brick })),
    ),
  )
  expect(restored.bricks).not.toEqual(
    expect.arrayContaining(
      autosavedBricks.map((brick) => expect.objectContaining({ ...brick })),
    ),
  )
})
