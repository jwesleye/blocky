import { expect, test } from '@playwright/test'

import {
  BUDGET_DOC_URL,
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
    name: /add sample brick/i,
  })
  await expect(addSampleBrickButton).toBeVisible({ timeout: 15000 })
  await addSampleBrickButton.click()
  await expect(page.locator('.brick-count')).toContainText('1', {
    timeout: 15000,
  })

  const firstInteractionMs = Date.now() - startedAt

  expect(
    firstInteractionMs,
    `first interaction took ${firstInteractionMs}ms, exceeding the ${FIRST_INTERACTION_BUDGET_MS}ms budget. See ${BUDGET_DOC_URL} for details.`,
  ).toBeLessThanOrEqual(FIRST_INTERACTION_BUDGET_MS)
})
