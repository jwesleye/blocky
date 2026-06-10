import React from 'react'
import { useCameraStore } from '@/state/cameraStore'

export const RESET_VIEW_KEY = 'Home'

export const ViewControls: React.FC = () => {
  const resetCamera = useCameraStore((state) => state.resetCamera)

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
        title={`Reset View (${RESET_VIEW_KEY})`}
      >
        Reset View
      </button>
    </div>
  )
}
