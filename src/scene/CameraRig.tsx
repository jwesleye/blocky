import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { useCameraStore } from '@/state/cameraStore';
import { CAMERA_DEFAULT_POSITION, CAMERA_DEFAULT_TARGET } from './sceneConfig';

export const CameraRig = () => {
  const { camera, controls } = useThree();
  const resetNonce = useCameraStore((state) => state.resetNonce);

  useEffect(() => {
    // We only want to trigger this on resetNonce CHANGE, but excluding the first mount
    // if we want to honor the initial position. However, since Scene.tsx will also use
    // these defaults for the initial camera state, it should be fine to run on mount.
    
    camera.position.set(...CAMERA_DEFAULT_POSITION);
    
    if (controls) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(controls as any).target.set(...CAMERA_DEFAULT_TARGET)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(controls as any).update()
    }
    
    // Explicitly update camera projection matrix just in case FOV was changed elsewhere,
    // though fov is usually handled by the PerspectiveCamera component props.
    camera.lookAt(...CAMERA_DEFAULT_TARGET);
    camera.updateProjectionMatrix();
  }, [resetNonce, camera, controls]);

  return null;
};
