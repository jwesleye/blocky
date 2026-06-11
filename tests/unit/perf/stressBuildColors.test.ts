import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { COLOR_PALETTE } from '@/domain/parts/colors'

type StressBuildFixture = {
  bricks: Array<{
    color: string
  }>
}

const FIXTURE_PATHS = [
  join(process.cwd(), 'fixtures/stress-build-2k.json'),
  join(process.cwd(), 'fixtures/stress-build-5k.json'),
] as const

const SOURCE_PATHS = [
  join(process.cwd(), 'src/testing/stressBuild.ts'),
  join(process.cwd(), 'scripts/gen-stress-build.ts'),
  join(process.cwd(), 'tests/perf/render-perf.spec.ts'),
  join(process.cwd(), 'tests/perf/collapse-perf.spec.ts'),
] as const

describe('stress build color fixtures', () => {
  const paletteIds = new Set(COLOR_PALETTE.map((color) => color.id))

  it.each(FIXTURE_PATHS)('%s uses only palette-valid colors', (fixturePath) => {
    const fixture = JSON.parse(
      readFileSync(fixturePath, 'utf-8'),
    ) as StressBuildFixture

    for (const brick of fixture.bricks) {
      expect(
        paletteIds.has(brick.color),
        `${fixturePath} contains invalid color "${brick.color}"`,
      ).toBe(true)
    }
  })

  it.each(SOURCE_PATHS)('%s does not use the invalid gray literal', (sourcePath) => {
    const source = readFileSync(sourcePath, 'utf-8')

    expect(source).not.toMatch(/['"]gray['"]/)
  })
})
