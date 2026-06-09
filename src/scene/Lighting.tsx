import React from 'react'
import {
  AMBIENT_INTENSITY,
  DIRECTIONAL_INTENSITY,
  DIRECTIONAL_POSITION,
  HEMISPHERE_INTENSITY,
  SHADOW_BIAS,
} from './sceneConfig'

export const Lighting: React.FC = () => {
  return (
    <>
      <ambientLight intensity={AMBIENT_INTENSITY} />
      <hemisphereLight intensity={HEMISPHERE_INTENSITY} groundColor="#000000" />
      <directionalLight
        position={DIRECTIONAL_POSITION}
        intensity={DIRECTIONAL_INTENSITY}
        castShadow
        shadow-bias={SHADOW_BIAS}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
      />
    </>
  )
}
