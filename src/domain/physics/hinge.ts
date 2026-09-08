import type { PlacedBrick } from '../model/types'

/** Hinge contacts are not modeled by the structural solver yet.
 * A hinge may rest on the baseplate, but cannot form support edges.
 */
export function isUnsupportedHingeGrammar(
  brick: Pick<PlacedBrick, 'hinge'>,
): boolean {
  return brick.hinge !== undefined
}
