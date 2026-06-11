import { contrastRatio } from '@/lib/contrast'

export interface SceneLight {
  color: string
  intensity: number
  position: [number, number, number]
}

export interface SceneEnvironmentPreset {
  id: string
  name: string
  backgroundColor: string
  groundColor: string
  hemisphereGroundColor: string
  ambientIntensity: number
  hemisphereIntensity: number
  keyLight: SceneLight
  fillLight: SceneLight
}

export const SCENE_ENVIRONMENT_PRESETS = [
  {
    id: 'studio',
    name: 'Studio',
    backgroundColor: '#2b2f36',
    groundColor: '#5a7a5a',
    hemisphereGroundColor: '#20251f',
    ambientIntensity: 0.55,
    hemisphereIntensity: 0.42,
    keyLight: {
      color: '#ffffff',
      intensity: 1.05,
      position: [10, 20, 10],
    },
    fillLight: {
      color: '#d7e9ff',
      intensity: 0.38,
      position: [-18, 12, -10],
    },
  },
  {
    id: 'daylight',
    name: 'Daylight',
    backgroundColor: '#c7d9e8',
    groundColor: '#748d69',
    hemisphereGroundColor: '#6a7a60',
    ambientIntensity: 0.72,
    hemisphereIntensity: 0.62,
    keyLight: {
      color: '#fff4dd',
      intensity: 1.15,
      position: [16, 24, 8],
    },
    fillLight: {
      color: '#cce6ff',
      intensity: 0.32,
      position: [-20, 10, 14],
    },
  },
  {
    id: 'night',
    name: 'Night',
    backgroundColor: '#111827',
    groundColor: '#394456',
    hemisphereGroundColor: '#121826',
    ambientIntensity: 0.5,
    hemisphereIntensity: 0.36,
    keyLight: {
      color: '#c9ddff',
      intensity: 1.18,
      position: [-12, 22, 12],
    },
    fillLight: {
      color: '#ffd9b0',
      intensity: 0.28,
      position: [18, 10, -16],
    },
  },
] as const satisfies readonly SceneEnvironmentPreset[]

export type SceneEnvironmentPresetId =
  (typeof SCENE_ENVIRONMENT_PRESETS)[number]['id']

export const DEFAULT_SCENE_ENVIRONMENT_PRESET_ID: SceneEnvironmentPresetId =
  'studio'

const PRESET_IDS = new Set<string>(
  SCENE_ENVIRONMENT_PRESETS.map((preset) => preset.id),
)

export const isSceneEnvironmentPresetId = (
  id: string,
): id is SceneEnvironmentPresetId => PRESET_IDS.has(id)

export const getSceneEnvironmentPreset = (
  id: string,
): SceneEnvironmentPreset => {
  return (
    SCENE_ENVIRONMENT_PRESETS.find((preset) => preset.id === id) ??
    SCENE_ENVIRONMENT_PRESETS.find(
      (preset) => preset.id === DEFAULT_SCENE_ENVIRONMENT_PRESET_ID,
    ) ??
    SCENE_ENVIRONMENT_PRESETS[0]
  )
}

const MIN_SURFACE_CONTRAST = 1.35

export const isReadableBrickColorOnPreset = (
  brickHex: string,
  preset: SceneEnvironmentPreset,
): boolean => {
  return (
    Math.max(
      contrastRatio(brickHex, preset.backgroundColor),
      contrastRatio(brickHex, preset.groundColor),
    ) >= MIN_SURFACE_CONTRAST
  )
}
