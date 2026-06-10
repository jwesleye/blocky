import { describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'

// jsdom has no WebGL context, so the real r3f <Canvas> cannot mount. Mock it
// with a plain <canvas> so we can smoke-test React composition / mounting.
vi.mock('@react-three/fiber', () => ({
  Canvas: () => <canvas data-testid="scene-canvas" />,
}))

import { BuildScene } from '@/scene/BuildScene'

describe('BuildScene', () => {
  it('mounts without crashing and renders a canvas element', () => {
    const { getByTestId } = render(<BuildScene />)
    expect(getByTestId('scene-canvas')).toBeTruthy()
  })
})
