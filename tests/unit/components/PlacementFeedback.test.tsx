import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { PlacementFeedback } from '@/components/PlacementFeedback'
import { useBuildStore } from '@/state/store'

beforeEach(() => useBuildStore.setState({ bricks: {} }))

describe('PlacementFeedback', () => {
  it('explains unsupported hinge placement in a live status region', () => {
    render(<PlacementFeedback reason="unsupported-hinge" />)
    expect(screen.getByRole('status')).toHaveTextContent(
      'Hinge stacking is not supported yet',
    )
    expect(screen.getByRole('status')).toHaveTextContent('baseplate')
  })

  it('clears feedback when the cursor becomes valid', () => {
    const { rerender } = render(
      <PlacementFeedback reason="unsupported-hinge" />,
    )
    rerender(<PlacementFeedback reason={null} />)
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })

  it('does not label ordinary invalid placement as unsupported hinges', () => {
    render(<PlacementFeedback reason="invalid-placement" />)
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })

  it('warns about legacy elevated hinges before a structural edit', () => {
    useBuildStore.setState({
      bricks: {
        old: {
          id: 'old',
          partId: 'brick-1x1',
          color: 'red',
          x: 0,
          y: 3,
          z: 0,
          rot: 0,
          hinge: 'x',
        },
      },
    })
    render(<PlacementFeedback reason={null} />)
    expect(screen.getByRole('status')).toHaveTextContent(
      'Adding or deleting a brick will make these hinges collapse',
    )
    expect(screen.getByRole('status')).toHaveTextContent('Undo collapse')
  })

  it('does not warn about supported baseplate hinges', () => {
    useBuildStore.setState({
      bricks: {
        base: {
          id: 'base',
          partId: 'brick-1x1',
          color: 'red',
          x: 0,
          y: 0,
          z: 0,
          rot: 0,
          hinge: 'z',
        },
      },
    })
    render(<PlacementFeedback reason={null} />)
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })
})
