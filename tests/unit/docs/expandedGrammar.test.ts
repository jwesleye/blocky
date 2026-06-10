import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const DOC_PATH = join(process.cwd(), 'docs/PRD.md')

/**
 * Drift guard (issue #101): the PRD must keep documenting the expanded-grammar
 * scope this slice hardens — half-stud (jumper) offsets, the v1↔v2 migration
 * guarantee, and the connection types that remain out of scope. If the doc
 * stops stating any of these, this test fails so the documented contract and
 * the shipped persistence behavior cannot silently diverge.
 */
describe('docs/PRD.md — expanded-grammar scope drift guard (issue #101)', () => {
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

  describe('v1 ↔ v2 migration guarantee', () => {
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
    it.each(['SNOT', 'hinge', 'Technic', 'angled'])(
      'names %s as out of scope',
      (term) => {
        expect(doc()).toMatch(new RegExp(term, 'i'))
      },
    )
  })
})
