import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { useCameraStore } from '@/state/cameraStore'
import { CAMERA_DEFAULT_POSITION, CAMERA_DEFAULT_TARGET } from './sceneConfig'

export const CameraRig = () => {
  const { camera, controls } = useThree()
  const resetNonce = useCameraStore((state) => state.resetNonce)

  useEffect(() => {
    // We only want to trigger this on resetNonce CHANGE, but excluding the first mount
    // if we want to honor the initial position. However, since Scene.tsx will also use
    // these defaults for the initial camera state, it should be fine to run on mount.

    camera.position.set(...CAMERA_DEFAULT_POSITION)

    if (controls) {
      const orbitControls = controls as unknown as OrbitControlsImpl
      orbitControls.target.set(...CAMERA_DEFAULT_TARGET)
      orbitControls.update()
    }

    // Explicitly update camera projection matrix just in case FOV was changed elsewhere,
    // though fov is usually handled by the PerspectiveCamera component props.
    camera.lookAt(...CAMERA_DEFAULT_TARGET)
    camera.updateProjectionMatrix()
  }, [resetNonce, camera, controls])

  return null
}
