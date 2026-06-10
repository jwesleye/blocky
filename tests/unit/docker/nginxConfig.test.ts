/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const NGINX_CONFIG_PATH = join(process.cwd(), 'docker/nginx.conf')

const SECURITY_HEADERS = [
  'add_header X-Content-Type-Options "nosniff" always;',
  'add_header X-Frame-Options "DENY" always;',
  'add_header Referrer-Policy "strict-origin-when-cross-origin" always;',
] as const

const nginxConfig = (): string => readFileSync(NGINX_CONFIG_PATH, 'utf-8')

const getAssetsBlock = (config: string): string => {
  const match = config.match(/location \/assets\/ \{[\s\S]*?\n {2}\}/)
  expect(match, 'location /assets/ block not found').not.toBeNull()
  return match![0]
}

describe('docker/nginx.conf — security-header drift guard (issue #58)', () => {
  it('defines the required security headers with always at server scope', () => {
    const config = nginxConfig()

    for (const header of SECURITY_HEADERS) {
      expect(config).toContain(header)
    }
  })

  it('keeps immutable asset caching and repeats the security headers in /assets/', () => {
    const assetsBlock = getAssetsBlock(nginxConfig())

    expect(assetsBlock).toContain('add_header Cache-Control "public, immutable";')

    for (const header of SECURITY_HEADERS) {
      expect(assetsBlock).toContain(header)
    }
  })
})
