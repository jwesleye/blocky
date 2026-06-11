import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import { Vector3, type PerspectiveCamera } from 'three'

import type { GridCoord } from '@/domain/grid'
import { STUD, rotatedDimensions } from '@/domain/grid'
import { getBrickColor } from '@/domain/model/colors'
import type { PlacedBrick, HalfStudOffset } from '@/domain/model/types'
import {
  CATALOG_BY_ID as PART_CATALOG,
  getPart,
  type PartType,
} from '@/domain/parts/catalog'
import { isValidPlacement } from '@/domain/physics/validity'
import { useCursorStore } from '@/state/cursor'
import { useBuildStore } from '@/state/store'
import { CameraControls } from './CameraControls'
import { CameraRig } from './CameraRig'
import { collapseDebug } from './collapseDebug'
import type { RenderBrick } from './instancing'
import { InstancedBricks } from './InstancedBricks'
import { Lighting } from './Lighting'
import {
  BACKGROUND_COLOR,
  CAMERA_DEFAULT_FOV,
  CAMERA_DEFAULT_POSITION,
} from './sceneConfig'

const CollapseSimulation = lazy(() =>
  import('./CollapseSimulation').then((m) => ({
    default: m.CollapseSimulation,
  })),
)

function toRenderPartType(partId: string): PartType | null {
  const part = getPart(partId)
  if (!part || part.category === 'baseplate') {
    return null
  }

  return part.category
}

function GhostBrickMesh({
  grid,
  valid,
  partId,
  rot,
  offset,
}: {
  grid: GridCoord
  valid: boolean
  partId: string
  rot: 0 | 1 | 2 | 3
  offset?: HalfStudOffset
}) {
  const part = PART_CATALOG[partId]
  if (!part) return null

  const [width, depth] = rotatedDimensions(part, rot)
  const position: [number, number, number] = [
    grid.x + width / 2 + (offset?.x ?? 0) * 0.5,
    grid.y + part.height / 2,
    grid.z + depth / 2 + (offset?.z ?? 0) * 0.5,
  ]

  return (
    <mesh position={position} raycast={() => null}>
      <boxGeometry args={[width * 0.97, part.height * 0.97, depth * 0.97]} />
      <meshStandardMaterial
        color={valid ? '#00ee55' : '#ff3333'}
        transparent
        opacity={0.45}
        depthWrite={false}
      />
    </mesh>
  )
}

function Baseplate({
  size,
  onPointerPos,
  onPointerEnterEmpty,
}: {
  size: number
  onPointerPos: (pos: GridCoord) => void
  onPointerEnterEmpty: () => void
}) {
  const sceneSize = size * STUD

  const updateGhost = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()
    onPointerEnterEmpty()
    onPointerPos({
      x: Math.round(event.point.x / STUD),
      y: 0,
      z: Math.round(event.point.z / STUD),
    })
  }

  return (
    <mesh
      position={[sceneSize / 2, 0, sceneSize / 2]}
      rotation={[-Math.PI / 2, 0, 0]}
      receiveShadow
      onPointerMove={updateGhost}
      onPointerDown={updateGhost}
    >
      <planeGeometry args={[sceneSize, sceneSize]} />
      <meshStandardMaterial color="#5a7a5a" />
    </mesh>
  )
}

function ThreeDevExpose() {
  const { camera, gl } = useThree()

  useEffect(() => {
    if (import.meta.env.DEV) {
      window.__blockyCamera = camera as PerspectiveCamera
      window.__blockyProjectToCanvas = (worldX, worldY, worldZ) => {
        const point = new Vector3(worldX, worldY, worldZ).project(
          camera as PerspectiveCamera,
        )
        const rect = gl.domElement.getBoundingClientRect()
        return {
          x: rect.left + ((point.x + 1) / 2) * rect.width,
          y: rect.top + ((-point.y + 1) / 2) * rect.height,
        }
      }
    }

    return () => {
      if (import.meta.env.DEV) {
        delete window.__blockyProjectToCanvas
      }
    }
  }, [camera, gl])

  return null
}

function brickPointerToGhostGrid(
  brick: RenderBrick,
  event: ThreeEvent<PointerEvent>,
): GridCoord | null {
  const part = PART_CATALOG[brick.partId]
  if (!part) return null

  const normal = event.face?.normal
  if ((normal?.y ?? 0) > 0.9) {
    return {
      x: Math.round(event.point.x / STUD),
      y: brick.y + part.height,
      z: Math.round(event.point.z / STUD),
    }
  }

  const offsetX = event.point.x + (normal?.x ?? 0) * STUD * 0.5
  const offsetZ = event.point.z + (normal?.z ?? 0) * STUD * 0.5
  return {
    x: Math.round(offsetX / STUD),
    y: brick.y,
    z: Math.round(offsetZ / STUD),
  }
}

/**
 * Renders the live build as static meshes, overlays the ghost placement cursor,
 * and runs the Rapier collapse simulation while a collapse is in flight.
 */
export function BuildScene() {
  const bricks = useBuildStore((state) => state.bricks)
  const baseplateSize = useBuildStore((state) => state.baseplateSize)
  const activeCollapse = useBuildStore((state) => state.activeCollapse)
  const completeCollapse = useBuildStore((state) => state.completeCollapse)
  const placeBrick = useBuildStore((state) => state.placeBrick)
  const deleteBrick = useBuildStore((state) => state.deleteBrick)
  const recolorBrick = useBuildStore((state) => state.recolorBrick)
  const partId = useCursorStore((state) => state.partId)
  const colorId = useCursorStore((state) => state.colorId)
  const rot = useCursorStore((state) => state.rot)
  const offset = useCursorStore((state) => state.offset)
  const editingTool = useCursorStore((state) => state.editingTool)
  const sampleBrick = useCursorStore((state) => state.sampleBrick)
  const setHoveredBrickId = useCursorStore((state) => state.setHoveredBrickId)
  const [ghostGrid, setGhostGrid] = useState<GridCoord | null>(null)

  useEffect(() => {
    collapseDebug.dynamicBodyCount = activeCollapse
      ? activeCollapse.collapsingBodies.length
      : 0
  }, [activeCollapse])

  const placedBricks = useMemo(() => Object.values(bricks), [bricks])
  const renderBricks = useMemo(
    () =>
      placedBricks.flatMap((brick) => {
        const partType = toRenderPartType(brick.partId)
        return partType ? [{ ...brick, partType }] : []
      }),
    [placedBricks],
  )
  const ghostValid = useMemo(() => {
    if (!ghostGrid) return false
    const ghost: PlacedBrick = {
      id: '__ghost__',
      partId,
      color: colorId,
      x: ghostGrid.x,
      y: ghostGrid.y,
      z: ghostGrid.z,
      rot,
      offset,
    }
    return isValidPlacement(ghost, placedBricks, PART_CATALOG, baseplateSize)
  }, [baseplateSize, colorId, ghostGrid, partId, placedBricks, rot, offset])

  const handlePlace = () => {
    if (editingTool !== 'place') return
    if (!ghostGrid || !ghostValid) return
    placeBrick({
      partId,
      color: colorId,
      x: ghostGrid.x,
      y: ghostGrid.y,
      z: ghostGrid.z,
      rot,
      offset,
    })
  }

  const handleBrickClick = (brickId: string) => {
    if (editingTool === 'place') return

    if (editingTool === 'paint') {
      recolorBrick(brickId, colorId)
      return
    }

    if (editingTool === 'eyedropper') {
      const brick = bricks[brickId]
      if (brick) sampleBrick(brick)
    }
  }

  return (
    <Canvas
      shadows
      camera={{
        fov: CAMERA_DEFAULT_FOV,
        near: 0.1,
        far: 1000,
        position: CAMERA_DEFAULT_POSITION,
      }}
      gl={{ preserveDrawingBuffer: true }}
      onClick={handlePlace}
      onPointerLeave={() => {
        setGhostGrid(null)
        setHoveredBrickId(null)
      }}
      tabIndex={0}
      style={{ outline: 'none' }}
    >
      <color attach="background" args={[BACKGROUND_COLOR]} />
      <Lighting />
      <CameraRig />
      <CameraControls />
      <ThreeDevExpose />
      <Baseplate
        size={baseplateSize}
        onPointerPos={setGhostGrid}
        onPointerEnterEmpty={() => setHoveredBrickId(null)}
      />
      <InstancedBricks
        bricks={renderBricks}
        getDims={(partId) => {
          const part = PART_CATALOG[partId]
          if (!part) {
            throw new Error(`unknown partId "${partId}"`)
          }

          return {
            w: part.width,
            d: part.length,
            h: part.height,
          }
        }}
        getColor={(color) => getBrickColor(color)?.hex ?? color}
        onInstanceClick={(brick, event) => {
          event.stopPropagation()
          if (brick.id) {
            handleBrickClick(brick.id)
          }
        }}
        onInstancePointerMove={(brick, event) => {
          event.stopPropagation()
          if (brick.id) setHoveredBrickId(brick.id)
          const grid = brickPointerToGhostGrid(brick, event)
          if (grid) setGhostGrid(grid)
        }}
        onInstancePointerDown={(brick, event) => {
          event.stopPropagation()
          if (brick.id) setHoveredBrickId(brick.id)
          const grid = brickPointerToGhostGrid(brick, event)
          if (grid) setGhostGrid(grid)
        }}
        onInstanceContextMenu={(brick, event) => {
          event.stopPropagation()
          if (brick.id) {
            deleteBrick(brick.id)
          }
        }}
      />
      {ghostGrid && (
        <GhostBrickMesh
          grid={ghostGrid}
          valid={ghostValid}
          partId={partId}
          rot={rot}
          offset={offset}
        />
      )}
      {activeCollapse && (
        <Suspense fallback={null}>
          <CollapseSimulation
            transaction={activeCollapse}
            onComplete={completeCollapse}
          />
        </Suspense>
      )}
    </Canvas>
  )
}

export default BuildScene
