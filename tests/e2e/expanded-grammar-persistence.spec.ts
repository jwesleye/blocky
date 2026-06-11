import { readFileSync } from 'node:fs'

import { test, expect } from '@playwright/test'

/**
 * End-to-end persistence coverage for the expanded grammar (issue #101).
 *
 * The placement UI for half-stud offsets lands in #99, so offsets are injected
 * through the dev-exposed canonical store (`window.__blockyStore`) and the
 * round-trip is driven through the real buttons (download + file chooser).
 */

interface SerializedBrick {
  partId: string
  color: string
  x: number
  y: number
  z: number
  rot: number
  offset?: { x: number; z: number }
}

interface StoredBrick extends SerializedBrick {
  id: string
}

interface DevStore {
  setState: (state: {
    bricks: Record<string, StoredBrick>
    selection?: Set<string>
    lastCollapse?: null
  }) => void
  getState: () => {
    bricks: Record<string, StoredBrick>
  }
}

type WindowWithStore = { __blockyStore: DevStore }
const AUTOSAVE_STORAGE_KEY = 'blocky.build.autosave.v1'

const offsetBrick: SerializedBrick = {
  partId: 'brick-1x1',
  color: 'yellow',
  x: 2,
  y: 0,
  z: 3,
  rot: 1,
  offset: { x: 1, z: 0 },
}

const classicBrick: SerializedBrick = {
  partId: 'brick-2x4',
  color: 'red',
  x: 0,
  y: 0,
  z: 0,
  rot: 0,
}

async function gotoWithStore(page: import('@playwright/test').Page) {
  await page.goto('/')
  await page.waitForFunction(
    () =>
      (window as unknown as { __blockyStore?: unknown }).__blockyStore !==
      undefined,
  )
}

async function seedBricks(
  page: import('@playwright/test').Page,
  bricks: SerializedBrick[],
) {
  await page.evaluate((seededBricks) => {
    ;(window as unknown as WindowWithStore).__blockyStore.setState({
      bricks: Object.fromEntries(
        seededBricks.map((brick, index) => [
          `seed-${index}`,
          { id: `seed-${index}`, ...brick },
        ]),
      ),
      selection: new Set(),
      lastCollapse: null,
    })
  }, bricks)
  await expect(page.locator('.brick-count')).toHaveText(
    `Bricks in build: ${bricks.length}`,
  )
}

async function waitForAutosave(page: import('@playwright/test').Page) {
  await page.waitForFunction(
    ([storageKey]) => localStorage.getItem(storageKey) !== null,
    [AUTOSAVE_STORAGE_KEY],
  )
}

async function currentBricks(
  page: import('@playwright/test').Page,
): Promise<StoredBrick[]> {
  return page.evaluate(() =>
    Object.values(
      (window as unknown as WindowWithStore).__blockyStore.getState().bricks,
    ),
  )
}

async function exportBuild(
  page: import('@playwright/test').Page,
): Promise<string> {
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export JSON' }).click(),
  ])
  const path = await download.path()
  return readFileSync(path, 'utf-8')
}

async function importBuild(
  page: import('@playwright/test').Page,
  content: string,
) {
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByRole('button', { name: 'Import JSON' }).click(),
  ])
  await chooser.setFiles({
    name: 'build.json',
    mimeType: 'application/json',
    buffer: Buffer.from(content),
  })
}

test('round-trips a half-stud (v2) build through export and import', async ({
  page,
}) => {
  await gotoWithStore(page)
  await seedBricks(page, [offsetBrick])

  const exported = await exportBuild(page)
  const json = JSON.parse(exported) as {
    version: number
    bricks: SerializedBrick[]
  }
  expect(json.version).toBe(2)
  expect(json.bricks[0].offset).toEqual({ x: 1, z: 0 })

  await seedBricks(page, [])
  await importBuild(page, exported)
  await page.waitForFunction(
    () =>
      Object.keys(
        (window as unknown as WindowWithStore).__blockyStore.getState().bricks,
      ).length === 1,
  )

  const restored = await currentBricks(page)
  expect(restored).toHaveLength(1)
  expect(restored[0]).toMatchObject({
    partId: 'brick-1x1',
    color: 'yellow',
    x: 2,
    y: 0,
    z: 3,
    rot: 1,
    offset: { x: 1, z: 0 },
  })
})

test('restores a half-stud (v2) build from persisted storage after reload', async ({
  page,
}) => {
  await gotoWithStore(page)
  await seedBricks(page, [offsetBrick])
  await waitForAutosave(page)

  await page.reload()
  await page.waitForFunction(
    () =>
      Object.keys(
        (window as unknown as WindowWithStore).__blockyStore?.getState()
          .bricks ?? {},
      ).length === 1,
  )
  await expect(page.locator('.brick-count')).toHaveText('Bricks in build: 1')

  const restored = await currentBricks(page)
  expect(restored[0]).toMatchObject({
    partId: 'brick-1x1',
    color: 'yellow',
    x: 2,
    y: 0,
    z: 3,
    rot: 1,
    offset: { x: 1, z: 0 },
  })
})

test('rejects malformed JSON on import without crashing or dropping the build', async ({
  page,
}) => {
  await gotoWithStore(page)
  await seedBricks(page, [offsetBrick])

  page.on('dialog', (dialog) => dialog.dismiss())
  await importBuild(page, 'not json {')

  await page.waitForFunction(
    () =>
      Object.keys(
        (window as unknown as WindowWithStore).__blockyStore.getState().bricks,
      ).length === 1,
  )
  const bricks = await currentBricks(page)
  expect(bricks[0]).toMatchObject({ offset: { x: 1, z: 0 } })
})

test('classic build (no offsets) round-trips as version 1', async ({
  page,
}) => {
  await gotoWithStore(page)
  await seedBricks(page, [classicBrick])

  const exported = await exportBuild(page)
  const json = JSON.parse(exported) as {
    version: number
    bricks: SerializedBrick[]
  }
  expect(json.version).toBe(1)
  expect(json.bricks[0]).not.toHaveProperty('offset')

  await seedBricks(page, [])
  await importBuild(page, exported)
  await page.waitForFunction(
    () =>
      Object.keys(
        (window as unknown as WindowWithStore).__blockyStore.getState().bricks,
      ).length === 1,
  )
  const restored = await currentBricks(page)
  expect(restored[0]).not.toHaveProperty('offset')
})
