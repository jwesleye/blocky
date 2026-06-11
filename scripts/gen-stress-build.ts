/**
 * Generates deterministic stress-build fixtures for performance testing.
 *
 * Bricks are placed layer by layer in a grid pattern using 1×1 bricks.
 * The color is derived from (x + z + layer) % COLORS.length so that each
 * fixture is visually varied while remaining fully deterministic.
 *
 * Run: npx tsx scripts/gen-stress-build.ts
 */

import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { format } from 'prettier'

import { generateStressBuild } from '../src/testing/stressBuild.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = resolve(__dirname, '..', 'fixtures')
mkdirSync(outDir, { recursive: true })

const TARGETS: Array<{ count: number; label: string }> = [
  { count: 2000, label: '2k' },
  { count: 5000, label: '5k' },
]

for (const { count, label } of TARGETS) {
  const build = generateStressBuild(count)
  const outPath = resolve(outDir, `stress-build-${label}.json`)
  const formatted = await format(JSON.stringify(build), { parser: 'json' })
  writeFileSync(outPath, formatted)
  console.log(`wrote ${outPath} (${build.bricks.length} bricks)`)
}
