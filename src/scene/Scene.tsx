import { useEffect, useState, useMemo, lazy, Suspense } from 'react'
import { Canvas, type ThreeEvent } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'

import { useBuildStore } from '@/state/store'
import { useCursorStore } from '@/state/cursor'
import { getBrickColor } from '@/domain/model/colors'
import { BASEPLATE_SIZE_STUDS, STUD_PITCH_MM, PLATE_HEIGHT_MM, type GridPosition } from '@/domain/grid'
import { PART_CATALOG } from '@/domain/parts/catalog'
import { canPlaceBrick } from '@/domain/physics/placement'
import { findCollisions } from '@/domain/physics/transform'
import { brickToSceneTransform } from './brickTransform'
import { snapHitToGridCell } from './raycastSnap'
import { GhostBrick } from './GhostBrick'
import { collapseDebug } from './collapseDebug'
import { CameraRig } from './CameraRig'
import { Lighting } from './Lighting'
import {
  CAMERA_DEFAULT_POSITION,
  CAMERA_DEFAULT_TARGET,
  CAMERA_DEFAULT_FOV,
  BACKGROUND_COLOR,
} from './sceneConfig'

const CollapseSimulation = lazy(() =>
  import('./CollapseSimulation').then((m) => ({
    default: m.CollapseSimulation,
  })),
)

const baseplateLength = BASEPLATE_SIZE_STUDS * STUD_PITCH_MM
const baseplateThickness = 2 // mm

/**
 * Renders the live build as static meshes and overlays the Rapier collapse
 * simulation while a collapse is in flight.
 */
export function Scene() {
  const bricks = useBuildStore((state) => state.bricks)
  const placeBrick = useBuildStore((state) => state.placeBrick)
  const deleteBrick = useBuildStore((state) => state.deleteBrick)
  const activeCollapse = useBuildStore((state) => state.activeCollapse)
  const completeCollapse = useBuildStore((state) => state.completeCollapse)

  const cursorBrick = useCursorStore((state) => state.cursorBrick)
  const rotateCursor = useCursorStore((state) => state.rotate)

  const [candidateCell, setCandidateCell] = useState<GridPosition | null>(null)

  // Keep the dev-only debug counter in sync so the e2e smoke test can observe a
  // dynamic body during the animation (WebGL bodies are not DOM-queryable).
  useEffect(() => {
    collapseDebug.dynamicBodyCount = activeCollapse
      ? activeCollapse.collapsingBodies.length
      : 0
  }, [activeCollapse])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'r' || e.key === 'R') {
        rotateCursor()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [rotateCursor])

  const staticBodies = Object.values(bricks).map((brick) => {
    const transform = brickToSceneTransform(brick)
    return {
      id: brick.id,
      position: transform.position,
      size: transform.size,
      color: getBrickColor(brick.color)?.hex ?? brick.color,
    }
  })

  const candidate = useMemo(() => {
    if (!candidateCell) return null
    return {
      id: 'ghost',
      partId: cursorBrick.partId,
      color: cursorBrick.colorId,
      rot: cursorBrick.rot,
      x: candidateCell.x,
      y: candidateCell.y,
      z: candidateCell.z,
    }
  }, [candidateCell, cursorBrick])

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    if (e.face && e.face.normal.y < 0.9) {
      setCandidateCell(null)
      return
    }
    const faceY = Math.round(e.point.y / PLATE_HEIGHT_MM)
    const cell = snapHitToGridCell({ point: e.point, faceY })
    setCandidateCell(cell)
  }

  const handlePointerOut = () => {
    setCandidateCell(null)
  }

  const handlePlace = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (candidate) {
      const existing = Object.values(useBuildStore.getState().bricks)
      const isValid =
        canPlaceBrick(candidate, existing, PART_CATALOG) &&
        findCollisions([candidate, ...existing], PART_CATALOG).size === 0

      if (isValid) {
        placeBrick({
          partId: candidate.partId,
          color: candidate.color,
          rot: candidate.rot,
          x: candidate.x,
          y: candidate.y,
          z: candidate.z,
        })
        useBuildStore.getState().triggerCollapse()
      }
    }
  }

  const handleDelete = (e: ThreeEvent<MouseEvent>, id: string) => {
    e.stopPropagation()
    deleteBrick(id)
    useBuildStore.getState().triggerCollapse()
    setCandidateCell(null)
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
      
      <group onPointerMove={handlePointerMove} onPointerOut={handlePointerOut} onClick={handlePlace}>
        <mesh
          receiveShadow
          position={[baseplateLength / 2, -baseplateThickness / 2, baseplateLength / 2]}
        >
          <boxGeometry args={[baseplateLength, baseplateThickness, baseplateLength]} />
          <meshStandardMaterial color="#4caf50" />
        </mesh>
        {staticBodies.map((body) => (
          <mesh
            key={body.id}
            position={body.position}
            castShadow
            receiveShadow
            onClick={(e) => handleDelete(e, body.id)}
          >
            <boxGeometry args={body.size} />
            <meshStandardMaterial color={body.color} />
          </mesh>
        ))}
      </group>

      <GhostBrick candidate={candidate} />

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
