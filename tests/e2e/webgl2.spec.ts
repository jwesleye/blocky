import { test, expect } from '@playwright/test';

test('WebGL2 capability check', async ({ page }) => {
  await page.goto('/');
  
  const isWebGL2Supported = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    return gl !== null;
  });
  
  expect(isWebGL2Supported, 'WebGL2 is not supported in this browser').toBe(true);
});
