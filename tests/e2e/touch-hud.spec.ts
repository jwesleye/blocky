import { test, expect } from '@playwright/test'

test.describe('tablet HUD layout', () => {
  test.use({ viewport: { width: 820, height: 1180 } })

  test('sidebar is narrower than 220px at tablet viewport', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('canvas')).toBeVisible()

    const sidebarWidth = await page.evaluate(() => {
      const sidebar = document.querySelector('.app-sidebar')
      if (!sidebar) return null
      return sidebar.getBoundingClientRect().width
    })

    expect(sidebarWidth).not.toBeNull()
    expect(sidebarWidth!).toBeLessThan(220)
  })

  test('sidebar does not overlap the canvas area', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('canvas')).toBeVisible()

    const layout = await page.evaluate(() => {
      const sidebar = document.querySelector('.app-sidebar')
      const canvas = document.querySelector('canvas')
      if (!sidebar || !canvas) return null
      return {
        sidebarRight: sidebar.getBoundingClientRect().right,
        canvasLeft: canvas.getBoundingClientRect().left,
      }
    })

    expect(layout).not.toBeNull()
    // Canvas left edge must be at or to the right of the sidebar right edge
    expect(layout!.canvasLeft).toBeGreaterThanOrEqual(layout!.sidebarRight - 1)
  })
})
