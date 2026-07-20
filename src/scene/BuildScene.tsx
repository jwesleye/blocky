import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import { Vector3, PerspectiveCamera } from 'three'

import type { GridCoord } from '@/domain/grid'
import { STUD, rotatedDimensions } from '@/domain/grid'
import { resolveBrickColorHex } from '@/domain/model/colors'
import type {
  BrickHinge,
  BrickMount,
  HalfStudOffset,
  PlacedBrick,
} from '@/domain/model/types'
import {
  CATALOG_BY_ID as PART_CATALOG,
  getPart,
  type PartType,
} from '@/domain/parts/catalog'
import { useShallow } from 'zustand/react/shallow'

import { isValidPlacement } from '@/domain/physics/validity'
import { useCursorStore } from '@/state/cursor'
import { useBuildStore } from '@/state/store'
import { CameraControls } from './CameraControls'
import { CameraRig } from './CameraRig'
import { collapseDebug } from './collapseDebug'
import {
  DEFAULT_SCENE_ENVIRONMENT_PRESET_ID,
  getSceneEnvironmentPreset,
  type SceneEnvironmentPresetId,
} from './environmentPresets'
import type { RenderBrick } from './instancing'
import { InstancedBricks } from './InstancedBricks'
import { mountRotation } from './mountRotation'
import { getPartGeometry } from './parts/geometries'
import { SceneEnvironment } from './SceneEnvironment'
import {
  ScreenshotCaptureBridge,
  type CaptureScreenshot,
} from './ScreenshotCaptureBridge'
import { CAMERA_DEFAULT_FOV, CAMERA_DEFAULT_POSITION } from './sceneConfig'

export type { CaptureScreenshot }

const CollapseSimulation = lazy(() =>
  import('./CollapseSimulation').then((m) => ({
    default: m.CollapseSimulation,
  })),
)

const shouldExposeTestHooks =
  import.meta.env.DEV || import.meta.env.MODE === 'e2e'
const DRAG_GESTURE_THRESHOLD_PX = 5

function toRenderPartType(partId: string): PartType | null {
  const part = getPart(partId)
  if (!part || part.category === 'baseplate') {
    return null
  }

  return part.category
}

function isWithinRenderedBaseplate(brick: PlacedBrick, baseplateSize: number) {
  const part = PART_CATALOG[brick.partId]
  if (!part) return false

  const [width, depth] = rotatedDimensions(part, brick.rot)
  const offsetX = (brick.offset?.x ?? 0) * 0.5
  const offsetZ = (brick.offset?.z ?? 0) * 0.5

  return (
    brick.x + offsetX >= 0 &&
    brick.z + offsetZ >= 0 &&
    brick.x + offsetX + width <= baseplateSize &&
    brick.z + offsetZ + depth <= baseplateSize
  )
}

function GhostBrickMesh({
  grid,
  valid,
  partId,
  rot,
  offset,
  mount,
  hinge,
}: {
  grid: GridCoord
  valid: boolean
  partId: string
  rot: 0 | 1 | 2 | 3
  offset?: HalfStudOffset
  mount?: BrickMount
  hinge?: BrickHinge
}) {
  const part = PART_CATALOG[partId]
  if (!part) return null

  const [width, depth] = rotatedDimensions(part, rot)
  const position: [number, number, number] = [
    grid.x + width / 2 + (offset?.x ?? 0) * 0.5,
    grid.y + part.height / 2,
    grid.z + depth / 2 + (offset?.z ?? 0) * 0.5,
  ]

  const [rx, , rz] = mountRotation(mount)

  return (
    <mesh
      name="ghost-brick"
      position={position}
      rotation={[rx, rot * (Math.PI / 2), rz]}
      raycast={() => null}
      scale={[0.97, 0.97, 0.97]}
    >
      <primitive
        object={getPartGeometry(partId, {
          w: part.width,
          h: part.height,
          d: part.length,
          hinge,
        })}
        attach="geometry"
      />
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
  color,
  onPointerPos,
  onPointerEnterEmpty,
}: {
  size: number
  color: string
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
      <meshStandardMaterial color={color} />
    </mesh>
  )
}

function ThreeDevExpose() {
  const { camera, gl, invalidate } = useThree()

  useEffect(() => {
    if (shouldExposeTestHooks) {
      if (camera instanceof PerspectiveCamera) {
        window.__blockyCamera = camera
      }
      window.__blockyInvalidateScene = invalidate
      window.__blockyProjectToCanvas = (worldX, worldY, worldZ) => {
        const point = new Vector3(worldX, worldY, worldZ).project(camera)
        const rect = gl.domElement.getBoundingClientRect()
        return {
          x: rect.left + ((point.x + 1) / 2) * rect.width,
          y: rect.top + ((-point.y + 1) / 2) * rect.height,
        }
      }
    }

    return () => {
      if (shouldExposeTestHooks) {
        delete window.__blockyCamera
        delete window.__blockyInvalidateScene
        delete window.__blockyProjectToCanvas
      }
    }
  }, [camera, gl, invalidate])

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

interface BuildSceneProps {
  presetId?: SceneEnvironmentPresetId
  onCaptureFnReady?: (fn: CaptureScreenshot) => void
}

export function BuildScene({
  presetId = DEFAULT_SCENE_ENVIRONMENT_PRESET_ID,
  onCaptureFnReady,
}: BuildSceneProps = {}) {
  const {
    bricks,
    baseplateSize,
    activeCollapse,
    completeCollapse,
    placeBrick,
    deleteBrick,
    recolorBrick,
  } = useBuildStore(
    useShallow((state) => ({
      bricks: state.bricks,
      baseplateSize: state.baseplateSize,
      activeCollapse: state.activeCollapse,
      completeCollapse: state.completeCollapse,
      placeBrick: state.placeBrick,
      deleteBrick: state.deleteBrick,
      recolorBrick: state.recolorBrick,
    })),
  )

  const {
    partId,
    colorId,
    rot,
    offset,
    mount,
    hinge,
    editingTool,
    sampleBrick,
    setHoveredBrickId,
  } = useCursorStore(
    useShallow((state) => ({
      partId: state.partId,
      colorId: state.colorId,
      rot: state.rot,
      offset: state.offset,
      mount: state.mount,
      hinge: state.hinge,
      editingTool: state.editingTool,
      sampleBrick: state.sampleBrick,
      setHoveredBrickId: state.setHoveredBrickId,
    })),
  )
  const [ghostGrid, setGhostGrid] = useState<GridCoord | null>(null)
  const gestureStartRef = useRef<{ x: number; y: number } | null>(null)
  const draggedSincePointerDownRef = useRef(false)
  const suppressNextPlaceRef = useRef(false)

  const stableOnCaptureFnReady = useCallback(
    (fn: CaptureScreenshot) => onCaptureFnReady?.(fn),
    [onCaptureFnReady],
  )

  useEffect(() => {
    collapseDebug.dynamicBodyCount = activeCollapse
      ? activeCollapse.collapsingBodies.length
      : 0
  }, [activeCollapse])

  useEffect(() => {
    if (shouldExposeTestHooks) {
      window.__blockyGhostGrid = ghostGrid
    }

    return () => {
      if (shouldExposeTestHooks) {
        delete window.__blockyGhostGrid
      }
    }
  }, [ghostGrid])

  const placedBricks = useMemo(() => Object.values(bricks), [bricks])
  const preset = getSceneEnvironmentPreset(presetId)
  const renderBricks = useMemo(
    () =>
      placedBricks.flatMap((brick) => {
        if (!isWithinRenderedBaseplate(brick, baseplateSize)) return []
        const partType = toRenderPartType(brick.partId)
        return partType ? [{ ...brick, partType }] : []
      }),
    [baseplateSize, placedBricks],
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
      mount,
      hinge,
    }
    return isValidPlacement(ghost, placedBricks, PART_CATALOG, baseplateSize)
  }, [
    baseplateSize,
    colorId,
    ghostGrid,
    partId,
    placedBricks,
    rot,
    offset,
    mount,
    hinge,
  ])

  const resetPlacementGesture = () => {
    gestureStartRef.current = null
    draggedSincePointerDownRef.current = false
  }

  const handleCanvasPointerDown = (event: {
    clientX?: number
    clientY?: number
  }) => {
    if (event.clientX === undefined || event.clientY === undefined) {
      gestureStartRef.current = null
      draggedSincePointerDownRef.current = false
      return
    }

    gestureStartRef.current = { x: event.clientX, y: event.clientY }
    draggedSincePointerDownRef.current = false
  }

  const handleCanvasPointerMove = (event: {
    clientX?: number
    clientY?: number
  }) => {
    if (draggedSincePointerDownRef.current) return
    if (event.clientX === undefined || event.clientY === undefined) return

    const start = gestureStartRef.current
    if (!start) return

    const deltaX = event.clientX - start.x
    const deltaY = event.clientY - start.y
    if (Math.hypot(deltaX, deltaY) > DRAG_GESTURE_THRESHOLD_PX) {
      draggedSincePointerDownRef.current = true
    }
  }

  const handlePlace = () => {
    const shouldSuppressPlace = suppressNextPlaceRef.current
    suppressNextPlaceRef.current = false
    const wasDragged = draggedSincePointerDownRef.current
    resetPlacementGesture()

    if (shouldSuppressPlace) return
    if (wasDragged) return
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
      mount,
      hinge,
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
      frameloop="demand"
      shadows
      camera={{
        fov: CAMERA_DEFAULT_FOV,
        near: 0.1,
        far: 1000,
        position: CAMERA_DEFAULT_POSITION,
      }}
      gl={{ preserveDrawingBuffer: true }}
      onClick={handlePlace}
      onPointerDown={handleCanvasPointerDown}
      onPointerMove={handleCanvasPointerMove}
      onPointerLeave={() => {
        resetPlacementGesture()
        setGhostGrid(null)
        setHoveredBrickId(null)
      }}
      tabIndex={0}
      style={{ outline: 'none' }}
    >
      <SceneEnvironment presetId={presetId} />
      <CameraRig />
      <CameraControls />
      <ThreeDevExpose />
      {onCaptureFnReady && (
        <ScreenshotCaptureBridge onReady={stableOnCaptureFnReady} />
      )}
      <Baseplate
        size={baseplateSize}
        color={preset.groundColor}
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
        getColor={(color) => resolveBrickColorHex(color)}
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
          if (editingTool === 'place' && event.pointerType === 'touch') {
            suppressNextPlaceRef.current = true
          }
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
          mount={mount}
          hinge={hinge}
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
