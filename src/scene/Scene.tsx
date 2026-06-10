import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'

import type { GridCoord } from '@/domain/grid'
import { STUD, rotatedDimensions } from '@/domain/grid'
import { getBrickColor } from '@/domain/model/colors'
import type { PlacedBrick, HalfStudOffset } from '@/domain/model/types'
import { CATALOG_BY_ID as PART_CATALOG } from '@/domain/parts/catalog'
import { isValidPlacement } from '@/domain/physics/validity'
import { useCursorStore } from '@/state/cursor'
import { useBuildStore } from '@/state/store'
import { CameraRig } from './CameraRig'
import { collapseDebug } from './collapseDebug'
import { InstancedBricks } from './InstancedBricks'
import { Lighting } from './Lighting'
import {
  BACKGROUND_COLOR,
  CAMERA_DEFAULT_FOV,
  CAMERA_DEFAULT_POSITION,
  CAMERA_DEFAULT_TARGET,
} from './sceneConfig'

const CollapseSimulation = lazy(() =>
  import('./CollapseSimulation').then((m) => ({
    default: m.CollapseSimulation,
  })),
)

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
  onPointerMove,
}: {
  size: number
  onPointerMove: (pos: GridCoord) => void
}) {
  const sceneSize = size * STUD

  return (
    <mesh
      position={[sceneSize / 2, 0, sceneSize / 2]}
      rotation={[-Math.PI / 2, 0, 0]}
      receiveShadow
      onPointerMove={(event) => {
        event.stopPropagation()
        onPointerMove({
          x: Math.round(event.point.x / STUD),
          y: 0,
          z: Math.round(event.point.z / STUD),
        })
      }}
    >
      <planeGeometry args={[sceneSize, sceneSize]} />
      <meshStandardMaterial color="#5a7a5a" />
    </mesh>
  )
}

/**
 * Renders the live build as static meshes, overlays the ghost placement cursor,
 * and runs the Rapier collapse simulation while a collapse is in flight.
 */
export function Scene() {
  const bricks = useBuildStore((state) => state.bricks)
  const baseplateSize = useBuildStore((state) => state.baseplateSize)
  const activeCollapse = useBuildStore((state) => state.activeCollapse)
  const completeCollapse = useBuildStore((state) => state.completeCollapse)
  const placeBrick = useBuildStore((state) => state.placeBrick)
  const deleteBrick = useBuildStore((state) => state.deleteBrick)
  const partId = useCursorStore((state) => state.partId)
  const colorId = useCursorStore((state) => state.colorId)
  const rot = useCursorStore((state) => state.rot)
  const offset = useCursorStore((state) => state.offset)
  const rotate = useCursorStore((state) => state.rotate)
  const [ghostGrid, setGhostGrid] = useState<GridCoord | null>(null)

  useEffect(() => {
    collapseDebug.dynamicBodyCount = activeCollapse
      ? activeCollapse.collapsingBodies.length
      : 0
  }, [activeCollapse])

  const placedBricks = useMemo(() => Object.values(bricks), [bricks])
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
      onPointerLeave={() => setGhostGrid(null)}
      onKeyDown={(event) => {
        if (event.key === 'r' || event.key === 'R') rotate()
      }}
      tabIndex={0}
      style={{ outline: 'none' }}
    >
      <color attach="background" args={[BACKGROUND_COLOR]} />
      <Lighting />
      <CameraRig />
      <OrbitControls
        makeDefault
        enableRotate
        enablePan
        enableZoom
        target={CAMERA_DEFAULT_TARGET}
      />
      <Baseplate size={baseplateSize} onPointerMove={setGhostGrid} />
      <InstancedBricks
        bricks={placedBricks}
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
        onInstancePointerMove={(brick, event) => {
          event.stopPropagation()
          const part = PART_CATALOG[brick.partId]
          if (!part) return

          const normal = event.face?.normal
          if ((normal?.y ?? 0) > 0.9) {
            setGhostGrid({
              x: Math.round(event.point.x / STUD),
              y: brick.y + part.height,
              z: Math.round(event.point.z / STUD),
            })
            return
          }

          const offsetX = event.point.x + (normal?.x ?? 0) * STUD * 0.5
          const offsetZ = event.point.z + (normal?.z ?? 0) * STUD * 0.5
          setGhostGrid({
            x: Math.round(offsetX / STUD),
            y: brick.y,
            z: Math.round(offsetZ / STUD),
          })
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

export default Scene
