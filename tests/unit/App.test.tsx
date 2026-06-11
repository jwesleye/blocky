import { describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'

// jsdom has no WebGL context, so mock the r3f <Canvas> (see Scene.test.tsx).
vi.mock('@react-three/fiber', () => ({
  Canvas: () => <canvas data-testid="scene-canvas" />,
}))

vi.mock('@/scene/Scene', () => ({
  Scene: () => <canvas data-testid="interactive-scene" />,
}))

import { App } from '@/App'

describe('App', () => {
  it('mounts the interactive scene inside the app shell', () => {
    const { getByTestId } = render(<App />)
    expect(getByTestId('interactive-scene')).toBeTruthy()
  })

  it('mirror controls have a labeled group and accessible button names', () => {
    const { getByRole } = render(<App />)
    expect(
      getByRole('group', { name: 'Mirror selection' }),
    ).toBeInTheDocument()
    expect(
      getByRole('button', { name: 'Mirror along X axis' }),
    ).toBeInTheDocument()
    expect(
      getByRole('button', { name: 'Mirror along Z axis' }),
    ).toBeInTheDocument()
  })
})
