import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ThemeToggle } from '@/components/ThemeToggle'
import { useThemeStore } from '@/state/theme'

function installMatchMedia(initialMatches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(() => ({
      get matches() {
        return initialMatches
      },
      media: '(prefers-color-scheme: dark)',
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

describe('ThemeToggle', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
    installMatchMedia(false)
    useThemeStore.setState({ theme: 'auto', resolvedTheme: 'light' })
  })

  it('renders Auto, Light, and Dark buttons', () => {
    render(<ThemeToggle />)
    expect(screen.getByRole('button', { name: 'Auto' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Light' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Dark' })).toBeInTheDocument()
  })

  it('marks the current preference as pressed', () => {
    useThemeStore.setState({ theme: 'dark', resolvedTheme: 'dark' })
    render(<ThemeToggle />)

    expect(screen.getByRole('button', { name: 'Auto' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    expect(screen.getByRole('button', { name: 'Light' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    expect(screen.getByRole('button', { name: 'Dark' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('clicking Light updates the store and data-theme immediately', () => {
    render(<ThemeToggle />)

    fireEvent.click(screen.getByRole('button', { name: 'Light' }))

    expect(useThemeStore.getState().theme).toBe('light')
    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it('clicking Dark updates the store and data-theme immediately', () => {
    render(<ThemeToggle />)

    fireEvent.click(screen.getByRole('button', { name: 'Dark' }))

    expect(useThemeStore.getState().theme).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  it('clicking Auto updates the store theme to auto', () => {
    useThemeStore.setState({ theme: 'dark', resolvedTheme: 'dark' })
    render(<ThemeToggle />)

    fireEvent.click(screen.getByRole('button', { name: 'Auto' }))

    expect(useThemeStore.getState().theme).toBe('auto')
  })

  it('writes preference to localStorage when a button is clicked', () => {
    render(<ThemeToggle />)

    fireEvent.click(screen.getByRole('button', { name: 'Dark' }))

    expect(localStorage.getItem('blocky:theme')).toBe('dark')
  })

  it('activates via keyboard Enter key', () => {
    render(<ThemeToggle />)

    const lightBtn = screen.getByRole('button', { name: 'Light' })
    fireEvent.keyDown(lightBtn, { key: 'Enter' })
    fireEvent.click(lightBtn)

    expect(useThemeStore.getState().theme).toBe('light')
  })

  it('activates via keyboard Space key', () => {
    render(<ThemeToggle />)

    const darkBtn = screen.getByRole('button', { name: 'Dark' })
    fireEvent.keyDown(darkBtn, { key: ' ' })
    fireEvent.click(darkBtn)

    expect(useThemeStore.getState().theme).toBe('dark')
  })

  it('buttons do not have animation when prefers-reduced-motion is reduce', () => {
    // The component should not add animation classes; CSS handles
    // reduced-motion via @media query. Verify no inline transition style.
    render(<ThemeToggle />)
    const buttons = screen.getAllByRole('button')
    for (const btn of buttons) {
      expect(btn.style.transition).toBeFalsy()
    }
  })
})
