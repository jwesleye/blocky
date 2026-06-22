import { findCollisions } from './src/domain/physics/transform.js'
import type { PlacedBrick } from './src/domain/model/types.js'
import { PartCatalog } from './src/domain/parts/catalog.js'

const PART_CATALOG: PartCatalog = {
  '3001': {
    id: '3001',
    name: 'Brick 2x4',
    width: 2,
    length: 4,
    height: 3,
    type: 'brick',
    geometry: { obj: '' },
    footprint: [],
  },
  '3003': {
    id: '3003',
    name: 'Brick 2x2',
    width: 2,
    length: 2,
    height: 3,
    type: 'brick',
    geometry: { obj: '' },
    footprint: [],
  },
}

function generateBricks(count: number): PlacedBrick[] {
  const bricks: PlacedBrick[] = []
  for (let i = 0; i < count; i++) {
    bricks.push({
      id: `brick-${i}`,
      partId: '3001',
      x: i % 10,
      y: Math.floor(i / 100) * 3,
      z: Math.floor(i / 10) % 10,
      rot: 0,
      color: '#ff0000',
    })
  }
  return bricks
}

const bricks = generateBricks(5000)

const start = performance.now()
for (let i = 0; i < 50; i++) {
  findCollisions(bricks, PART_CATALOG)
}
const end = performance.now()

console.log(`Baseline time: ${(end - start).toFixed(2)}ms`)
