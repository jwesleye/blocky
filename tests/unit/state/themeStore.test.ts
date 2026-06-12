import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { resolveTheme, useThemeStore } from '@/state/themeStore'

function makeMql(prefersDark: boolean) {
  const listeners: Array<(e: { matches: boolean }) => void> = []
  return {
    matches: prefersDark,
    addEventListener: (_: string, cb: (e: { matches: boolean }) => void) => {
      listeners.push(cb)
    },
    removeEventListener: () => {},
    _listeners: listeners,
  }
}

describe('resolveTheme', () => {
  it('returns light for explicit light choice', () => {
    expect(resolveTheme('light')).toBe('light')
  })

  it('returns dark for explicit dark choice', () => {
    expect(resolveTheme('dark')).toBe('dark')
  })

  it('returns dark for auto when OS prefers dark', () => {
    const mql = makeMql(true)
    expect(resolveTheme('auto', mql as unknown as MediaQueryList)).toBe('dark')
  })

  it('returns light for auto when OS prefers light', () => {
    const mql = makeMql(false)
    expect(resolveTheme('auto', mql as unknown as MediaQueryList)).toBe('light')
  })

  it('returns light for auto when matchMedia is unavailable', () => {
    expect(resolveTheme('auto', undefined)).toBe('light')
  })
})

describe('useThemeStore', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => makeMql(false)),
    )
    document.documentElement.removeAttribute('data-theme')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('defaults to auto', () => {
    expect(useThemeStore.getInitialState().theme).toBe('auto')
  })

  it('setTheme dark writes data-theme=dark to the root element', () => {
    useThemeStore.getState().setTheme('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(useThemeStore.getState().resolved).toBe('dark')
  })

  it('setTheme light writes data-theme=light to the root element', () => {
    useThemeStore.getState().setTheme('light')
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(useThemeStore.getState().resolved).toBe('light')
  })

  it('setTheme auto resolves against OS preference', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => makeMql(true)),
    )
    useThemeStore.getState().setTheme('auto')
    expect(useThemeStore.getState().resolved).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
  })
})
