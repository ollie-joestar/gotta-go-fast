// BOT_ENABLED — set to true to activate the multiplayer bot car.
export const BOT_ENABLED = false

import type { MutableRefObject } from "react"
import { useFrame } from "@react-three/fiber"
import { useAISocket } from "./useAISocket"
import type { AIFrame, Checkpoints } from "./aiTypes"
import type { CheckpointDef } from "./tracks/track01"

interface BotBridgeOptions {
  enabled: boolean
  positionRef: MutableRefObject<[number, number, number]>
  quaternionRef: MutableRefObject<[number, number, number, number]>
  velocityRef: MutableRefObject<[number, number, number]>
  currentCheckpoint: number
  allCheckpoints: CheckpointDef[]
}

export function useBotBridge({
  enabled,
  positionRef,
  quaternionRef,
  velocityRef,
  currentCheckpoint,
  allCheckpoints,
}: BotBridgeOptions) {
  const { sendFrame, commands, connected, lastReceivedAt } = useAISocket()

  useFrame(() => {
    if (!enabled) return
    const total = allCheckpoints.length
    if (!total) return

    const checkpoints: Checkpoints = {
      0: allCheckpoints[(currentCheckpoint + 0) % total].position,
      1: allCheckpoints[(currentCheckpoint + 1) % total].position,
      2: allCheckpoints[(currentCheckpoint + 2) % total].position,
    }

    const frame: AIFrame = {
      position: positionRef.current,
      quaternion: quaternionRef.current,
      velocity: velocityRef.current,
      totalCheckpoints: total,
      currentCheckpoint,
      checkpoints,
    }
    sendFrame(frame)
  })

  return { commands, connected, lastReceivedAt }
}
