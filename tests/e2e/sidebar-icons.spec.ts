import { test, expect } from '@playwright/test'

test('picker icons are visible at narrow sidebar viewport width', async ({
  page,
}) => {
  await page.setViewportSize({ width: 599, height: 800 })
  await page.goto('/')

  const partRadio = page.getByRole('radio', { name: 'Brick 2×4' })
  await expect(partRadio).toBeVisible()
  await expect(partRadio.locator('svg')).toBeVisible()
  await expect(partRadio.locator('.part-btn__compact')).toHaveText('2x4')
  await expect(partRadio.locator('.part-btn__compact')).toBeVisible()

  const baseplateRadio = page.getByRole('radio', { name: '32 × 32' })
  await expect(baseplateRadio).toBeVisible()
  await expect(baseplateRadio.locator('svg')).toBeVisible()
  await expect(
    baseplateRadio.locator('.baseplate-size-btn__compact'),
  ).toHaveText('32')
  await expect(
    baseplateRadio.locator('.baseplate-size-btn__compact'),
  ).toBeVisible()
})
