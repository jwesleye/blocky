import { beforeEach, describe, expect, it } from 'vitest'
import {
  addReport,
  clearStore,
  generateBuildId,
  getBuild,
  getReports,
  listBuilds,
  MAX_STORED_BUILDS,
  storeBuild,
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
  clearStore()
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

  it('never stores more builds than the configured cap', () => {
    for (let index = 0; index < MAX_STORED_BUILDS * 2; index += 1) {
      const buildId = generateBuildId()
      storeBuild(makePayload(buildId))
      expect(listBuilds().length).toBeLessThanOrEqual(MAX_STORED_BUILDS)
    }
  })
})
