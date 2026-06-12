import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const MAIN_PATH = join(process.cwd(), 'src/main.tsx')

describe('src/main.tsx test hook bootstrap', () => {
  it('loads the render perf harness exactly once', () => {
    const source = readFileSync(MAIN_PATH, 'utf-8')
    const matches = source.match(/import\('\.\/testing\/renderPerfHarness'\)/g)

    expect(matches).toHaveLength(1)
  })
})
