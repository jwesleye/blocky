import { test, expect } from '@playwright/test';

test('canvas is visible and responding to events', async ({ page }) => {
  await page.goto('/');
  
  // Assert canvas is visible
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  
  // Basic interaction: ensure we can click it without errors
  // In a real app we might check for cursor changes or state updates
  await canvas.click();
});
