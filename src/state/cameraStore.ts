import { create } from 'zustand'

interface CameraState {
  resetNonce: number
  resetCamera: () => void
}

export const useCameraStore = create<CameraState>()((set) => ({
  resetNonce: 0,
  resetCamera: () => set((state) => ({ resetNonce: state.resetNonce + 1 })),
}))
