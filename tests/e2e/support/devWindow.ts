import type { Page } from '@playwright/test'

export interface PlacedBrick {
  id: string
  partId: string
  color: string
  x: number
  y: number
  z: number
  rot: number
}

export interface DevStoreState {
  placeBrick: (b: object) => string | null
  deleteBrick: (id: string) => void
  undo: () => void
  redo: () => void
  bricks: Record<string, PlacedBrick>
}

export interface DevCursorState {
  rot: number
  editingTool: string
  colorId: string
  partId: string
  setColor: (id: string) => void
}

export interface DevStore {
  getState: () => DevStoreState
}

export interface DevCursorStore {
  getState: () => DevCursorState
}

export interface DevWindow {
  __blockyStore: DevStore
  __blockyCursorStore: DevCursorStore
  __blockyCamera: unknown
  __blockyProjectToCanvas: (
    worldX: number,
    worldY: number,
    worldZ: number,
  ) => { x: number; y: number }
}

export async function waitForStores(page: Page) {
  await page.waitForFunction(
    () =>
      (window as unknown as Partial<DevWindow>).__blockyStore !== undefined &&
      (window as unknown as Partial<DevWindow>).__blockyCursorStore !==
        undefined &&
      (window as unknown as Partial<DevWindow>).__blockyCamera !== undefined &&
      (window as unknown as Partial<DevWindow>).__blockyProjectToCanvas !==
        undefined,
  )
}

export async function projectToCanvas(
  page: Page,
  worldX: number,
  worldY: number,
  worldZ: number,
): Promise<{ x: number; y: number }> {
  return page.evaluate(
    ([wx, wy, wz]) =>
      (window as unknown as DevWindow).__blockyProjectToCanvas(wx, wy, wz),
    [worldX, worldY, worldZ] as [number, number, number],
  )
}

export async function getBrickCount(page: Page) {
  return page.evaluate(
    () =>
      Object.keys(
        (window as unknown as DevWindow).__blockyStore.getState().bricks,
      ).length,
  )
}
