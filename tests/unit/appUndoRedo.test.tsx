import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

import { App } from '@/App'
import { useBuildStore } from '@/state/store'

beforeEach(() => {
  useBuildStore.setState({ bricks: {}, selection: new Set<string>() })
  useBuildStore.temporal.getState().clear()
})

describe('App undo/redo integration', () => {
  it('undoes and redoes a visible sample brick placement', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Add Sample Brick' }))
    expect(screen.getByText('Bricks in build: 1')).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'z', ctrlKey: true })
    expect(screen.getByText('Bricks in build: 0')).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'y', ctrlKey: true })
    expect(screen.getByText('Bricks in build: 1')).toBeInTheDocument()
  })
})
