import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const DOC_PATH = join(process.cwd(), 'docs/PRD.md')

/**
 * Drift guard: the PRD must keep documenting the expanded-grammar scope —
 * half-stud (jumper) offsets, SNOT (sideways building) as the first supported
 * post-offset family, the v1↔v2↔v3 migration guarantee, and the connection
 * types that remain out of scope. If the doc stops stating any of these, this
 * test fails so the documented contract and shipped persistence behavior cannot
 * silently diverge.
 */
describe('docs/PRD.md — expanded-grammar scope drift guard', () => {
  it('exists', () => {
    expect(existsSync(DOC_PATH), 'docs/PRD.md not found').toBe(true)
  })

  const doc = (): string => readFileSync(DOC_PATH, 'utf-8')

  describe('supported half-stud (jumper) offset scope', () => {
    it('names half-stud (jumper) offsets as the first supported non-v1 slice', () => {
      expect(doc()).toMatch(/half-stud/i)
      expect(doc()).toMatch(/jumper/i)
    })

    it('records that offsets are limited to a +0.5 stud shift in X/Z', () => {
      expect(doc()).toMatch(/0\s*\|\s*1/)
      expect(doc()).toMatch(/0\.5.{0,4}stud/i)
    })
  })

  describe('supported SNOT (sideways building) scope', () => {
    it('names SNOT as the first supported post-offset connection family', () => {
      expect(doc()).toMatch(/snot/i)
      expect(doc()).toMatch(/first supported post-offset/i)
    })

    it('states that a build with a mount brick serializes as version 3', () => {
      expect(doc()).toMatch(/version:\s*3/i)
    })

    it('names the four mount facings', () => {
      expect(doc()).toMatch(/px|nx|pz|nz/)
    })
  })

  describe('supported hinges (first post-SNOT family) scope', () => {
    it('names hinges as the first supported post-SNOT family', () => {
      expect(doc()).toMatch(/first supported post-snot/i)
    })

    it('states that a build with a hinge brick serializes as version 4', () => {
      expect(doc()).toMatch(/version:\s*4/i)
    })

    it('names the two pivot axes', () => {
      expect(doc()).toMatch(/'x'\s*\|\s*'z'|x.*z.*pivot|pivot.*x.*z/i)
    })
  })

  describe('v1 ↔ v2 ↔ v3 ↔ v4 migration guarantee', () => {
    it('states a no-offset build stays version 1', () => {
      expect(doc()).toMatch(/version:\s*1/i)
    })

    it('states an offset build serializes as version 2', () => {
      expect(doc()).toMatch(/version:\s*2/i)
    })

    it('promises v1 builds round-trip without user migration', () => {
      expect(doc()).toMatch(/compatible with v1|byte-for-byte/i)
    })
  })

  describe('still-excluded connection types', () => {
    it.each(['Technic', 'angled'])(
      'names %s as out of scope',
      (term) => {
        expect(doc()).toMatch(new RegExp(term, 'i'))
      },
    )
  })

  describe('stale non-goal language removed', () => {
    it('does not contain the stale "Not SNOT" non-goal phrase', () => {
      expect(doc()).not.toMatch(/not snot/i)
    })

    it('does not contain the stale "no sideways building" non-goal phrase', () => {
      expect(doc()).not.toMatch(/no sideways building/i)
    })
  })
})
