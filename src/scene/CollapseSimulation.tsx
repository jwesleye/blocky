import { useEffect, useState } from 'react'
import { CuboidCollider, Physics, RigidBody } from '@react-three/rapier'

import {
  advanceCollapseTransaction,
  markCollapseBodySettled,
  type CollapseTransaction,
} from '@/domain/physics'
import type { BrickBodySnapshot } from '@/domain/model/types'
import {
  createCollapseSceneBodies,
  type CollapseSceneBody,
} from './collapseSceneBodies'

export interface CollapseSimulationProps {
  transaction: CollapseTransaction
  staticBodies?: readonly BrickBodySnapshot[]
  onComplete?: (transaction: CollapseTransaction) => void
  tickMs?: number
}

function BrickRigidBody({
  body,
  onSleep,
}: {
  body: CollapseSceneBody
  onSleep?: () => void
}) {
  return (
    <RigidBody
      type={body.bodyType}
      position={body.position}
      quaternion={body.quaternion}
      colliders={false}
      onSleep={onSleep}
    >
      <CuboidCollider
        args={[body.size[0] / 2, body.size[1] / 2, body.size[2] / 2]}
      />
      <mesh castShadow receiveShadow>
        <boxGeometry args={body.size} />
        <meshStandardMaterial
          color={body.color}
          opacity={body.opacity}
          transparent={body.opacity < 1}
        />
      </mesh>
    </RigidBody>
  )
}

function updateSettledBody(
  transaction: CollapseTransaction,
  bodyId: string,
): CollapseTransaction {
  const body = transaction.collapsingBodies.find(
    (candidate) => candidate.id === bodyId,
  )

  if (body === undefined || body.settledAtMs !== null) {
    return transaction
  }

  return markCollapseBodySettled(transaction, bodyId, performance.now())
}

export function CollapseSimulation({
  transaction,
  staticBodies = [],
  onComplete,
  tickMs = 50,
}: CollapseSimulationProps) {
  const [current, setCurrent] = useState(transaction)

  useEffect(() => {
    setCurrent(transaction)
  }, [transaction])

  useEffect(() => {
    if (current.phase === 'complete') {
      onComplete?.(current)
      return undefined
    }

    const intervalId = window.setInterval(() => {
      setCurrent((previous) =>
        advanceCollapseTransaction(previous, performance.now()),
      )
    }, tickMs)

    return () => window.clearInterval(intervalId)
  }, [current, onComplete, tickMs])

  const bodies = createCollapseSceneBodies(current, staticBodies)

  return (
    <Physics>
      {bodies.map((body) => (
        <BrickRigidBody
          key={body.id}
          body={body}
          onSleep={
            body.bodyType === 'dynamic'
              ? () => {
                  setCurrent((previous) => updateSettledBody(previous, body.id))
                }
              : undefined
          }
        />
      ))}
    </Physics>
  )
}
