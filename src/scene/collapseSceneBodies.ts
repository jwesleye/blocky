import type { BrickBodySnapshot } from '@/domain/model/types'
import type { CollapseBodyState, CollapseTransaction } from '@/domain/physics'

export interface CollapseSceneBody extends BrickBodySnapshot {
  bodyType: 'dynamic' | 'fixed'
  opacity: number
}

export function createCollapseSceneBodies(
  transaction: CollapseTransaction,
  staticBodies: readonly BrickBodySnapshot[] = [],
): CollapseSceneBody[] {
  return [
    ...staticBodies.map((body) => ({
      ...body,
      bodyType: 'fixed' as const,
      opacity: 1,
    })),
    ...transaction.collapsingBodies.map((body) => ({
      ...body,
      bodyType: 'dynamic' as const,
      opacity: body.opacity,
    })),
  ]
}

export function getDynamicBodyStates(
  transaction: CollapseTransaction,
): readonly CollapseBodyState[] {
  return transaction.collapsingBodies
}
