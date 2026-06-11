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
  __blockyGhostGrid: { x: number; y: number; z: number } | null
  __blockyProjectToCanvas: (
    worldX: number,
    worldY: number,
    worldZ: number,
  ) => { x: number; y: number }
}

type WaitForDevWindowOptions = {
  requireStore?: boolean
  requireCursorStore?: boolean
  requireCamera?: boolean
  requireProjectToCanvas?: boolean
  timeout?: number
}

export async function waitForDevWindow(
  page: Page,
  {
    requireStore = true,
    requireCursorStore = true,
    requireCamera = false,
    requireProjectToCanvas = false,
    timeout,
  }: WaitForDevWindowOptions = {},
) {
  await page.waitForFunction(
    ({
      requireStore,
      requireCursorStore,
      requireCamera,
      requireProjectToCanvas,
    }) => {
      const win = window as unknown as Partial<DevWindow>
      return (
        (!requireStore || win.__blockyStore !== undefined) &&
        (!requireCursorStore || win.__blockyCursorStore !== undefined) &&
        (!requireCamera || win.__blockyCamera !== undefined) &&
        (!requireProjectToCanvas || win.__blockyProjectToCanvas !== undefined)
      )
    },
    {
      requireStore,
      requireCursorStore,
      requireCamera,
      requireProjectToCanvas,
    },
    timeout === undefined ? undefined : { timeout },
  )
}

export async function waitForStores(page: Page) {
  await waitForDevWindow(page, {
    requireStore: true,
    requireCursorStore: true,
    requireCamera: true,
    requireProjectToCanvas: true,
  })
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
