import type { BrickBodySnapshot } from '@/domain/model/types'
import type { CollapseBodyState, CollapseTransaction } from '@/domain/physics'

export interface CollapseSceneBody extends BrickBodySnapshot {
  bodyType: 'dynamic' | 'fixed'
  opacity: number
}

const EMPTY_STATIC_BODIES: readonly BrickBodySnapshot[] = []
const sceneBodyCache = new WeakMap<
  CollapseTransaction,
  WeakMap<readonly BrickBodySnapshot[], CollapseSceneBody[]>
>()

export function createCollapseSceneBodies(
  transaction: CollapseTransaction,
  staticBodies: readonly BrickBodySnapshot[] = EMPTY_STATIC_BODIES,
): CollapseSceneBody[] {
  const staticBodiesKey =
    staticBodies.length === 0 ? EMPTY_STATIC_BODIES : staticBodies
  let staticCache = sceneBodyCache.get(transaction)
  if (!staticCache) {
    staticCache = new WeakMap()
    sceneBodyCache.set(transaction, staticCache)
  }

  const cached = staticCache.get(staticBodiesKey)
  if (cached) return cached

  const bodies = [
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
  staticCache.set(staticBodiesKey, bodies)
  return bodies
}

export function getDynamicBodyStates(
  transaction: CollapseTransaction,
): readonly CollapseBodyState[] {
  return transaction.collapsingBodies
}
