import { describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'

// jsdom has no WebGL context, so the real r3f <Canvas> cannot mount. Mock it
// with a plain <canvas> so we can smoke-test React composition / mounting.
vi.mock('@react-three/fiber', () => ({
  Canvas: () => <canvas data-testid="scene-canvas" />,
}))

import { Scene } from '@/scene/Scene'

describe('Scene', () => {
  it('mounts without crashing and renders a canvas element', () => {
    const { getByTestId } = render(<Scene />)
    expect(getByTestId('scene-canvas')).toBeTruthy()
  })
})
