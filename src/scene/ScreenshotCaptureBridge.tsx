import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { SCREENSHOT_MIME_TYPE } from '@/lib/screenshotExport'

export type CaptureScreenshot = () => Promise<Blob>

interface Props {
  onReady: (fn: CaptureScreenshot) => void
}

export function ScreenshotCaptureBridge({ onReady }: Props) {
  const { gl, scene, camera } = useThree()

  useEffect(() => {
    const capture: CaptureScreenshot = () =>
      new Promise<Blob>((resolve, reject) => {
        gl.render(scene, camera)
        gl.domElement.toBlob(
          (blob) => {
            if (!blob || blob.size === 0) {
              reject(new Error('Screenshot capture returned an empty blob'))
              return
            }
            resolve(blob)
          },
          SCREENSHOT_MIME_TYPE,
        )
      })

    onReady(capture)
  }, [gl, scene, camera, onReady])

  return null
}
