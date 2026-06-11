import { OrbitControls } from '@react-three/drei'
import { TOUCH } from 'three'
import { CAMERA_DEFAULT_TARGET } from './sceneConfig'

export function CameraControls() {
  return (
    <OrbitControls
      makeDefault
      enableRotate
      enablePan
      enableZoom
      target={CAMERA_DEFAULT_TARGET}
      touches={{ ONE: TOUCH.ROTATE, TWO: TOUCH.DOLLY_PAN }}
    />
  )
}
