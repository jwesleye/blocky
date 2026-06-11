import { describe, expect, it } from 'vitest'
import { compressToEncodedURIComponent } from 'lz-string'

import {
  SHARE_URL_PARAM,
  createShareUrl,
  decodeShareToken,
  encodeBuildToShareToken,
  loadBuildFromShareSearch,
  readShareToken,
} from '@/domain/persistence/shareUrl'
import { BUILD_SCHEMA_VERSION } from '@/domain/model/build'
import type { Build } from '@/domain/model/build'
import { BASEPLATE_SIZE_STUDS } from '@/domain/grid'

const sampleBuild = (color = 'red'): Build => ({
  version: BUILD_SCHEMA_VERSION,
  baseplate: { size: BASEPLATE_SIZE_STUDS },
  bricks: [
    { partId: 'brick-2x4', color, x: 1, y: 0, z: 2, rot: 1 },
    { partId: 'brick-1x1', color: 'blue', x: 3, y: 1, z: 4, rot: 0 },
  ],
})

describe('encodeBuildToShareToken / decodeShareToken', () => {
  it('round-trips a valid build through a compressed token', () => {
    const build = sampleBuild()
    const token = encodeBuildToShareToken(build)
    expect(typeof token).toBe('string')
    expect(token.length).toBeGreaterThan(0)
    expect(decodeShareToken(token)).toEqual(build)
  })

  it('produces a compressed token, not raw JSON', () => {
    const token = encodeBuildToShareToken(sampleBuild())
    // The raw serialized build contains these keys; the compressed token must not.
    expect(token).not.toContain('partId')
    expect(token).not.toContain('baseplate')
    expect(token).not.toContain('{')
  })

  it('returns null for an empty or nullish token instead of throwing', () => {
    expect(decodeShareToken('')).toBeNull()
    expect(decodeShareToken(null)).toBeNull()
    expect(decodeShareToken(undefined)).toBeNull()
  })

  it('returns null for a token that is not decompressible', () => {
    expect(decodeShareToken('@@@not-a-valid-lz-token@@@')).toBeNull()
  })

  it('returns null when the decompressed payload is not valid JSON', () => {
    const token = compressToEncodedURIComponent('not json {')
    expect(decodeShareToken(token)).toBeNull()
  })

  it('returns null when the decompressed JSON fails Build schema validation', () => {
    const token = compressToEncodedURIComponent(
      JSON.stringify({ version: 1, bricks: 'nope' }),
    )
    expect(decodeShareToken(token)).toBeNull()
  })
})

describe('createShareUrl / readShareToken', () => {
  it('embeds the compressed token in the share-url query parameter', () => {
    const build = sampleBuild()
    const url = createShareUrl(build, 'https://example.com/app/')
    const parsed = new URL(url)
    const token = parsed.searchParams.get(SHARE_URL_PARAM)
    expect(token).not.toBeNull()
    expect(decodeShareToken(token as string)).toEqual(build)
  })

  it('does not embed raw build JSON in the URL', () => {
    const url = createShareUrl(sampleBuild(), 'https://example.com/app/')
    expect(url).not.toContain('partId')
    expect(url).not.toContain('baseplate')
  })

  it('extracts the token from a query string with or without a leading "?"', () => {
    const token = encodeBuildToShareToken(sampleBuild())
    const search = `?${SHARE_URL_PARAM}=${encodeURIComponent(token)}`
    expect(readShareToken(search)).toBe(token)
    expect(readShareToken(search.slice(1))).toBe(token)
  })

  it('returns null when the share parameter is absent', () => {
    expect(readShareToken('?other=1')).toBeNull()
    expect(readShareToken('')).toBeNull()
  })
})

describe('loadBuildFromShareSearch', () => {
  it('decodes a valid build from a full query string', () => {
    const build = sampleBuild('green')
    const url = createShareUrl(build, 'https://example.com/')
    const search = new URL(url).search
    expect(loadBuildFromShareSearch(search)).toEqual(build)
  })

  it('returns null for a query string with no share token', () => {
    expect(loadBuildFromShareSearch('?foo=bar')).toBeNull()
  })

  it('returns null for a malformed share token without throwing', () => {
    expect(
      loadBuildFromShareSearch(`?${SHARE_URL_PARAM}=not-decompressible`),
    ).toBeNull()
  })
})

describe('SNOT mount — share URL round-trip', () => {
  it('round-trips a v3 build with a mount brick through encode → decode', () => {
    const build: Build = {
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
    }
    const token = encodeBuildToShareToken(build)
    expect(decodeShareToken(token)).toEqual(build)
  })

  it('returns null for a token whose JSON carries an unknown mount value', () => {
    const bad = JSON.stringify({
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
    })
    const token = compressToEncodedURIComponent(bad)
    expect(decodeShareToken(token)).toBeNull()
  })

  it('returns null for a token carrying version 4 (unsupported future grammar)', () => {
    const bad = JSON.stringify({
      version: 4,
      baseplate: { size: BASEPLATE_SIZE_STUDS },
      bricks: [],
    })
    const token = compressToEncodedURIComponent(bad)
    expect(decodeShareToken(token)).toBeNull()
  })
})
