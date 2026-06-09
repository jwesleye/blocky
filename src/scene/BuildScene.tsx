import { useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useBuildStore } from '@/state/store'
import { BrickMesh } from './BrickMesh'
import { CollapseSimulation } from './CollapseSimulation'
import { collapseDebug } from './collapseDebug'

export function BuildScene() {
  const bricksMap = useBuildStore((s) => s.bricks)
  const activeCollapse = useBuildStore((s) => s.activeCollapse)
  const completeCollapse = useBuildStore((s) => s.completeCollapse)
  const bricks = Object.values(bricksMap)

  useEffect(() => {
    collapseDebug.dynamicBodyCount = activeCollapse
      ? activeCollapse.collapsingBodies.length
      : 0
  }, [activeCollapse])

  return (
    <Canvas
      shadows
      camera={{ fov: 50, near: 0.1, far: 1000, position: [30, 25, 30] }}
      gl={{ preserveDrawingBuffer: true }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight castShadow position={[20, 40, 15]} intensity={1.1} />
      <OrbitControls
        makeDefault
        enableRotate
        enablePan
        enableZoom
        target={[0, 0, 0]}
      />
      {bricks.map((brick) => (
        <BrickMesh key={brick.id} brick={brick} />
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
