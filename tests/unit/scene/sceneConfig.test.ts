import { describe, it, expect } from 'vitest'
import * as sceneConfig from '@/scene/sceneConfig'

describe('sceneConfig', () => {
  it('defines the #37 camera defaults', () => {
    expect(sceneConfig.CAMERA_DEFAULT_POSITION).toEqual([30, 25, 30])
    expect(sceneConfig.CAMERA_DEFAULT_TARGET).toEqual([0, 0, 0])
    expect(sceneConfig.CAMERA_DEFAULT_FOV).toBe(50)
  })

  it('defines the scene shadow bias', () => {
    expect(sceneConfig.SHADOW_BIAS).toBeLessThan(0)
  })
})
