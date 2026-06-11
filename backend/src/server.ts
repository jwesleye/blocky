import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from 'node:http'
import {
  generateBuildId,
  getBuild,
  isBuildDeleted,
  listDiscoverableBuilds,
  storeBuild,
  deleteBuild,
  addReport,
} from './store.js'
import {
  SHARED_BUILD_CONTRACT_VERSION,
  PublishRequestSchema,
} from './validation.js'
import { ReportRequestSchema } from './moderation.js'
import type { SharedBuildPayload } from './validation.js'

const PORT = process.env['PORT'] ? parseInt(process.env['PORT']) : 4000

export const MAX_BODY_BYTES = 1_048_576

class BodyTooLargeError extends Error {
  constructor() {
    super('body-too-large')
  }
}

function isBodyTooLargeError(error: unknown): error is BodyTooLargeError {
  return error instanceof BodyTooLargeError
}

function sendJSON(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, x-user-id',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  })
  res.end(payload)
}

function sendBodyTooLarge(req: IncomingMessage, res: ServerResponse): void {
  res.once('finish', () => req.destroy())
  sendJSON(res, 413, { error: 'Request body too large' })
}

async function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let totalBytes = 0
    let bodyTooLarge = false

    req.on('data', (chunk: Buffer) => {
      if (bodyTooLarge) {
        return
      }
      totalBytes += chunk.byteLength
      if (totalBytes > MAX_BODY_BYTES) {
        bodyTooLarge = true
        req.pause()
        reject(new BodyTooLargeError())
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      if (!bodyTooLarge) {
        resolve(Buffer.concat(chunks).toString('utf8'))
      }
    })
    req.on('error', reject)
  })
}

export async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, x-user-id',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    })
    res.end()
    return
  }

  const url = req.url ?? '/'

  if (req.method === 'POST' && url === '/builds') {
    let raw: string
    try {
      raw = await readBody(req)
    } catch (error) {
      if (isBodyTooLargeError(error)) {
        sendBodyTooLarge(req, res)
        return
      }
      sendJSON(res, 400, { error: 'Failed to read request body' })
      return
    }

    let data: unknown
    try {
      data = JSON.parse(raw)
    } catch {
      sendJSON(res, 400, { error: 'Invalid JSON' })
      return
    }

    const parsed = PublishRequestSchema.safeParse(data)
    if (!parsed.success) {
      sendJSON(res, 422, {
        error: 'Invalid publish request',
        details: parsed.error.issues,
      })
      return
    }

    const now = new Date().toISOString()
    const buildId = generateBuildId()
    const payload: SharedBuildPayload = {
      contractVersion: SHARED_BUILD_CONTRACT_VERSION,
      buildId,
      build: parsed.data.build,
      gallery: {
        ...parsed.data.gallery,
        publishedAt: now,
        updatedAt: now,
      },
    }

    storeBuild(payload)
    sendJSON(res, 201, payload)
    return
  }

  const buildIdMatch = /^\/builds\/([^/]+)$/.exec(url)

  if (req.method === 'GET' && buildIdMatch) {
    const buildId = decodeURIComponent(buildIdMatch[1] ?? '')
    if (isBuildDeleted(buildId)) {
      sendJSON(res, 410, { error: 'Build has been deleted' })
      return
    }
    const payload = getBuild(buildId)
    if (!payload) {
      sendJSON(res, 404, { error: 'Build not found' })
      return
    }
    sendJSON(res, 200, payload)
    return
  }

  if (req.method === 'DELETE' && buildIdMatch) {
    const buildId = decodeURIComponent(buildIdMatch[1] ?? '')
    const userId = req.headers['x-user-id']
    if (!userId || Array.isArray(userId)) {
      sendJSON(res, 400, { error: 'x-user-id header required' })
      return
    }
    const result = deleteBuild(buildId, userId)
    if (!result.success) {
      if (result.reason === 'not-found') {
        sendJSON(res, 404, { error: 'Build not found' })
      } else {
        sendJSON(res, 403, { error: 'Unauthorized' })
      }
      return
    }
    sendJSON(res, 200, { deleted: true })
    return
  }

  const reportsMatch = /^\/builds\/([^/]+)\/reports$/.exec(url)
  if (req.method === 'POST' && reportsMatch) {
    const buildId = decodeURIComponent(reportsMatch[1] ?? '')

    if (isBuildDeleted(buildId)) {
      sendJSON(res, 404, { error: 'Build not found' })
      return
    }
    const payload = getBuild(buildId)
    if (!payload) {
      sendJSON(res, 404, { error: 'Build not found' })
      return
    }

    let raw: string
    try {
      raw = await readBody(req)
    } catch (error) {
      if (isBodyTooLargeError(error)) {
        sendBodyTooLarge(req, res)
        return
      }
      sendJSON(res, 400, { error: 'Failed to read request body' })
      return
    }

    let data: unknown
    try {
      data = JSON.parse(raw)
    } catch {
      sendJSON(res, 400, { error: 'Invalid JSON' })
      return
    }

    const parsed = ReportRequestSchema.safeParse(data)
    if (!parsed.success) {
      sendJSON(res, 422, {
        error: 'Invalid report request',
        details: parsed.error.issues,
      })
      return
    }

    const payloadBefore = JSON.stringify(payload)
    addReport(buildId, parsed.data)
    const payloadAfter = JSON.stringify(getBuild(buildId))
    if (payloadBefore !== payloadAfter) {
      sendJSON(res, 500, { error: 'Internal error: payload mutated' })
      return
    }

    sendJSON(res, 201, { reported: true })
    return
  }

  if (req.method === 'GET' && url === '/builds') {
    sendJSON(res, 200, { builds: listDiscoverableBuilds() })
    return
  }

  sendJSON(res, 404, { error: 'Not found' })
}

const server = createServer(handler)

if (!process.env['VITEST']) {
  server.listen(PORT, () => {
    console.log(`Gallery backend listening on :${PORT}`)
  })
}

export { server }
