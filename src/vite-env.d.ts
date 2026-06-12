/// <reference types="vite/client" />

declare global {
  interface Window {
    __blockyStore?: typeof import('./state/store').useBuildStore
    __blockyCursorStore?: typeof import('./state/cursor').useCursorStore
    __blockyCollapseDebug?: import('./scene/collapseDebug').CollapseDebug
    __blockyCollapsePerf?: typeof import('./testing/collapsePerfHarness')
    __blockyCollapsePerfError?: string
    __blockyCamera?: import('three').PerspectiveCamera
    __blockyGhostGrid?: import('./domain/grid').GridCoord | null
    __blockyProjectToCanvas?: (
      worldX: number,
      worldY: number,
      worldZ: number,
    ) => { x: number; y: number }
  }
}

export {}
