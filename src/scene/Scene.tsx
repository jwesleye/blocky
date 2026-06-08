import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'

/**
 * Full-viewport React Three Fiber scene.
 *
 * A perspective camera (FOV 50, near 0.1 / far 1000) starts at
 * `[30, 25, 30]` looking at the origin, framing the ~32-unit build grid
 * comfortably so the first brick can be placed without navigating. drei's
 * `OrbitControls` (made the default camera controls) provides left-drag
 * orbit, right-drag pan, and scroll zoom.
 */
export function Scene() {
  return (
    <Canvas
      shadows
      camera={{ fov: 50, near: 0.1, far: 1000, position: [30, 25, 30] }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight castShadow position={[20, 30, 10]} intensity={1.2} />
      <OrbitControls
        makeDefault
        enableRotate
        enablePan
        enableZoom
        target={[0, 0, 0]}
      />
    </Canvas>
  )
}
