import { useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'

import { brickToBodySnapshot } from '@/domain/physics'
import { useBuildStore } from '@/state/store'
import { CollapseSimulation } from './CollapseSimulation'
import { collapseDebug } from './collapseDebug'
import { CameraRig } from './CameraRig'
import { Lighting } from './Lighting'
import {
  CAMERA_DEFAULT_POSITION,
  CAMERA_DEFAULT_TARGET,
  CAMERA_DEFAULT_FOV,
  BACKGROUND_COLOR,
} from './sceneConfig'

/**
 * Renders the live build as static meshes and overlays the Rapier collapse
 * simulation while a collapse is in flight.
 */
export function Scene() {
  const bricks = useBuildStore((state) => state.bricks)
  const activeCollapse = useBuildStore((state) => state.activeCollapse)
  const completeCollapse = useBuildStore((state) => state.completeCollapse)

  // Keep the dev-only debug counter in sync so the e2e smoke test can observe a
  // dynamic body during the animation (WebGL bodies are not DOM-queryable).
  useEffect(() => {
    collapseDebug.dynamicBodyCount = activeCollapse
      ? activeCollapse.collapsingBodies.length
      : 0
  }, [activeCollapse])

  const staticBodies = Object.values(bricks).map((brick) =>
    brickToBodySnapshot(brick),
  )

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
      {staticBodies.map((body) => (
        <mesh key={body.id} position={body.position} castShadow receiveShadow>
          <boxGeometry args={body.size} />
          <meshStandardMaterial color={body.color} />
        </mesh>
      ))}
      {activeCollapse && (
        <CollapseSimulation
          transaction={activeCollapse}
          onComplete={completeCollapse}
        />
      )}
    </Canvas>
  )
}

export default Scene
