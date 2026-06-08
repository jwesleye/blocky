import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { generateBuildId, getBuild, listBuilds, storeBuild } from './store.js'
import {
  SHARED_BUILD_CONTRACT_VERSION,
  PublishRequestSchema,
} from './validation.js'
import type { SharedBuildPayload } from './validation.js'

const PORT = process.env['PORT'] ? parseInt(process.env['PORT']) : 4000

function sendJSON(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  })
  res.end(payload)
}

async function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

const server = createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    })
    res.end()
    return
  }

  const url = req.url ?? '/'

  if (req.method === 'POST' && url === '/builds') {
    let raw: string
    try {
      raw = await readBody(req)
    } catch {
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
      sendJSON(res, 422, { error: 'Invalid publish request', details: parsed.error.issues })
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

  const loadMatch = /^\/builds\/([^/]+)$/.exec(url)
  if (req.method === 'GET' && loadMatch) {
    const buildId = decodeURIComponent(loadMatch[1] ?? '')
    const payload = getBuild(buildId)
    if (!payload) {
      sendJSON(res, 404, { error: 'Build not found' })
      return
    }
    sendJSON(res, 200, payload)
    return
  }

  if (req.method === 'GET' && url === '/builds') {
    sendJSON(res, 200, { builds: listBuilds() })
    return
  }

  sendJSON(res, 404, { error: 'Not found' })
})

server.listen(PORT, () => {
  console.log(`Gallery backend listening on :${PORT}`)
})

export { server }
