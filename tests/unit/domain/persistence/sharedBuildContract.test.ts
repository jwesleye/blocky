import { describe, expect, it } from 'vitest'

import { BASEPLATE_SIZE_STUDS } from '@/domain/grid'
import {
  SHARED_BUILD_CONTRACT_VERSION,
  parseSharedBuildPayload,
  safeParseSharedBuildPayload,
  serializeSharedBuildPayload,
  validateSharedBuildPayload,
} from '@/domain/persistence/sharedBuildContract'
import type { SharedBuildPayload } from '@/domain/persistence/sharedBuildContract'

const makePayload = (): SharedBuildPayload => ({
  contractVersion: SHARED_BUILD_CONTRACT_VERSION,
  buildId: 'build_01hx7z4gk2r4c8n0k4q4x0m6m1',
  build: {
    version: 1,
    baseplate: { size: BASEPLATE_SIZE_STUDS },
    bricks: [
      {
        partId: 'brick-2x4',
        color: 'red',
        x: 0,
        y: 0,
        z: 0,
        rot: 0,
      },
    ],
  },
  gallery: {
    title: 'Cantilever test',
    description: 'A simple overhang build for gallery publishing.',
    visibility: 'public',
    author: {
      identityMode: 'anonymous',
      displayName: 'Guest Builder',
    },
    publishedAt: '2026-06-07T18:45:00.000Z',
    updatedAt: '2026-06-07T18:45:00.000Z',
  },
})

describe('validateSharedBuildPayload', () => {
  it('accepts a valid shared-build payload', () => {
    const payload = makePayload()

    expect(validateSharedBuildPayload(payload)).toEqual(payload)
  })

  it('rejects a payload whose nested build is invalid', () => {
    const payload = {
      ...makePayload(),
      build: {
        version: 1,
        baseplate: { size: BASEPLATE_SIZE_STUDS },
        bricks: [{ color: 'red' }],
      },
    }

    expect(() => validateSharedBuildPayload(payload)).toThrow()
  })

  it('rejects a blank gallery title', () => {
    const payload = {
      ...makePayload(),
      gallery: {
        ...makePayload().gallery,
        title: '   ',
      },
    }

    expect(() => validateSharedBuildPayload(payload)).toThrow()
  })

  it('rejects an invalid ISO timestamp', () => {
    const payload = {
      ...makePayload(),
      gallery: {
        ...makePayload().gallery,
        publishedAt: 'yesterday-ish',
      },
    }

    expect(() => validateSharedBuildPayload(payload)).toThrow()
  })

  it('rejects an invalid author identity mode', () => {
    const payload = {
      ...makePayload(),
      gallery: {
        ...makePayload().gallery,
        author: {
          identityMode: 'robot',
          displayName: 'Guest Builder',
        },
      },
    }

    expect(() => validateSharedBuildPayload(payload)).toThrow()
  })
})

describe('serializeSharedBuildPayload / parseSharedBuildPayload', () => {
  it('round-trips a shared-build payload through JSON without loss', () => {
    const payload = makePayload()

    expect(
      parseSharedBuildPayload(serializeSharedBuildPayload(payload)),
    ).toEqual(payload)
  })

  it('returns null for malformed JSON in safeParseSharedBuildPayload', () => {
    expect(safeParseSharedBuildPayload('not-json{')).toBeNull()
  })
})

describe('SNOT mount — gallery contract round-trip', () => {
  const makeV3Payload = (): SharedBuildPayload => ({
    ...makePayload(),
    build: {
      version: 3,
      baseplate: { size: BASEPLATE_SIZE_STUDS },
      bricks: [
        {
          partId: 'brick-1x1',
          color: 'red',
          x: 0,
          y: 0,
          z: 0,
          rot: 0,
          mount: 'px',
        },
      ],
    },
  })

  it('accepts a gallery payload with a v3/mount build', () => {
    const payload = makeV3Payload()
    expect(validateSharedBuildPayload(payload)).toEqual(payload)
  })

  it('round-trips a v3/mount payload through serialize → parse', () => {
    const payload = makeV3Payload()
    expect(
      parseSharedBuildPayload(serializeSharedBuildPayload(payload)),
    ).toEqual(payload)
  })

  it('returns null via safeParseSharedBuildPayload for a payload with an unknown mount', () => {
    const bad = JSON.stringify({
      ...makePayload(),
      build: {
        version: 3,
        baseplate: { size: BASEPLATE_SIZE_STUDS },
        bricks: [
          {
            partId: 'brick-1x1',
            color: 'red',
            x: 0,
            y: 0,
            z: 0,
            rot: 0,
            mount: 'bogus',
          },
        ],
      },
    })
    expect(safeParseSharedBuildPayload(bad)).toBeNull()
  })

  it('returns null via safeParseSharedBuildPayload for a payload with mount in a version 1 envelope', () => {
    const bad = JSON.stringify({
      ...makePayload(),
      build: {
        version: 1,
        baseplate: { size: BASEPLATE_SIZE_STUDS },
        bricks: [{ partId: 'brick-1x1', color: 'red', x: 0, y: 0, z: 0, rot: 0, mount: 'px' }],
      },
    })
    expect(safeParseSharedBuildPayload(bad)).toBeNull()
  })
})
