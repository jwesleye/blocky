import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { useCameraStore } from '@/state/cameraStore'
import { CAMERA_DEFAULT_POSITION, CAMERA_DEFAULT_TARGET } from './sceneConfig'

export const CameraRig = () => {
  const { camera, controls } = useThree()
  const resetNonce = useCameraStore((state) => state.resetNonce)

  useEffect(() => {
    camera.position.set(...CAMERA_DEFAULT_POSITION)

    if (controls) {
      const orbitControls = controls as unknown as OrbitControlsImpl
      orbitControls.target.set(...CAMERA_DEFAULT_TARGET)
      orbitControls.update()
    }

    camera.lookAt(...CAMERA_DEFAULT_TARGET)
    camera.updateProjectionMatrix()
  }, [resetNonce, camera, controls])

  return null
}
