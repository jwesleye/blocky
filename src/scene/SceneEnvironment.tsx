import {
  getSceneEnvironmentPreset,
  type SceneEnvironmentPresetId,
} from '@/scene/environmentPresets'
import { SHADOW_BIAS } from '@/scene/sceneConfig'

export interface SceneEnvironmentProps {
  presetId: SceneEnvironmentPresetId
}

export function SceneEnvironment({ presetId }: SceneEnvironmentProps) {
  const preset = getSceneEnvironmentPreset(presetId)

  return (
    <>
      <color attach="background" args={[preset.backgroundColor]} />
      <ambientLight intensity={preset.ambientIntensity} />
      <hemisphereLight
        intensity={preset.hemisphereIntensity}
        groundColor={preset.hemisphereGroundColor}
      />
      <directionalLight
        color={preset.keyLight.color}
        position={preset.keyLight.position}
        intensity={preset.keyLight.intensity}
        castShadow
        shadow-bias={SHADOW_BIAS}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
      />
      <directionalLight
        color={preset.fillLight.color}
        position={preset.fillLight.position}
        intensity={preset.fillLight.intensity}
      />
    </>
  )
}
