export const BASEPLATE_SIZE_STUDS = 32
export const BRICK_HEIGHT_PLATES = 3

export const STRESS_BUILD_COLORS = [
  'red',
  'blue',
  'yellow',
  'green',
  'white',
  'black',
  'orange',
  'light-gray',
] as const

export interface StressBuildSerializedBrick {
  partId: string
  color: string
  x: number
  y: number
  z: number
  rot: 0 | 1 | 2 | 3
}

export interface StressBuildPlacedBrick extends StressBuildSerializedBrick {
  id: string
}

export interface StressBuild {
  version: 1
  baseplate: { size: typeof BASEPLATE_SIZE_STUDS }
  bricks: StressBuildSerializedBrick[]
}

export function generateStressBuildBricks(
  count: number,
): StressBuildSerializedBrick[] {
  const bricks: StressBuildSerializedBrick[] = []
  const cellsPerLayer = BASEPLATE_SIZE_STUDS * BASEPLATE_SIZE_STUDS

  let remaining = count
  let layer = 0

  while (remaining > 0) {
    const bricksThisLayer = Math.min(remaining, cellsPerLayer)
    for (let i = 0; i < bricksThisLayer; i++) {
      const x = i % BASEPLATE_SIZE_STUDS
      const z = Math.floor(i / BASEPLATE_SIZE_STUDS)
      const colorIndex = (x + z + layer) % STRESS_BUILD_COLORS.length
      bricks.push({
        partId: 'brick-1x1',
        color: STRESS_BUILD_COLORS[colorIndex],
        x,
        y: layer * BRICK_HEIGHT_PLATES,
        z,
        rot: 0,
      })
    }
    remaining -= bricksThisLayer
    layer++
  }

  return bricks
}

export function generateStressBuildPlacedBricks(
  count: number,
): StressBuildPlacedBrick[] {
  return generateStressBuildBricks(count).map((brick, index) => ({
    id: `perf-${Math.floor(index / (BASEPLATE_SIZE_STUDS * BASEPLATE_SIZE_STUDS))}-${index % (BASEPLATE_SIZE_STUDS * BASEPLATE_SIZE_STUDS)}`,
    ...brick,
  }))
}

export function generateStressBuild(count: number): StressBuild {
  return {
    version: 1,
    baseplate: { size: BASEPLATE_SIZE_STUDS },
    bricks: generateStressBuildBricks(count),
  }
}
