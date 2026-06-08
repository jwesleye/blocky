import { describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'

// jsdom has no WebGL context, so mock the r3f <Canvas> (see Scene.test.tsx).
vi.mock('@react-three/fiber', () => ({
  Canvas: () => <canvas data-testid="scene-canvas" />,
}))

import { App } from '@/App'

describe('App', () => {
  it('renders the scene canvas inside the app shell', () => {
    const { getByTestId } = render(<App />)
    expect(getByTestId('scene-canvas')).toBeTruthy()
  })
})
