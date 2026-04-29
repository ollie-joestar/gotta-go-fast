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

const CONSOLE_LOG_INTERVAL = 10000  // ms

interface BotControllerOptions {
  vehicleApi: any
  chassisApi: any
  currentCheckpoint: number
  allCheckpoints: CheckpointDef[]
  enabled?: boolean
}

export function useBotController({ vehicleApi, chassisApi, currentCheckpoint, allCheckpoints, enabled = true }: BotControllerOptions) {
  const velocity = useRef<[number, number, number]>([0, 0, 0])
  const quaternion = useRef<[number, number, number, number]>([0, 0, 0, 1])
  const position = useRef<[number, number, number]>([0, 0, 0])

  const { sendFrame, commands, lastReceivedAt } = useAISocket()
  const lastLoggedReceivedAt = useRef<number>(0)
  const lastLogTime = useRef<number>(0)

  useEffect(() => {
    const unsubVel = chassisApi.velocity.subscribe((v: [number, number, number]) => { velocity.current = v })
    const unsubRot = chassisApi.quaternion.subscribe((q: [number, number, number, number]) => { quaternion.current = q })
    const unsubPos = chassisApi.position.subscribe((p: [number, number, number]) => { position.current = p })
    return () => { unsubVel(); unsubRot(); unsubPos() }
  }, [chassisApi])

  useFrame(() => {
    if (!enabled) return
    const total = allCheckpoints.length
    if (total === 0) return

    // Send current state to the Go server.
    const nextCheckpoints: Checkpoints = {
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
      checkpoints: nextCheckpoints,
    }
    sendFrame(frame)

    // Read commands the Go server sent back.
    const cmds = commands.current
    const forward = cmds.has("forward")
    const backward = cmds.has("backward")
    const left = cmds.has("turn_left")
    const right = cmds.has("turn_right")

    // Speed along local forward axis (same math as Controller.tsx).
    const [qx, qy, qz, qw] = quaternion.current
    const [vx, vy, vz] = velocity.current
    const fwdX = -2 * (qx * qz + qw * qy)
    const fwdY = -2 * (qy * qz - qw * qx)
    const fwdZ = -(1 - 2 * (qx * qx + qy * qy))
    const fSpeed = vx * fwdX + vy * fwdY + vz * fwdZ

    const now = Date.now()
    const newMessage = lastReceivedAt.current !== lastLoggedReceivedAt.current
    const timeout = now - lastLogTime.current >= CONSOLE_LOG_INTERVAL
    if (newMessage || timeout) {
      console.log("Bot commands:", { forward, backward, left, right })
      lastLoggedReceivedAt.current = lastReceivedAt.current
      lastLogTime.current = now
    }

    const isTurning = left || right
    const frontBrake = isTurning ? BRAKE_FORCE * FBRAKE_BIAS : BRAKE_FORCE
    const rearBrake = BRAKE_FORCE

    if (forward) {
      vehicleApi.setBrake(0, 0); vehicleApi.setBrake(0, 1);
      vehicleApi.setBrake(0, 2); vehicleApi.setBrake(0, 3)
      vehicleApi.applyEngineForce(RFORCE, 0); vehicleApi.applyEngineForce(RFORCE, 1)
      vehicleApi.applyEngineForce(FFORCE, 2); vehicleApi.applyEngineForce(FFORCE, 3)
    } else if (backward) {
      vehicleApi.applyEngineForce(0, 0); vehicleApi.applyEngineForce(0, 1)
      vehicleApi.applyEngineForce(0, 2); vehicleApi.applyEngineForce(0, 3)
      vehicleApi.setBrake(rearBrake, 0); vehicleApi.setBrake(rearBrake, 1)
      vehicleApi.setBrake(frontBrake, 2); vehicleApi.setBrake(frontBrake, 3)
    } else {
      vehicleApi.applyEngineForce(0, 0); vehicleApi.applyEngineForce(0, 1)
      vehicleApi.applyEngineForce(0, 2); vehicleApi.applyEngineForce(0, 3)
      const coastBrake = Math.abs(fSpeed) > 0.15 ? CAR_OPTIONS.coastBrakeForce : 0
      if (left || right) {
        vehicleApi.setBrake(0, 2); vehicleApi.setBrake(0, 3);
      } else {
        vehicleApi.setBrake(coastBrake, 2); vehicleApi.setBrake(coastBrake, 3);
      }
    }

    const steerAngle = MAX_STEER - (MAX_STEER - MIN_STEER) * Math.min(Math.abs(fSpeed) / STEER_SPEED_MAX, 1)
    if (left) {
      vehicleApi.setSteeringValue(steerAngle, 2); vehicleApi.setSteeringValue(steerAngle, 3)
    } else if (right) {
      vehicleApi.setSteeringValue(-steerAngle, 2); vehicleApi.setSteeringValue(-steerAngle, 3)
    } else {
      vehicleApi.setSteeringValue(0, 0); vehicleApi.setSteeringValue(0, 1)
      vehicleApi.setSteeringValue(0, 2); vehicleApi.setSteeringValue(0, 3)
    }
  })
}
