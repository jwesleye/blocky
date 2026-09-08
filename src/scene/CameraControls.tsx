import { OrbitControls } from '@react-three/drei'
import { TOUCH } from 'three'
import { useCursorStore } from '@/state/cursor'
import { CAMERA_DEFAULT_TARGET } from './sceneConfig'

export function CameraControls() {
  const isSelecting = useCursorStore((state) => state.editingTool === 'select')
  return (
    <OrbitControls
      makeDefault
      enableRotate={!isSelecting}
      enablePan
      enableZoom
      target={CAMERA_DEFAULT_TARGET}
      touches={{ ONE: TOUCH.ROTATE, TWO: TOUCH.DOLLY_PAN }}
    />
  )
}
