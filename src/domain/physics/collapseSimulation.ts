import { resolveBrickColorHex } from '../model/colors'
import type { BrickBodySnapshot, PlacedBrick } from '../model/types'
import {
  CATALOG_BY_ID as PART_CATALOG,
  type PartCatalog,
} from '../parts/catalog'

/**
 * Converts a placed brick into a {@link BrickBodySnapshot} positioned at the
 * center of the volume it occupies on the grid, with catalog-derived dimensions.
 * Used to seed Rapier rigid bodies for the sheared sub-region so a falling body
 * starts exactly where its static mesh stood (no teleporting on collapse).
 *
 * Units: X/Z in studs, Y in plate units — matching the grid coordinate system.
 */
export function brickToBodySnapshot(
  brick: PlacedBrick,
  catalog: PartCatalog = PART_CATALOG,
): BrickBodySnapshot {
  const def = catalog[brick.partId]
  if (!def) {
    throw new Error(`unknown partId "${brick.partId}"`)
  }

  // Rotations 1 and 3 (90° / 270°) swap the footprint's width and length.
  const [width, length] =
    brick.rot % 2 === 0 ? [def.width, def.length] : [def.length, def.width]
  const height = def.height

  const offsetX = (brick.offset?.x ?? 0) * 0.5
  const offsetZ = (brick.offset?.z ?? 0) * 0.5

  return {
    id: brick.id,
    partId: brick.partId,
    color: resolveBrickColorHex(brick.color),
    position: [
      brick.x + offsetX + width / 2,
      brick.y + height / 2,
      brick.z + offsetZ + length / 2,
    ],
    size: [width, height, length],
  }
}

/** Batch form of {@link brickToBodySnapshot}, preserving input order. */
export function bricksToBodySnapshots(
  bricks: readonly PlacedBrick[],
  catalog: PartCatalog = PART_CATALOG,
): BrickBodySnapshot[] {
  return bricks.map((brick) => brickToBodySnapshot(brick, catalog))
}

export interface CollapseSimulationTimings {
  settleDelayMs: number
  fadeDurationMs: number
}

export interface CollapseBodyState extends BrickBodySnapshot {
  opacity: number
  settledAtMs: number | null
}

export interface CollapseTransaction {
  before: readonly PlacedBrick[]
  standingBricks: readonly PlacedBrick[]
  collapsingBodies: readonly CollapseBodyState[]
  phase: 'tumbling' | 'fading' | 'complete'
  fadeStartedAtMs: number | null
  removedBodyIds: readonly string[]
  timings: CollapseSimulationTimings
}

export interface CreateCollapseTransactionInput {
  allBricks: readonly PlacedBrick[]
  collapsingBodies: readonly BrickBodySnapshot[]
  timings?: Partial<CollapseSimulationTimings>
}

const DEFAULT_TIMINGS: CollapseSimulationTimings = {
  settleDelayMs: 400,
  fadeDurationMs: 1500,
}

export function createCollapseTransaction(
  input: CreateCollapseTransactionInput,
): CollapseTransaction {
  const collapsingIds = new Set(input.collapsingBodies.map((body) => body.id))

  return {
    before: [...input.allBricks],
    standingBricks: input.allBricks.filter(
      (brick) => !collapsingIds.has(brick.id),
    ),
    collapsingBodies: input.collapsingBodies.map((body) => ({
      ...body,
      opacity: 1,
      settledAtMs: null,
    })),
    phase: 'tumbling',
    fadeStartedAtMs: null,
    removedBodyIds: [],
    timings: {
      settleDelayMs:
        input.timings?.settleDelayMs ?? DEFAULT_TIMINGS.settleDelayMs,
      fadeDurationMs:
        input.timings?.fadeDurationMs ?? DEFAULT_TIMINGS.fadeDurationMs,
    },
  }
}

export function markCollapseBodySettled(
  transaction: CollapseTransaction,
  bodyId: string,
  settledAtMs: number,
): CollapseTransaction {
  return {
    ...transaction,
    collapsingBodies: transaction.collapsingBodies.map((body) =>
      body.id === bodyId && body.settledAtMs === null
        ? { ...body, settledAtMs }
        : body,
    ),
  }
}

export function advanceCollapseTransaction(
  transaction: CollapseTransaction,
  nowMs: number,
): CollapseTransaction {
  if (transaction.phase === 'complete') {
    return transaction
  }

  if (
    transaction.fadeStartedAtMs === null &&
    transaction.collapsingBodies.length > 0 &&
    transaction.collapsingBodies.every((body) => body.settledAtMs !== null)
  ) {
    const lastSettledAtMs = Math.max(
      ...transaction.collapsingBodies.map((body) => body.settledAtMs ?? 0),
    )

    if (nowMs >= lastSettledAtMs + transaction.timings.settleDelayMs) {
      return {
        ...transaction,
        phase: 'fading',
        fadeStartedAtMs: lastSettledAtMs + transaction.timings.settleDelayMs,
      }
    }
  }

  if (transaction.phase !== 'fading' || transaction.fadeStartedAtMs === null) {
    return transaction
  }

  const fadeProgress = Math.min(
    1,
    (nowMs - transaction.fadeStartedAtMs) / transaction.timings.fadeDurationMs,
  )
  const opacity = 1 - fadeProgress

  if (fadeProgress >= 1) {
    return {
      ...transaction,
      phase: 'complete',
      collapsingBodies: transaction.collapsingBodies.map((body) => ({
        ...body,
        opacity: 0,
      })),
      removedBodyIds: transaction.collapsingBodies.map((body) => body.id),
    }
  }

  return {
    ...transaction,
    collapsingBodies: transaction.collapsingBodies.map((body) => ({
      ...body,
      opacity,
    })),
  }
}

export function restoreCollapseUndoSnapshot(
  transaction: CollapseTransaction,
): readonly PlacedBrick[] {
  return transaction.before
}
