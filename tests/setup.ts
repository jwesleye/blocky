// Vitest global setup — runs before each test file.
import '@testing-library/jest-dom'

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver ??= ResizeObserverStub
