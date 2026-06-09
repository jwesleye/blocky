import React, { useEffect } from 'react'
import { useCameraStore } from '@/state/cameraStore'

export const RESET_VIEW_KEY = 'r'

export const ViewControls: React.FC = () => {
  const resetCamera = useCameraStore((state) => state.resetCamera)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Guard: ignore if modifier keys are pressed
      if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) {
        return
      }

      // Guard: ignore if focus is in an input or textarea
      const target = event.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return
      }

      if (event.key === RESET_VIEW_KEY) {
        resetCamera()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [resetCamera])

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '20px',
        left: '20px',
        zIndex: 1000,
        display: 'flex',
        gap: '10px',
      }}
    >
      <button
        onClick={resetCamera}
        style={{
          padding: '8px 16px',
          backgroundColor: '#444',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: 'bold',
          boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
        }}
        title={`Reset View (${RESET_VIEW_KEY.toUpperCase()})`}
      >
        Reset View
      </button>
    </div>
  )
}
