import ReactThreeTestRenderer from '@react-three/test-renderer'
import { describe, expect, it } from 'vitest'
import { SceneEnvironment } from '@/scene/SceneEnvironment'
import { getSceneEnvironmentPreset } from '@/scene/environmentPresets'
import { SHADOW_BIAS } from '@/scene/sceneConfig'

describe('SceneEnvironment', () => {
  it('renders the correct number of lights', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <SceneEnvironment presetId="studio" />
    )

    const root = renderer.scene

    const ambientLights = root.findAllByType('AmbientLight')
    expect(ambientLights).toHaveLength(1)

    const hemisphereLights = root.findAllByType('HemisphereLight')
    expect(hemisphereLights).toHaveLength(1)

    const directionalLights = root.findAllByType('DirectionalLight')
    expect(directionalLights).toHaveLength(2)

    await renderer.unmount()
  })

  it('uses the specified preset and maps the preset values correctly', async () => {
    const preset = getSceneEnvironmentPreset('studio')

    const renderer = await ReactThreeTestRenderer.create(
      <SceneEnvironment presetId="studio" />
    )

    const root = renderer.scene

    const ambientLight = root.findByType('AmbientLight')
    expect(ambientLight.props.intensity).toBe(preset.ambientIntensity)

    const hemisphereLight = root.findByType('HemisphereLight')
    expect(hemisphereLight.props.intensity).toBe(preset.hemisphereIntensity)
    expect(hemisphereLight.props.groundColor).toBe(preset.hemisphereGroundColor)

    const directionalLights = root.findAllByType('DirectionalLight')
    const keyLight = directionalLights[0]
    expect(keyLight.props.color).toBe(preset.keyLight.color)
    expect(keyLight.props.position).toEqual(preset.keyLight.position)
    expect(keyLight.props.intensity).toBe(preset.keyLight.intensity)

    const fillLight = directionalLights[1]
    expect(fillLight.props.color).toBe(preset.fillLight.color)
    expect(fillLight.props.position).toEqual(preset.fillLight.position)
    expect(fillLight.props.intensity).toBe(preset.fillLight.intensity)

    await renderer.unmount()
  })

  it('falls back to a default if an unknown preset is passed', async () => {
    const preset = getSceneEnvironmentPreset('unknown-preset')

    const renderer = await ReactThreeTestRenderer.create(
      // @ts-expect-error testing invalid input
      <SceneEnvironment presetId="unknown-preset" />
    )

    const root = renderer.scene

    const ambientLight = root.findByType('AmbientLight')
    expect(ambientLight.props.intensity).toBe(preset.ambientIntensity)

    await renderer.unmount()
  })

  it('configures shadows on the key light', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <SceneEnvironment presetId="studio" />
    )

    const root = renderer.scene
    const directionalLights = root.findAllByType('DirectionalLight')
    const keyLight = directionalLights[0]

    expect(keyLight.props.castShadow).toBe(true)
    expect(keyLight.props['shadow-bias']).toBe(SHADOW_BIAS)
    expect(keyLight.props['shadow-mapSize-width']).toBe(1024)
    expect(keyLight.props['shadow-mapSize-height']).toBe(1024)
    expect(keyLight.props['shadow-camera-left']).toBe(-50)
    expect(keyLight.props['shadow-camera-right']).toBe(50)
    expect(keyLight.props['shadow-camera-top']).toBe(50)
    expect(keyLight.props['shadow-camera-bottom']).toBe(-50)

    await renderer.unmount()
  })
})
