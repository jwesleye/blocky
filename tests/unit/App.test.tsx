import { describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'

// jsdom has no WebGL context, so mock the r3f <Canvas> (see Scene.test.tsx).
vi.mock('@react-three/fiber', () => ({
  Canvas: () => <canvas data-testid="scene-canvas" />,
}))

vi.mock('@/scene/BuildScene', () => ({
  BuildScene: () => <canvas data-testid="interactive-scene" />,
}))

import { App } from '@/App'

describe('App', () => {
  it('mounts the interactive scene inside the app shell', () => {
    const { getByTestId } = render(<App />)
    expect(getByTestId('interactive-scene')).toBeTruthy()
  })
})
