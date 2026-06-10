import React from 'react'
import ReactDOM from 'react-dom/client'

import App from './App'
import './styles/global.css'
import { collapseDebug } from './scene/collapseDebug'
import { useBuildStore } from '@/state/store'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Expose the Zustand store on window during development so Playwright tests
// can interact with the build state directly.
if (import.meta.env.DEV) {
  window.__blockyStore = useBuildStore
  window.__blockyCollapseDebug = collapseDebug
}
