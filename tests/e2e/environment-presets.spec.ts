import { expect, test } from '@playwright/test'

const PRESET_STORAGE_KEY = 'blocky.scene.environmentPreset.v1'

async function expectNonblankCanvas(page: import('@playwright/test').Page) {
  await expect(page.locator('canvas')).toBeVisible()
  await page.waitForFunction(
    () => {
      const canvas = document.querySelector(
        'canvas',
      ) as HTMLCanvasElement | null
      if (!canvas) return false

      const offscreen = document.createElement('canvas')
      offscreen.width = canvas.width || 300
      offscreen.height = canvas.height || 150
      const ctx = offscreen.getContext('2d')
      if (!ctx) return false

      ctx.drawImage(canvas, 0, 0)
      const data = ctx.getImageData(
        0,
        0,
        offscreen.width,
        offscreen.height,
      ).data

      const colors = new Set<number>()
      for (let i = 0; i < data.length; i += 16) {
        colors.add((data[i] << 16) | (data[i + 1] << 8) | data[i + 2])
        if (colors.size > 1) return true
      }
      return colors.size > 1
    },
    undefined,
    { timeout: 10000 },
  )
}

test('environment presets switch from the sidebar and keep the canvas nonblank', async ({
  page,
}) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })

  await expectNonblankCanvas(page)

  const group = page.getByRole('radiogroup', { name: 'Environment preset' })
  const options = group.getByRole('radio')
  const count = await options.count()
  expect(count).toBeGreaterThanOrEqual(3)

  for (let i = 0; i < count; i += 1) {
    const option = options.nth(i)
    await option.click()
    await expect(option).toHaveAttribute('aria-checked', 'true')

    const presetId = await option.getAttribute('data-preset-id')
    expect(presetId).toBeTruthy()
    await expect
      .poll(() =>
        page.evaluate((key) => localStorage.getItem(key), PRESET_STORAGE_KEY),
      )
      .toBe(presetId)

    await expectNonblankCanvas(page)
  }
})
