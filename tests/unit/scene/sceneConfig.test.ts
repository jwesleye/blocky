import { describe, it, expect } from 'vitest'
import * as sceneConfig from '@/scene/sceneConfig'

describe('sceneConfig', () => {
  it('defines the #37 camera defaults', () => {
    expect(sceneConfig.CAMERA_DEFAULT_POSITION).toEqual([30, 25, 30])
    expect(sceneConfig.CAMERA_DEFAULT_TARGET).toEqual([0, 0, 0])
    expect(sceneConfig.CAMERA_DEFAULT_FOV).toBe(50)
  })

  it('defines sane lighting and background constants', () => {
    expect(sceneConfig.BACKGROUND_COLOR).toBeDefined()
    expect(sceneConfig.BACKGROUND_COLOR).not.toBe('#000000')
    expect(sceneConfig.BACKGROUND_COLOR).not.toBe('black')

    expect(sceneConfig.AMBIENT_INTENSITY).toBeGreaterThan(0)
    expect(sceneConfig.AMBIENT_INTENSITY).toBeLessThanOrEqual(1)

    expect(sceneConfig.DIRECTIONAL_INTENSITY).toBeGreaterThan(0)
    expect(sceneConfig.DIRECTIONAL_INTENSITY).toBeLessThanOrEqual(1.5)

    expect(sceneConfig.SHADOW_BIAS).toBeLessThan(0)
  })
})
