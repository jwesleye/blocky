import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useBuildStore } from '@/state/store'
import { BrickMesh } from './BrickMesh'

export function BuildScene() {
  const bricksMap = useBuildStore((s) => s.bricks)
  const bricks = Object.values(bricksMap)

  return (
    <Canvas
      shadows
      camera={{ fov: 50, near: 0.1, far: 2000, position: [32, 80, 140] }}
      gl={{ preserveDrawingBuffer: true }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight castShadow position={[20, 30, 10]} intensity={1.2} />
      <OrbitControls
        makeDefault
        enableRotate
        enablePan
        enableZoom
        target={[32, 5, 16]}
      />
      {bricks.map((brick) => (
        <BrickMesh key={brick.id} brick={brick} />
      ))}
    </Canvas>
  )
}
