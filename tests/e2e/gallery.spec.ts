import { test, expect } from '@playwright/test'

test('loads a published fixture build from the gallery', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByText('Bricks in build: 0')).toBeVisible()

  await page.getByTestId('gallery-toggle').click()
  await expect(page.getByText('Demo gallery')).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Starter House' }),
  ).toBeVisible()
  await expect(page.getByText('Blocky Team')).toBeVisible()
  await expect(page.getByText('4 bricks')).toBeVisible()

  await page
    .locator('article')
    .filter({ hasText: 'Starter House' })
    .getByRole('button', { name: 'Load' })
    .click()

  await expect(page.getByText('Bricks in build: 4')).toBeVisible()
})
