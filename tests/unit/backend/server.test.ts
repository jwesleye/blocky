import { mkdtempSync, rmSync } from 'node:fs'
import { createServer } from 'node:http'
import type { Server } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  describe,
  expect,
  it,
} from 'vitest'
import { handler, MAX_BODY_BYTES } from '../../../backend/src/server'
import {
  clearStore,
  getReports,
  reloadStore,
  storeBuild,
  generateBuildId,
} from '../../../backend/src/store'
import { SHARED_BUILD_CONTRACT_VERSION } from '../../../backend/src/validation'
import type { SharedBuildPayload } from '../../../backend/src/validation'

let srv: Server
let port: number

function req(path: string, options: RequestInit = {}): Promise<Response> {
  return fetch(`http://127.0.0.1:${port}${path}`, options)
}

const validBuild = {
  version: 1 as const,
  baseplate: { size: 32 as const },
  bricks: [],
}

const validGallery = {
  title: 'Test Build',
  visibility: 'public' as const,
  author: { identityMode: 'anonymous' as const },
}

function makeAuthored(userId: string): SharedBuildPayload {
  const buildId = generateBuildId()
  return {
    contractVersion: SHARED_BUILD_CONTRACT_VERSION,
    buildId,
    build: validBuild,
    gallery: {
      title: 'Owned Build',
      visibility: 'public',
      author: { identityMode: 'authenticated', userId, displayName: 'User' },
      publishedAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  }
}

function makeAnonymous(): SharedBuildPayload {
  const buildId = generateBuildId()
  return {
    contractVersion: SHARED_BUILD_CONTRACT_VERSION,
    buildId,
    build: validBuild,
    gallery: {
      title: 'Anonymous Build',
      visibility: 'public',
      author: { identityMode: 'anonymous' },
      publishedAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  }
}

function makeUnlisted(): SharedBuildPayload {
  const buildId = generateBuildId()
  return {
    contractVersion: SHARED_BUILD_CONTRACT_VERSION,
    buildId,
    build: validBuild,
    gallery: {
      title: 'Unlisted Build',
      visibility: 'unlisted',
      author: { identityMode: 'anonymous' },
      publishedAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  }
}

beforeAll(async () => {
  srv = createServer((req, res) => void handler(req, res))
  await new Promise<void>((resolve) => {
    srv.listen(0, '127.0.0.1', () => {
      port = (srv.address() as { port: number }).port
      resolve()
    })
  })
})

afterAll(async () => {
  await new Promise<void>((resolve) => srv.close(() => resolve()))
})

beforeEach(() => {
  process.env['GALLERY_DATA_DIR'] = mkdtempSync(
    join(tmpdir(), 'blocky-gallery-server-test-'),
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

describe('CORS', () => {
  const originalEnv = process.env['ALLOWED_ORIGINS']

  beforeEach(() => {
    process.env['ALLOWED_ORIGINS'] =
      'https://allowed.example.com, https://another.example.com'
  })

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env['ALLOWED_ORIGINS']
    } else {
      process.env['ALLOWED_ORIGINS'] = originalEnv
    }
  })

  it('sets Access-Control-Allow-Origin for allowed origins on OPTIONS', async () => {
    const res = await req('/builds', {
      method: 'OPTIONS',
      headers: { Origin: 'https://allowed.example.com' },
    })
    expect(res.status).toBe(204)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(
      'https://allowed.example.com',
    )
    expect(res.headers.get('Vary')).toBe('Origin')
    expect(res.headers.get('Access-Control-Allow-Methods')).toBe(
      'GET, POST, DELETE, OPTIONS',
    )
  })

  it('omits Access-Control-Allow-Origin for unallowed origins on OPTIONS', async () => {
    const res = await req('/builds', {
      method: 'OPTIONS',
      headers: { Origin: 'https://hacker.example.com' },
    })
    expect(res.status).toBe(204)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull()
  })

  it('sets Access-Control-Allow-Origin for allowed origins on GET', async () => {
    const res = await req('/builds', {
      method: 'GET',
      headers: { Origin: 'https://another.example.com' },
    })
    expect(res.status).toBe(200)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(
      'https://another.example.com',
    )
    expect(res.headers.get('Vary')).toBe('Origin')
  })

  it('omits Access-Control-Allow-Origin when ALLOWED_ORIGINS is not set', async () => {
    delete process.env['ALLOWED_ORIGINS']
    const res = await req('/builds', {
      method: 'GET',
      headers: { Origin: 'https://allowed.example.com' },
    })
    expect(res.status).toBe(200)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull()
  })
})

describe('POST /builds — publish', () => {
  it('returns 201 with the stored payload on valid request', async () => {
    const requestBody = JSON.stringify({
      build: validBuild,
      gallery: validGallery,
    })
    expect(Buffer.byteLength(requestBody, 'utf8')).toBeLessThanOrEqual(
      MAX_BODY_BYTES,
    )

    const res = await req('/builds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: requestBody,
    })
    expect(res.status).toBe(201)
    const body = (await res.json()) as SharedBuildPayload
    expect(body.buildId).toBeTruthy()
    expect(body.gallery.title).toBe('Test Build')
  })

  it('returns 413 when the request body exceeds the byte cap', async () => {
    const res = await req('/builds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'x'.repeat(MAX_BODY_BYTES + 1),
    })
    expect(res.status).toBe(413)
  })

  it('returns 422 for invalid publish payload', async () => {
    const res = await req('/builds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ build: validBuild, gallery: { title: '' } }),
    })
    expect(res.status).toBe(422)
  })

  it('returns 422 when baseplate size is invalid', async () => {
    const res = await req('/builds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        build: { ...validBuild, baseplate: { size: 24 } },
        gallery: validGallery,
      }),
    })
    expect(res.status).toBe(422)
  })

  it('keeps a published build loadable after the store reloads', async () => {
    const res = await req('/builds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        build: validBuild,
        gallery: validGallery,
      }),
    })

    expect(res.status).toBe(201)
    const published = (await res.json()) as SharedBuildPayload

    reloadStore()

    const getRes = await req(`/builds/${published.buildId}`)
    expect(getRes.status).toBe(200)
    const reloaded = (await getRes.json()) as SharedBuildPayload
    expect(reloaded).toEqual(published)
  })
})

describe('GET /builds/:id — load', () => {
  it('returns 200 with payload for an existing build', async () => {
    const payload = makeAnonymous()
    storeBuild(payload)

    const res = await req(`/builds/${payload.buildId}`)
    expect(res.status).toBe(200)
    const body = (await res.json()) as SharedBuildPayload
    expect(body.buildId).toBe(payload.buildId)
  })

  it('returns 404 for an unknown build id', async () => {
    const res = await req('/builds/nonexistent')
    expect(res.status).toBe(404)
  })

  it('returns 200 after a forged delete attempt leaves the build intact', async () => {
    const payload = makeAuthored('user1')
    storeBuild(payload)

    const deleteRes = await req(`/builds/${payload.buildId}`, {
      method: 'DELETE',
      headers: { 'x-user-id': 'user1' },
    })
    expect(deleteRes.status).toBe(403)

    const res = await req(`/builds/${payload.buildId}`)
    expect(res.status).toBe(200)
  })

  it('keeps a forged-delete target loadable after the store reloads', async () => {
    const payload = makeAuthored('user1')
    storeBuild(payload)

    const deleteRes = await req(`/builds/${payload.buildId}`, {
      method: 'DELETE',
      headers: { 'x-user-id': 'user1' },
    })
    expect(deleteRes.status).toBe(403)

    reloadStore()

    const res = await req(`/builds/${payload.buildId}`)
    expect(res.status).toBe(200)
  })
})

describe('GET /builds — list', () => {
  it('keeps builds listed when header-only deletion is rejected', async () => {
    const kept = makeAnonymous()
    const blockedDelete = makeAuthored('owner1')
    storeBuild(kept)
    storeBuild(blockedDelete)

    const deleteRes = await req(`/builds/${blockedDelete.buildId}`, {
      method: 'DELETE',
      headers: { 'x-user-id': 'owner1' },
    })
    expect(deleteRes.status).toBe(403)

    const res = await req('/builds')
    const body = (await res.json()) as { builds: SharedBuildPayload[] }
    const ids = body.builds.map((b) => b.buildId)
    expect(ids).toContain(kept.buildId)
    expect(ids).toContain(blockedDelete.buildId)
  })

  it('still lists the build after a rejected delete and store reload', async () => {
    const kept = makeAnonymous()
    const blockedDelete = makeAuthored('owner1')
    storeBuild(kept)
    storeBuild(blockedDelete)

    const deleteRes = await req(`/builds/${blockedDelete.buildId}`, {
      method: 'DELETE',
      headers: { 'x-user-id': 'owner1' },
    })
    expect(deleteRes.status).toBe(403)

    reloadStore()

    const res = await req('/builds')
    const body = (await res.json()) as { builds: SharedBuildPayload[] }
    const ids = body.builds.map((b) => b.buildId)
    expect(ids).toContain(kept.buildId)
    expect(ids).toContain(blockedDelete.buildId)
  })

  it('hides unlisted builds from the listing but keeps them loadable by id', async () => {
    const publicBuild = makeAnonymous()
    const unlisted = makeUnlisted()
    storeBuild(publicBuild)
    storeBuild(unlisted)

    const listRes = await req('/builds')
    const body = (await listRes.json()) as { builds: SharedBuildPayload[] }
    const ids = body.builds.map((b) => b.buildId)
    expect(ids).toContain(publicBuild.buildId)
    expect(ids).not.toContain(unlisted.buildId)

    const directRes = await req(`/builds/${unlisted.buildId}`)
    expect(directRes.status).toBe(200)
    const fetched = (await directRes.json()) as SharedBuildPayload
    expect(fetched.buildId).toBe(unlisted.buildId)
  })
})

describe('DELETE /builds/:id — delete', () => {
  it('returns 403 when a forged header matches the authenticated owner', async () => {
    const payload = makeAuthored('owner1')
    storeBuild(payload)

    const res = await req(`/builds/${payload.buildId}`, {
      method: 'DELETE',
      headers: { 'x-user-id': 'owner1' },
    })
    expect(res.status).toBe(403)

    const getRes = await req(`/builds/${payload.buildId}`)
    expect(getRes.status).toBe(200)
  })

  it('returns 403 when a different forged user attempts deletion', async () => {
    const payload = makeAuthored('owner1')
    storeBuild(payload)

    const res = await req(`/builds/${payload.buildId}`, {
      method: 'DELETE',
      headers: { 'x-user-id': 'other_user' },
    })
    expect(res.status).toBe(403)
  })

  it('returns 403 for an anonymous-authored build', async () => {
    const payload = makeAnonymous()
    storeBuild(payload)

    const res = await req(`/builds/${payload.buildId}`, {
      method: 'DELETE',
    })
    expect(res.status).toBe(403)
  })

  it('returns 404 for an unknown build id', async () => {
    const res = await req('/builds/nonexistent', {
      method: 'DELETE',
    })
    expect(res.status).toBe(404)
  })

  it('returns 403 when delete is attempted without an authenticated principal header', async () => {
    const payload = makeAuthored('owner1')
    storeBuild(payload)

    const res = await req(`/builds/${payload.buildId}`, {
      method: 'DELETE',
    })
    expect(res.status).toBe(403)
  })
})

describe('POST /builds/:id/reports — report', () => {
  it('returns 201 on a valid report', async () => {
    const payload = makeAnonymous()
    storeBuild(payload)

    const res = await req(`/builds/${payload.buildId}/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'spam' }),
    })
    expect(res.status).toBe(201)
  })

  it('returns 422 for invalid report payload', async () => {
    const payload = makeAnonymous()
    storeBuild(payload)

    const res = await req(`/builds/${payload.buildId}/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'not-a-valid-reason' }),
    })
    expect(res.status).toBe(422)
  })

  it('returns 422 for oversized details', async () => {
    const payload = makeAnonymous()
    storeBuild(payload)

    const res = await req(`/builds/${payload.buildId}/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'other', details: 'x'.repeat(2001) }),
    })
    expect(res.status).toBe(422)
  })

  it('returns 413 when the report request body exceeds the byte cap', async () => {
    const payload = makeAnonymous()
    storeBuild(payload)

    const res = await req(`/builds/${payload.buildId}/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'x'.repeat(MAX_BODY_BYTES + 1),
    })
    expect(res.status).toBe(413)
  })

  it('returns 404 for an unknown build id', async () => {
    const res = await req('/builds/nonexistent/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'spam' }),
    })
    expect(res.status).toBe(404)
  })

  it('does not mutate the stored SharedBuildPayload after a report', async () => {
    const payload = makeAnonymous()
    storeBuild(payload)
    const payloadBefore = JSON.stringify(payload)

    await req(`/builds/${payload.buildId}/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'spam' }),
    })

    const getRes = await req(`/builds/${payload.buildId}`)
    const fetched = (await getRes.json()) as unknown
    expect(JSON.stringify(fetched)).toBe(payloadBefore)
  })

  it('persists reports across a store reload without mutating the build payload', async () => {
    const payload = makeAnonymous()
    storeBuild(payload)
    const payloadBefore = JSON.stringify(payload)

    const reportRes = await req(`/builds/${payload.buildId}/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'spam' }),
    })
    expect(reportRes.status).toBe(201)

    reloadStore()

    expect(getReports(payload.buildId)).toHaveLength(1)
    expect(getReports(payload.buildId)[0]?.reason).toBe('spam')

    const getRes = await req(`/builds/${payload.buildId}`)
    const fetched = (await getRes.json()) as unknown
    expect(JSON.stringify(fetched)).toBe(payloadBefore)
  })
})
