import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
)

/**
 * Guard for epic #488: the live app shell/HUD chrome must derive its colors
 * from the shared light/dark design tokens (src/styles/tokens.css) so that both
 * themes render correctly. Inline hardcoded hex colors in App.tsx leave parts of
 * the chrome permanently one theme regardless of the resolved palette.
 */
describe('app chrome theming', () => {
  it('App.tsx carries no hardcoded hex colors — chrome must use token variables', () => {
    const source = readFileSync(path.join(repoRoot, 'src/App.tsx'), 'utf8')

    // Brick colors come from the catalog (currentColor?.hex) at runtime, never
    // as a literal here. Any #rgb / #rrggbb / #rrggbbaa literal is HUD chrome
    // that should reference a --color-* token instead.
    const hardcodedHex = source.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []

    expect(hardcodedHex).toEqual([])
  })
})
