import { useEffect, lazy, Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'

import { brickToBodySnapshot } from '@/domain/physics'
import { useBuildStore } from '@/state/store'
import { collapseDebug } from './collapseDebug'

const CollapseSimulation = lazy(() =>
  import('./CollapseSimulation').then((m) => ({ default: m.CollapseSimulation })),
)

/**
 * Renders the live build as static meshes and overlays the Rapier collapse
 * simulation while a collapse is in flight.
 *
 * Each brick is rendered in exactly one place: stable bricks live in the static
 * scene (they were never removed from the store), while sheared bricks live only
 * in the collapse simulation as dynamic bodies. This avoids both teleporting and
 * Z-fighting against a duplicated static copy.
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
      camera={{ fov: 50, near: 0.1, far: 1000, position: [30, 25, 30] }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[20, 40, 15]} intensity={1.1} castShadow />
      <OrbitControls
        makeDefault
        enableRotate
        enablePan
        enableZoom
        target={[0, 0, 0]}
      />
      {staticBodies.map((body) => (
        <mesh key={body.id} position={body.position} castShadow receiveShadow>
          <boxGeometry args={body.size} />
          <meshStandardMaterial color={body.color} />
        </mesh>
      ))}
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
