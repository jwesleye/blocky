let idCounter = 0

/** Generates a unique id for a placed brick. */
export function createBrickId(): string {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID()
  }
  idCounter += 1
  return `brick-${idCounter}`
}
