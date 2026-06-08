import React from 'react'
import { Toolbar } from './Toolbar'
import { BrickCount } from './BrickCount'

export const HUD: React.FC = () => {
  return (
    <div
      className="hud"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '1rem',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          pointerEvents: 'auto',
          display: 'flex',
          justifyContent: 'flex-end',
        }}
      >
        <BrickCount />
      </div>
      <div
        style={{
          pointerEvents: 'auto',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <Toolbar />
      </div>
    </div>
  )
}
