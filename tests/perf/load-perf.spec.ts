import { expect, test } from '@playwright/test'

import {
  FIRST_INTERACTION_BUDGET_MS,
  PERF_CPU_THROTTLE_RATE,
  PERF_NETWORK_PROFILE,
} from './budgets'

test('loads within the first-interaction budget under throttled broadband', async ({
  page,
}) => {
  const client = await page.context().newCDPSession(page)

  await client.send('Network.enable')
  await client.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: PERF_NETWORK_PROFILE.latencyMs,
    downloadThroughput: PERF_NETWORK_PROFILE.downloadBytesPerSecond,
    uploadThroughput: PERF_NETWORK_PROFILE.uploadBytesPerSecond,
  })
  await client.send('Emulation.setCPUThrottlingRate', {
    rate: PERF_CPU_THROTTLE_RATE,
  })

  const startedAt = Date.now()

  await page.goto('/')

  const addSampleBrickButton = page.getByRole('button', {
    name: 'Add Sample Brick',
  })
  await expect(addSampleBrickButton).toBeVisible()
  await addSampleBrickButton.click()
  await expect(page.getByText('Bricks in build: 1')).toBeVisible()

  const firstInteractionMs = Date.now() - startedAt

  expect(firstInteractionMs).toBeLessThanOrEqual(FIRST_INTERACTION_BUDGET_MS)
})
