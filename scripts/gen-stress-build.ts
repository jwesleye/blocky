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

// Mirrors constants from src/domain/grid — kept inline so the script is
// self-contained and runnable outside the Vite module graph.
const BASEPLATE_SIZE_STUDS = 32
const BRICK_HEIGHT_PLATES = 3

interface SerializedBrick {
  partId: string
  color: string
  x: number
  y: number
  z: number
  rot: 0 | 1 | 2 | 3
}

interface Build {
  version: 1
  baseplate: { size: typeof BASEPLATE_SIZE_STUDS }
  bricks: SerializedBrick[]
}

const COLORS = [
  'red',
  'blue',
  'yellow',
  'green',
  'white',
  'black',
  'orange',
  'light-gray',
] as const

function generateStressBuild(count: number): Build {
  const bricks: SerializedBrick[] = []
  const cellsPerLayer = BASEPLATE_SIZE_STUDS * BASEPLATE_SIZE_STUDS

  let remaining = count
  let layer = 0

  while (remaining > 0) {
    const bricksThisLayer = Math.min(remaining, cellsPerLayer)
    for (let i = 0; i < bricksThisLayer; i++) {
      const x = i % BASEPLATE_SIZE_STUDS
      const z = Math.floor(i / BASEPLATE_SIZE_STUDS)
      const colorIndex = (x + z + layer) % COLORS.length
      bricks.push({
        partId: 'brick-1x1',
        color: COLORS[colorIndex],
        x,
        y: layer * BRICK_HEIGHT_PLATES,
        z,
        rot: 0,
      })
    }
    remaining -= bricksThisLayer
    layer++
  }

  return {
    version: 1,
    baseplate: { size: BASEPLATE_SIZE_STUDS },
    bricks,
  }
}

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
  writeFileSync(outPath, JSON.stringify(build))
  console.log(`wrote ${outPath} (${build.bricks.length} bricks)`)
}
