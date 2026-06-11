import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { BuildScene } from '@/scene/BuildScene'

vi.mock('@/scene/Scene', () => ({
  Scene: ({ presetId }: { presetId?: string }) => (
    <canvas data-preset-id={presetId} data-testid="canonical-scene" />
  ),
}))

describe('BuildScene', () => {
  it('delegates to the canonical Scene implementation', () => {
    const { getByTestId } = render(<BuildScene presetId="night" />)

    expect(getByTestId('canonical-scene')).toHaveAttribute(
      'data-preset-id',
      'night',
    )
  })
})
