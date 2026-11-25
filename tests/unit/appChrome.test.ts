import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
)

/**
 * The live app shell/HUD chrome must derive its colors from the shared
 * light/dark design tokens (src/styles/tokens.css).
 */
describe('app chrome theming', () => {
  it('App.tsx carries no hardcoded hex colors — chrome must use token variables', () => {
    const source = readFileSync(path.join(repoRoot, 'src/App.tsx'), 'utf8')

    const hardcodedHex = source.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []

    expect(hardcodedHex).toEqual([])
  })
})
