import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeEach, afterEach, describe, expect, it } from 'vitest'
import {
  addReport,
  clearStore,
  generateBuildId,
  getBuild,
  getReports,
  isBuildDeleted,
  listBuilds,
  MAX_STORED_BUILDS,
  reloadStore,
  storeBuild,
  deleteBuild,
} from '../../../backend/src/store'
import { SHARED_BUILD_CONTRACT_VERSION } from '../../../backend/src/validation'
import type { SharedBuildPayload } from '../../../backend/src/validation'

const validBuild = {
  version: 1 as const,
  baseplate: { size: 32 as const },
  bricks: [],
}

function makePayload(buildId: string): SharedBuildPayload {
  return {
    contractVersion: SHARED_BUILD_CONTRACT_VERSION,
    buildId,
    build: validBuild,
    gallery: {
      title: `Build ${buildId}`,
      visibility: 'public',
      author: { identityMode: 'anonymous' },
      publishedAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  }
}

beforeEach(() => {
  process.env['GALLERY_DATA_DIR'] = mkdtempSync(
    join(tmpdir(), 'blocky-gallery-store-test-'),
  )
  clearStore()
})

afterEach(() => {
  const dataDir = process.env['GALLERY_DATA_DIR']
  if (dataDir) {
    rmSync(dataDir, { recursive: true, force: true })
  }
  delete process.env['GALLERY_DATA_DIR']
})

describe('gallery store resource bounds', () => {
  it('evicts the oldest build and its reports when the build cap is exceeded', () => {
    const firstId = generateBuildId()
    storeBuild(makePayload(firstId))
    addReport(firstId, { reason: 'spam' })

    let lastId = firstId
    for (let index = 0; index < MAX_STORED_BUILDS; index += 1) {
      lastId = generateBuildId()
      storeBuild(makePayload(lastId))
    }

    expect(listBuilds()).toHaveLength(MAX_STORED_BUILDS)
    expect(getBuild(firstId)).toBeUndefined()
    expect(getReports(firstId)).toEqual([])
    expect(getBuild(lastId)).toBeDefined()
  })

  it(
    'never stores more builds than the configured cap',
    { timeout: 30000 },
    () => {
      for (let index = 0; index < MAX_STORED_BUILDS * 2; index += 1) {
        const buildId = generateBuildId()
        storeBuild(makePayload(buildId))
        expect(listBuilds().length).toBeLessThanOrEqual(MAX_STORED_BUILDS)
      }
    },
  )
})

describe('gallery store durability', () => {
  it('reloads stored builds from disk without changing server-owned fields', () => {
    const buildId = generateBuildId()
    const payload = makePayload(buildId)

    storeBuild(payload)
    reloadStore()

    expect(getBuild(buildId)).toEqual(payload)
  })

  it('persists the build id counter across reloads', () => {
    const firstId = generateBuildId()

    reloadStore()
    const secondId = generateBuildId()

    expect(secondId).not.toBe(firstId)
  })

  it('keeps builds intact when delete lacks an authenticated principal', () => {
    const payload = makePayload(generateBuildId())
    payload.gallery.author = {
      identityMode: 'authenticated',
      userId: 'owner-1',
      displayName: 'Owner',
    }

    storeBuild(payload)
    expect(deleteBuild(payload.buildId)).toEqual({
      success: false,
      reason: 'unauthorized',
    })

    reloadStore()

    expect(isBuildDeleted(payload.buildId)).toBe(false)
    expect(getBuild(payload.buildId)).toEqual(payload)
  })

  it('persists reports beside build data without mutating the payload', () => {
    const buildId = generateBuildId()
    const payload = makePayload(buildId)
    storeBuild(payload)
    const payloadBeforeReport = JSON.stringify(getBuild(buildId))

    addReport(buildId, { reason: 'spam' })
    reloadStore()

    expect(getReports(buildId)).toHaveLength(1)
    expect(getReports(buildId)[0]?.reason).toBe('spam')
    expect(JSON.stringify(getBuild(buildId))).toBe(payloadBeforeReport)
  })
})
