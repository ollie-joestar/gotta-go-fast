import { useEffect, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import { useAISocket } from "./useAISocket"
import type { AIFrame, Checkpoints } from "./aiTypes"
import type { CheckpointDef } from "./checkpoints"
import { CAR_OPTIONS, FFORCE, RFORCE } from "./options"

const BRAKE_FORCE = CAR_OPTIONS.brakeForce
const FBRAKE_BIAS = CAR_OPTIONS.frontBrakeBias
const MAX_STEER = CAR_OPTIONS.maxSteer
const MIN_STEER = CAR_OPTIONS.minSteer
const STEER_SPEED_MAX = CAR_OPTIONS.steerSpeedMax

const CONSOLE_LOG_INTERVAL = 10000

interface BotControllerOptions {
  vehicleApi: any
  chassisApi: any
  currentCheckpoint: number
  allCheckpoints: CheckpointDef[]
  enabled?: boolean
}

type BotCommands = {
  forward: boolean
  backward: boolean
  left: boolean
  right: boolean
}

export function useBotController({
  vehicleApi,
  chassisApi,
  currentCheckpoint,
  allCheckpoints,
  enabled = true
}: BotControllerOptions) {

  const velocity = useRef<[number, number, number]>([0, 0, 0])
  const quaternion = useRef<[number, number, number, number]>([0, 0, 0, 1])
  const position = useRef<[number, number, number]>([0, 0, 0])

  const { sendFrame, commands, lastReceivedAt } = useAISocket()

  const lastLoggedReceivedAt = useRef(0)
  const lastLogTime = useRef(0)

  useEffect(() => {
    const unsubVel = chassisApi.velocity.subscribe(
      (v: [number, number, number]) => {
        velocity.current = v
      }
    )

    const unsubRot = chassisApi.quaternion.subscribe(
      (q: [number, number, number, number]) => {
        quaternion.current = q
      }
    )

    const unsubPos = chassisApi.position.subscribe(
      (p: [number, number, number]) => {
        position.current = p
      }
    )

    return () => {
      unsubVel()
      unsubRot()
      unsubPos()
    }
  }, [chassisApi])

  useFrame(() => {
    if (!enabled) return

    const total = allCheckpoints.length
    if (!total) return

    /* Send state to bot */
    const checkpoints: Checkpoints = {
      0: allCheckpoints[(currentCheckpoint + 0) % total].position,
      1: allCheckpoints[(currentCheckpoint + 1) % total].position,
      2: allCheckpoints[(currentCheckpoint + 2) % total].position,
    }

    const frame: AIFrame = {
      position: position.current,
      quaternion: quaternion.current,
      velocity: velocity.current,
      totalCheckpoints: total,
      currentCheckpoint,
      checkpoints,
    }
    sendFrame(frame)
    /*
      Read commands.
      Supports BOTH:
      1)
      {commands:["forward","turn_left"]}
      2)
      {forward:true,left:true}
    */

    let bot: BotCommands = {
      forward: false,
      backward: false,
      left: false,
      right: false
    }

    const incoming: any = commands.current

    if (incoming instanceof Set) {
      bot = {
        forward: incoming.has("forward"),
        backward: incoming.has("backward"),
        left:
          incoming.has("left") ||
          incoming.has("turn_left"),

        right:
          incoming.has("right") ||
          incoming.has("turn_right"),
      }
    }
    else if (incoming && typeof incoming === "object") {
      bot = {
        forward: !!incoming.forward,
        backward: !!incoming.backward,
        left: !!incoming.left,
        right: !!incoming.right
      }
    }
    const { forward, backward, left, right } = bot

    /* speed along forward axis */

    const [qx, qy, qz, qw] = quaternion.current
    const [vx, vy, vz] = velocity.current

    const fwdX = -2 * (qx * qz + qw * qy)
    const fwdY = -2 * (qy * qz - qw * qx)
    const fwdZ = -(1 - 2 * (qx * qx + qy * qy))

    const fSpeed =
      vx * fwdX +
      vy * fwdY +
      vz * fwdZ
    /* Logging */
    const now = Date.now()
    if (lastReceivedAt.current !== lastLoggedReceivedAt.current ||
      now - lastLogTime.current > CONSOLE_LOG_INTERVAL) {
      console.log("Bot commands:", bot)
      lastLoggedReceivedAt.current = lastReceivedAt.current
      lastLogTime.current = now
    }
    /* Driving */
    const turning = left || right
    const frontBrake = turning ? BRAKE_FORCE * FBRAKE_BIAS : BRAKE_FORCE
    const rearBrake = BRAKE_FORCE

    if (forward) {
      for (let i = 0; i < 4; i++) {
        vehicleApi.setBrake(0, i)
      }
      vehicleApi.applyEngineForce(RFORCE, 0)
      vehicleApi.applyEngineForce(RFORCE, 1)
      vehicleApi.applyEngineForce(FFORCE, 2)
      vehicleApi.applyEngineForce(FFORCE, 3)
    }
    else if (backward) {
      for (let i = 0; i < 4; i++) {
        vehicleApi.applyEngineForce(0, i)
      }
      vehicleApi.setBrake(rearBrake, 0)
      vehicleApi.setBrake(rearBrake, 1)
      vehicleApi.setBrake(frontBrake, 2)
      vehicleApi.setBrake(frontBrake, 3)
    }
    else {
      for (let i = 0; i < 4; i++) {
        vehicleApi.applyEngineForce(0, i)
      }
      const coastBrake = Math.abs(fSpeed) > 0.15 ? CAR_OPTIONS.coastBrakeForce : 0
      if (turning) {
        vehicleApi.setBrake(0, 2)
        vehicleApi.setBrake(0, 3)
      } else {
        vehicleApi.setBrake(coastBrake, 2)
        vehicleApi.setBrake(coastBrake, 3)
      }
    }
    /* Steering */
    const steerAngle =
      MAX_STEER - (MAX_STEER - MIN_STEER) * Math.min(Math.abs(fSpeed) / STEER_SPEED_MAX, 1)
    if (left) {
      vehicleApi.setSteeringValue(steerAngle, 2)
      vehicleApi.setSteeringValue(steerAngle, 3)
    } else if (right) {
      vehicleApi.setSteeringValue(-steerAngle, 2)
      vehicleApi.setSteeringValue(-steerAngle, 3)
    } else {
      vehicleApi.setSteeringValue(0, 2)
      vehicleApi.setSteeringValue(0, 3)
    }
  })
}
