import React from 'react'
import ReactDOM from 'react-dom/client'

import App from './App'
import { useStore } from './state/useStore'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Expose the Zustand store on window during development so Playwright perf
// tests can inject large builds without going through the UI.
if (import.meta.env.DEV) {
  ;(window as Window & { __blockyStore?: typeof useStore }).__blockyStore =
    useStore
}
