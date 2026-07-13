import { describe, expect, it } from 'vitest'

import { collapseDebug } from '@/scene/collapseDebug'

describe('collapseDebug', () => {
  it('initializes with dynamicBodyCount set to 0', () => {
    expect(collapseDebug.dynamicBodyCount).toBe(0)
  })

  it('allows updating dynamicBodyCount', () => {
    collapseDebug.dynamicBodyCount = 5
    expect(collapseDebug.dynamicBodyCount).toBe(5)

    // Reset for other tests
    collapseDebug.dynamicBodyCount = 0
  })
})
