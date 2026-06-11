import type { Page } from '@playwright/test'

type CanvasPoint = {
  x: number
  y: number
}

async function dispatchTouchPointer(
  page: Page,
  type: 'pointerdown' | 'pointermove' | 'pointerup',
  point: CanvasPoint,
  pointerId: number,
) {
  await page.evaluate(
    ({ type, point, pointerId }) => {
      const target = document.elementFromPoint(point.x, point.y)
      if (!target) {
        throw new Error(`No element at ${point.x}, ${point.y}`)
      }

      target.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          cancelable: true,
          composed: true,
          pointerId,
          pointerType: 'touch',
          isPrimary: true,
          clientX: point.x,
          clientY: point.y,
          screenX: point.x,
          screenY: point.y,
          button: 0,
          buttons: type === 'pointerup' ? 0 : 1,
          pressure: type === 'pointerup' ? 0 : 0.5,
        }),
      )
    },
    { type, point, pointerId },
  )
}

async function dispatchSyntheticClick(page: Page, point: CanvasPoint) {
  await page.evaluate(
    ({ point }) => {
      const target = document.elementFromPoint(point.x, point.y)
      if (!target) {
        throw new Error(`No element at ${point.x}, ${point.y}`)
      }

      target.dispatchEvent(
        new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          composed: true,
          clientX: point.x,
          clientY: point.y,
          screenX: point.x,
          screenY: point.y,
          button: 0,
          buttons: 0,
          detail: 1,
        }),
      )
    },
    { point },
  )
}

export async function touchPointerTap(page: Page, point: CanvasPoint) {
  const pointerId = 1

  await dispatchTouchPointer(page, 'pointerdown', point, pointerId)
  await dispatchTouchPointer(page, 'pointerup', point, pointerId)
  await dispatchSyntheticClick(page, point)
}

export async function touchPointerDrag(
  page: Page,
  from: CanvasPoint,
  to: CanvasPoint,
  steps = 12,
) {
  const pointerId = 1

  await dispatchTouchPointer(page, 'pointerdown', from, pointerId)

  for (let step = 1; step <= steps; step += 1) {
    const progress = step / steps
    await dispatchTouchPointer(
      page,
      'pointermove',
      {
        x: from.x + (to.x - from.x) * progress,
        y: from.y + (to.y - from.y) * progress,
      },
      pointerId,
    )
  }

  await dispatchTouchPointer(page, 'pointerup', to, pointerId)
}
