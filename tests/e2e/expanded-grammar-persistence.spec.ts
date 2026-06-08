import { readFileSync } from 'node:fs'

import { test, expect } from '@playwright/test'

/**
 * End-to-end persistence coverage for the expanded grammar (issue #101).
 *
 * The placement UI for half-stud offsets lands in #99, so offsets are injected
 * through the dev-exposed legacy store (`window.__legacyStore`) — the same store
 * the Export/Import JSON buttons in `PersistenceControls` are wired to — and the
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

interface LegacyStore {
  getState: () => {
    setBricks: (bricks: SerializedBrick[]) => void
    bricks: SerializedBrick[]
  }
}

type WindowWithStore = { __legacyStore: LegacyStore }

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
      (window as unknown as { __legacyStore?: unknown }).__legacyStore !==
      undefined,
  )
}

async function seedBricks(
  page: import('@playwright/test').Page,
  bricks: SerializedBrick[],
) {
  await page.evaluate((b) => {
    ;(window as unknown as WindowWithStore).__legacyStore
      .getState()
      .setBricks(b)
  }, bricks)
  // Wait for React to commit the new count, so the export button's handler is
  // bound to the seeded bricks (exportToJSON closes over the rendered bricks).
  await expect(page.locator('h2:has-text("Build Status") + p')).toHaveText(
    `Bricks in build: ${bricks.length}`,
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

  // Re-opening: clear the store, then import the exported file back.
  await seedBricks(page, [])
  await importBuild(page, exported)
  await page.waitForFunction(
    () =>
      (window as unknown as WindowWithStore).__legacyStore.getState().bricks
        .length === 1,
  )

  const restored = await page.evaluate(
    () =>
      (window as unknown as WindowWithStore).__legacyStore.getState().bricks,
  )
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

test('rejects malformed JSON on import without crashing or dropping the build', async ({
  page,
}) => {
  await gotoWithStore(page)
  await seedBricks(page, [offsetBrick])

  // The hook surfaces invalid files via window.alert; dismiss it.
  page.on('dialog', (dialog) => dialog.dismiss())
  await importBuild(page, 'not json {')

  // The alert is async; give the import handler a tick to run, then assert the
  // build is unchanged (no silent drop, no crash).
  await page.waitForFunction(
    () =>
      (window as unknown as WindowWithStore).__legacyStore.getState().bricks
        .length === 1,
  )
  const bricks = await page.evaluate(
    () =>
      (window as unknown as WindowWithStore).__legacyStore.getState().bricks,
  )
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
      (window as unknown as WindowWithStore).__legacyStore.getState().bricks
        .length === 1,
  )
  const restored = await page.evaluate(
    () =>
      (window as unknown as WindowWithStore).__legacyStore.getState().bricks,
  )
  expect(restored[0]).not.toHaveProperty('offset')
})
