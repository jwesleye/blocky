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

function getAllowedOrigin(req: IncomingMessage): string | undefined {
  const requestOrigin = req.headers.origin
  if (!requestOrigin) return undefined

  const allowedOriginsEnv = process.env['ALLOWED_ORIGINS']
  if (!allowedOriginsEnv) return undefined

  const allowedOrigins = allowedOriginsEnv.split(',').map((o) => o.trim())
  if (allowedOrigins.includes(requestOrigin)) {
    return requestOrigin
  }
  return undefined
}

function sendJSON(
  req: IncomingMessage,
  res: ServerResponse,
  status: number,
  body: unknown,
): void {
  const payload = JSON.stringify(body)
  const origin = getAllowedOrigin(req)
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (origin) {
    headers['Access-Control-Allow-Origin'] = origin
    headers['Access-Control-Allow-Headers'] = 'Content-Type'
    headers['Access-Control-Allow-Methods'] = 'GET, POST, DELETE, OPTIONS'
    headers['Vary'] = 'Origin'
  }

  res.writeHead(status, headers)
  res.end(payload)
}

function sendBodyTooLarge(req: IncomingMessage, res: ServerResponse): void {
  res.once('finish', () => req.destroy())
  sendJSON(req, res, 413, { error: 'Request body too large' })
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
    const origin = getAllowedOrigin(req)
    const headers: Record<string, string> = {}

    if (origin) {
      headers['Access-Control-Allow-Origin'] = origin
      headers['Access-Control-Allow-Headers'] = 'Content-Type'
      headers['Access-Control-Allow-Methods'] = 'GET, POST, DELETE, OPTIONS'
      headers['Vary'] = 'Origin'
    }

    res.writeHead(204, headers)
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
      sendJSON(req, res, 400, { error: 'Failed to read request body' })
      return
    }

    let data: unknown
    try {
      data = JSON.parse(raw)
    } catch {
      sendJSON(req, res, 400, { error: 'Invalid JSON' })
      return
    }

    const parsed = PublishRequestSchema.safeParse(data)
    if (!parsed.success) {
      sendJSON(req, res, 422, {
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
    sendJSON(req, res, 201, payload)
    return
  }

  const buildIdMatch = /^\/builds\/([^/]+)$/.exec(url)

  if (req.method === 'GET' && buildIdMatch) {
    const buildId = decodeURIComponent(buildIdMatch[1] ?? '')
    if (isBuildDeleted(buildId)) {
      sendJSON(req, res, 410, { error: 'Build has been deleted' })
      return
    }
    const payload = getBuild(buildId)
    if (!payload) {
      sendJSON(req, res, 404, { error: 'Build not found' })
      return
    }
    sendJSON(req, res, 200, payload)
    return
  }

  if (req.method === 'DELETE' && buildIdMatch) {
    const buildId = decodeURIComponent(buildIdMatch[1] ?? '')
    const result = deleteBuild(buildId)
    if (!result.success) {
      if (result.reason === 'not-found') {
        sendJSON(req, res, 404, { error: 'Build not found' })
      } else {
        sendJSON(req, res, 403, {
          error: 'Deletion requires an authenticated principal',
        })
      }
      return
    }
    sendJSON(req, res, 200, { deleted: true })
    return
  }

  const reportsMatch = /^\/builds\/([^/]+)\/reports$/.exec(url)
  if (req.method === 'POST' && reportsMatch) {
    const buildId = decodeURIComponent(reportsMatch[1] ?? '')

    if (isBuildDeleted(buildId)) {
      sendJSON(req, res, 404, { error: 'Build not found' })
      return
    }
    const payload = getBuild(buildId)
    if (!payload) {
      sendJSON(req, res, 404, { error: 'Build not found' })
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
      sendJSON(req, res, 400, { error: 'Failed to read request body' })
      return
    }

    let data: unknown
    try {
      data = JSON.parse(raw)
    } catch {
      sendJSON(req, res, 400, { error: 'Invalid JSON' })
      return
    }

    const parsed = ReportRequestSchema.safeParse(data)
    if (!parsed.success) {
      sendJSON(req, res, 422, {
        error: 'Invalid report request',
        details: parsed.error.issues,
      })
      return
    }

    const payloadBefore = JSON.stringify(payload)
    addReport(buildId, parsed.data)
    const payloadAfter = JSON.stringify(getBuild(buildId))
    if (payloadBefore !== payloadAfter) {
      sendJSON(req, res, 500, { error: 'Internal error: payload mutated' })
      return
    }

    sendJSON(req, res, 201, { reported: true })
    return
  }

  if (req.method === 'GET' && url === '/builds') {
    sendJSON(req, res, 200, { builds: listDiscoverableBuilds() })
    return
  }

  sendJSON(req, res, 404, { error: 'Not found' })
}

const server = createServer(handler)

if (!process.env['VITEST']) {
  server.listen(PORT, () => {
    console.log(`Gallery backend listening on :${PORT}`)
  })
}

export { server }
