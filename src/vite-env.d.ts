/// <reference types="vite/client" />

declare global {
  interface Window {
    __blockyStore?: typeof import('./state/store').useBuildStore
    __blockyCursorStore?: typeof import('./state/cursor').useCursorStore
    __blockyCollapseDebug?: import('./scene/collapseDebug').CollapseDebug
    __blockyCamera?: import('three').PerspectiveCamera
  }
}

export {}
