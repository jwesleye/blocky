import { useEffect, useRef } from 'react'
import { OrbitControls } from '@react-three/drei'
import { TOUCH } from 'three'
import { CAMERA_DEFAULT_TARGET } from './sceneConfig'

export function CameraControls() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ref = useRef<any>(null)

  useEffect(() => {
    const controls = ref.current
    if (!controls) return
    // Explicit touch mapping: one-finger = orbit, two-finger = dolly-pan.
    controls.touches = { ONE: TOUCH.ROTATE, TWO: TOUCH.DOLLY_PAN }
  }, [])

  return (
    <OrbitControls
      ref={ref}
      makeDefault
      enableRotate
      enablePan
      enableZoom
      target={CAMERA_DEFAULT_TARGET}
    />
  )
}
