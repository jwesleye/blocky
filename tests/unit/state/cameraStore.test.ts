import { describe, it, expect } from 'vitest'
import { useCameraStore } from '@/state/cameraStore'

describe('cameraStore', () => {
  it('starts with resetNonce 0 and increments on resetCamera', () => {
    expect(useCameraStore.getState().resetNonce).toBe(0)
    useCameraStore.getState().resetCamera()
    expect(useCameraStore.getState().resetNonce).toBe(1)
    useCameraStore.getState().resetCamera()
    expect(useCameraStore.getState().resetNonce).toBe(2)
  })
})
