import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
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

function makeAuthenticatedPayload(
  buildId: string,
  userId = 'owner-1',
): SharedBuildPayload {
  return {
    ...makePayload(buildId),
    gallery: {
      title: `Build ${buildId}`,
      visibility: 'public',
      author: {
        identityMode: 'authenticated',
        userId,
        displayName: 'Owner',
      },
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
  it(
    'evicts the oldest build and its reports when the build cap is exceeded',
    { timeout: 30000 },
    () => {
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
    },
  )

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

  it('evicts the oldest deleted tombstone when the delete cap is exceeded', () => {
    const deletedIds: string[] = []

    for (let index = 0; index < MAX_STORED_BUILDS + 1; index += 1) {
      const buildId = generateBuildId()
      deletedIds.push(buildId)
      storeBuild(makeAuthenticatedPayload(buildId))
      expect(deleteBuild(buildId, { userId: 'owner-1' })).toEqual({
        success: true,
      })
    }

    expect(isBuildDeleted(deletedIds[0] as string)).toBe(false)
    expect(isBuildDeleted(deletedIds.at(-1) as string)).toBe(true)
  })
})

describe('build id entropy and unpredictability', () => {
  it('generates high-entropy random ids that are not a sequential counter', () => {
    const ids = Array.from({ length: 50 }, () => generateBuildId())

    for (const id of ids) {
      // build_<22-char base64url token> carries 128 bits of entropy.
      expect(id).toMatch(/^build_[A-Za-z0-9_-]{22}$/)
      // It must not be the old build_<base36 timestamp>_<base36 counter> shape
      // whose suffix increments by 1 and is derivable from a prior id.
      expect(id).not.toMatch(/^build_[0-9a-z]{4,12}_[0-9a-z]{1,5}$/)
    }

    // Every id is unique and, unlike the sequential counter format, not ordered.
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).not.toEqual([...ids].sort())
  })
})

describe('gallery store durability', () => {
  it('does not create a store file when only generating a build id', () => {
    const buildId = generateBuildId()
    const dataDir = process.env['GALLERY_DATA_DIR']

    expect(buildId).toMatch(/^build_/)
    expect(dataDir).toBeDefined()
    expect(existsSync(join(dataDir as string, 'store.json'))).toBe(false)
  })

  it('reloads stored builds from disk without changing server-owned fields', () => {
    const buildId = generateBuildId()
    const payload = makePayload(buildId)

    storeBuild(payload)
    reloadStore()

    expect(getBuild(buildId)).toEqual(payload)
  })

  it('keeps generated build ids unique across reloads', () => {
    const firstId = generateBuildId()
    storeBuild(makePayload(firstId))

    const parseCounter = (id: string) =>
      Number.parseInt(id.split('_').at(-1) ?? '', 36)
    const firstCounter = parseCounter(firstId)

    reloadStore()
    const secondId = generateBuildId()
    const secondCounter = parseCounter(secondId)

    expect(secondCounter).toBe(firstCounter + 1)
  })

  it('keeps builds intact when delete lacks an authenticated principal', () => {
    const payload = makeAuthenticatedPayload(generateBuildId())

    storeBuild(payload)
    expect(deleteBuild(payload.buildId)).toEqual({
      success: false,
      reason: 'unauthorized',
    })

    reloadStore()

    expect(isBuildDeleted(payload.buildId)).toBe(false)
    expect(getBuild(payload.buildId)).toEqual(payload)
  })

  it('does not create tombstones for failed deletes', () => {
    const anonymousPayload = makePayload(generateBuildId())
    const ownedPayload = makeAuthenticatedPayload(generateBuildId(), 'owner-1')

    storeBuild(anonymousPayload)
    storeBuild(ownedPayload)

    expect(deleteBuild('missing-build', { userId: 'owner-1' })).toEqual({
      success: false,
      reason: 'not-found',
    })
    expect(
      deleteBuild(anonymousPayload.buildId, { userId: 'owner-1' }),
    ).toEqual({
      success: false,
      reason: 'unauthorized',
    })
    expect(deleteBuild(ownedPayload.buildId, { userId: 'owner-2' })).toEqual({
      success: false,
      reason: 'unauthorized',
    })

    expect(isBuildDeleted('missing-build')).toBe(false)
    expect(isBuildDeleted(anonymousPayload.buildId)).toBe(false)
    expect(isBuildDeleted(ownedPayload.buildId)).toBe(false)
  })

  it('starts from empty state when the persisted store file is malformed', () => {
    const buildId = generateBuildId()
    storeBuild(makePayload(buildId))
    expect(listBuilds()).toHaveLength(1)

    const dataDir = process.env['GALLERY_DATA_DIR'] as string
    writeFileSync(
      join(dataDir, 'store.json'),
      '{ this is not valid json',
      'utf8',
    )

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      expect(() => reloadStore()).not.toThrow()
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[store] failed to parse store file'),
        expect.anything(),
      )
    } finally {
      errorSpy.mockRestore()
    }

    expect(listBuilds()).toEqual([])
    expect(getBuild(buildId)).toBeUndefined()
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
