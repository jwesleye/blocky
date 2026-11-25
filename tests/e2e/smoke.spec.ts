import { test, expect } from '@playwright/test'

test('canvas is visible and responding to events', async ({ page }) => {
  await page.goto('/')

  const canvas = page.locator('canvas')
  await expect(canvas).toBeVisible()

  await canvas.click()
})
