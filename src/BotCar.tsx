// BOT_ENABLED — set to true to activate the multiplayer bot car.
// Also exported from useBotBridge.ts; import from here in Scene.tsx.
export const BOT_ENABLED = false

import { useBox, useRaycastVehicle } from "@react-three/cannon"
import { useGLTF, Html } from "@react-three/drei"
import React, { useRef, useEffect, useMemo } from "react"
import type { MutableRefObject, RefObject } from "react"
import { useWheels } from "./Wheels"
import { WheelDebug } from "./WheelDebug"
import { useBotBridge } from "./useBotBridge"
import { useFrame } from "@react-three/fiber"
import type { CheckpointDef } from "./tracks/track01"
import { CAR_OPTIONS, FFORCE, RFORCE } from "./options"
import * as THREE from "three"

const BRAKE_FORCE = CAR_OPTIONS.brakeForce
const FBRAKE_BIAS = CAR_OPTIONS.frontBrakeBias
const FBRAKE_S_BIAS = CAR_OPTIONS.frontStraightBias
const MAX_STEER = CAR_OPTIONS.maxSteer
const MIN_STEER = CAR_OPTIONS.minSteer
const STEER_SPEED_MAX = CAR_OPTIONS.steerSpeedMax

// Chassis is in group 2 so the finish-line TriggerBox (collisionFilterMask=1) ignores it.
const BOT_COLLISION_GROUP = 2

// Module-level scratch objects — no per-frame allocation
const _tv = new THREE.Vector3()
const _tq = new THREE.Quaternion()

interface BotCarProps {
  startPosition: [number, number, number]
  resetSignal?: number
  disabled?: boolean
  currentCheckpoint: number
  checkpoints: CheckpointDef[]
  onCheckpointTrigger?: (index: number) => void
  onFinishLineTrigger?: () => void
  finishLinePos?: [number, number, number]
  finishLineSize?: [number, number, number]
  onNetworkFrame?: (pos: [number, number, number], quat: [number, number, number, number], lap: number) => void
  lapKey: number
}

export function BotCar({
  startPosition,
  resetSignal,
  disabled = false,
  currentCheckpoint,
  checkpoints,
  onCheckpointTrigger,
  onFinishLineTrigger,
  finishLinePos,
  finishLineSize,
  onNetworkFrame,
  lapKey,
}: BotCarProps) {
  const { scene } = useGLTF("/models/car.glb")

  // Clone the shared GLB scene and apply red tint so bot is visually distinct
  const carScene = useMemo(() => {
    const clone = scene.clone(true)
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh
        mesh.material = new THREE.MeshStandardMaterial({
          color: new THREE.Color("#cc2222"),
          emissive: new THREE.Color("#330000"),
        })
        mesh.castShadow = true
        mesh.receiveShadow = true
      }
    })
    return clone
  }, [scene])

  const size = CAR_OPTIONS.size
  const chassisBodyArgs = size
  const wheelRadius = CAR_OPTIONS.wheelRadius

  const chassisRef = useRef<THREE.Mesh | null>(null)
  const visualRef = useRef<THREE.Group | null>(null)

  const smoothBodyPos = useRef(new THREE.Vector3(...startPosition))
  const smoothBodyQuat = useRef(new THREE.Quaternion())

  const positionRef = useRef<[number, number, number]>([...startPosition] as [number, number, number])
  const quaternionRef = useRef<[number, number, number, number]>([0, 0, 0, 1])
  const velocityRef = useRef<[number, number, number]>([0, 0, 0])

  // Per-checkpoint entry state — prevents re-firing while overlapping
  const cpInsideRef = useRef<boolean[]>([])
  // Finish line AABB state with 3-second cooldown (mirrors TriggerBox's COOLDOWN_MS)
  const finishInsideRef = useRef(false)
  const finishCooldownRef = useRef(0)

  const visualWheelRefs = [
    useRef<THREE.Object3D | null>(null),
    useRef<THREE.Object3D | null>(null),
    useRef<THREE.Object3D | null>(null),
    useRef<THREE.Object3D | null>(null),
  ]
  const wheelPosRefs = [
    useRef<[number, number, number]>([0, 0, 0]),
    useRef<[number, number, number]>([0, 0, 0]),
    useRef<[number, number, number]>([0, 0, 0]),
    useRef<[number, number, number]>([0, 0, 0]),
  ]
  const wheelQuatRefs = [
    useRef<[number, number, number, number]>([0, 0, 0, 1]),
    useRef<[number, number, number, number]>([0, 0, 0, 1]),
    useRef<[number, number, number, number]>([0, 0, 0, 1]),
    useRef<[number, number, number, number]>([0, 0, 0, 1]),
  ]

  const [chassisBody, chassisApi] = useBox(
    () => ({
      args: chassisBodyArgs,
      mass: CAR_OPTIONS.mass,
      position: startPosition,
      collisionFilterGroup: BOT_COLLISION_GROUP,
    }),
    chassisRef
  )

  useEffect(() => {
    const u1 = chassisApi.velocity.subscribe((v: [number, number, number]) => { velocityRef.current = v })
    const u2 = chassisApi.position.subscribe((p: [number, number, number]) => { positionRef.current = p })
    const u3 = chassisApi.quaternion.subscribe((q: [number, number, number, number]) => { quaternionRef.current = q })
    return () => { u1(); u2(); u3() }
  }, [chassisApi])

  useEffect(() => {
    if (!resetSignal) return
    const [x, y, z] = startPosition
    chassisApi.position.set(x, y, z)
    chassisApi.velocity.set(0, 0, 0)
    chassisApi.angularVelocity.set(0, 0, 0)
    chassisApi.quaternion.set(0, 0, 0, 1)
    smoothBodyPos.current.set(x, y, z)
    smoothBodyQuat.current.set(0, 0, 0, 1)
  }, [resetSignal])

  const [wheels, wheelInfos, wheelApis] = useWheels(
    size[0], size[1], size[2] / 2 - wheelRadius, wheelRadius
  )

  useEffect(() => {
    const unsubs: (() => void)[] = []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    wheelApis.forEach((api: any, i: number) => {
      unsubs.push(api.position.subscribe((p: [number, number, number]) => { wheelPosRefs[i].current = p }))
      unsubs.push(api.quaternion.subscribe((q: [number, number, number, number]) => { wheelQuatRefs[i].current = q }))
    })
    return () => unsubs.forEach(u => u())
  }, [])

  const vehicleRef = useRef<THREE.Object3D | null>(null)
  const [vehicle, vehicleApi] = useRaycastVehicle(
    () => ({
      chassisBody: chassisRef as RefObject<THREE.Object3D | null>,
      wheelInfos,
      wheels,
    }),
    vehicleRef
  )

  useEffect(() => {
    for (let i = 0; i < 4; i++) {
      vehicleApi.applyEngineForce(0, i)
      vehicleApi.setBrake(disabled ? CAR_OPTIONS.brakeForce * 3 : 0, i)
    }
  }, [disabled])

  const { commands } = useBotBridge({
    enabled: !disabled,
    positionRef,
    quaternionRef,
    velocityRef,
    currentCheckpoint,
    allCheckpoints: checkpoints,
  })

  const lastNetworkSendRef = useRef(0)

  useFrame((_, delta) => {
    if (!chassisBody.current) return

    // Zeroing velocity guarantees the car stays still while disabled (mirrors Car.tsx)
    if (disabled) {
      chassisApi.velocity.set(0, 0, 0)
      chassisApi.angularVelocity.set(0, 0, 0)
    }

    // Network broadcast throttled to ~20 Hz — mirrors human player broadcast in Car.tsx
    const perfNow = performance.now()
    if (perfNow - lastNetworkSendRef.current >= 50) {
      lastNetworkSendRef.current = perfNow
      onNetworkFrame?.(positionRef.current, quaternionRef.current, lapKey)
    }

    // Pure AABB checkpoint detection — mirrors Car.tsx exactly
    if (checkpoints && onCheckpointTrigger) {
      const [px, py, pz] = positionRef.current
      for (let i = 0; i < checkpoints.length; i++) {
        const [cx, cy, cz] = checkpoints[i].position
        const [sx, sy, sz] = checkpoints[i].size
        const inside =
          Math.abs(px - cx) <= sx / 2 &&
          Math.abs(py - cy) <= sy / 2 &&
          Math.abs(pz - cz) <= sz / 2
        if (inside && !cpInsideRef.current[i]) onCheckpointTrigger(i)
        cpInsideRef.current[i] = inside
      }
    }

    // Finish line AABB check (bot chassis is filtered out of the physics TriggerBox by
    // collisionFilterGroup/collisionFilterMask, so we replicate the trigger via AABB).
    if (finishLinePos && finishLineSize && onFinishLineTrigger) {
      const [px, py, pz] = positionRef.current
      const [cx, cy, cz] = finishLinePos
      const [sx, sy, sz] = finishLineSize
      const inside =
        Math.abs(px - cx) <= sx / 2 &&
        Math.abs(py - cy) <= sy / 2 &&
        Math.abs(pz - cz) <= sz / 2
      const now = Date.now()
      if (inside && !finishInsideRef.current && now - finishCooldownRef.current > 3000) {
        finishCooldownRef.current = now
        onFinishLineTrigger()
      }
      finishInsideRef.current = inside
    }

    // Apply AI commands to vehicle physics — same logic as BotController.tsx
    if (!disabled) {
      type BotCommands = { forward: boolean; backward: boolean; left: boolean; right: boolean }
      let bot: BotCommands = { forward: false, backward: false, left: false, right: false }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const incoming: any = commands.current
      if (incoming instanceof Set) {
        bot = {
          forward: incoming.has("forward"),
          backward: incoming.has("backward"),
          left: incoming.has("left") || incoming.has("turn_left"),
          right: incoming.has("right") || incoming.has("turn_right"),
        }
      } else if (incoming && typeof incoming === "object") {
        bot = {
          forward: !!incoming.forward,
          backward: !!incoming.backward,
          left: !!incoming.left,
          right: !!incoming.right,
        }
      }
      const { forward, backward, left, right } = bot

      const [qx, qy, qz, qw] = quaternionRef.current
      const [vx, vy, vz] = velocityRef.current
      const fwdX = -2 * (qx * qz + qw * qy)
      const fwdY = -2 * (qy * qz - qw * qx)
      const fwdZ = -(1 - 2 * (qx * qx + qy * qy))
      const fSpeed = vx * fwdX + vy * fwdY + vz * fwdZ

      const turning = left || right
      const frontBrake = turning ? BRAKE_FORCE * FBRAKE_BIAS : BRAKE_FORCE * FBRAKE_S_BIAS
      const rearBrake = BRAKE_FORCE

      if (forward) {
        for (let i = 0; i < 4; i++) vehicleApi.setBrake(0, i)
        vehicleApi.applyEngineForce(RFORCE, 0)
        vehicleApi.applyEngineForce(RFORCE, 1)
        vehicleApi.applyEngineForce(FFORCE, 2)
        vehicleApi.applyEngineForce(FFORCE, 3)
      } else if (backward) {
        for (let i = 0; i < 4; i++) vehicleApi.applyEngineForce(0, i)
        vehicleApi.setBrake(rearBrake, 0)
        vehicleApi.setBrake(rearBrake, 1)
        vehicleApi.setBrake(frontBrake, 2)
        vehicleApi.setBrake(frontBrake, 3)
      } else {
        for (let i = 0; i < 4; i++) vehicleApi.applyEngineForce(0, i)
        const coastBrake = Math.abs(fSpeed) > 0.15 ? CAR_OPTIONS.coastBrakeForce : 0
        vehicleApi.setBrake(coastBrake, 0)
        vehicleApi.setBrake(coastBrake, 1)
        if (turning) {
          vehicleApi.setBrake(0, 2)
          vehicleApi.setBrake(0, 3)
        } else {
          vehicleApi.setBrake(coastBrake, 2)
          vehicleApi.setBrake(coastBrake, 3)
        }
      }

      const steerAngle = MAX_STEER - (MAX_STEER - MIN_STEER) * Math.min(Math.abs(fSpeed) / STEER_SPEED_MAX, 1)
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
    }

    // Smooth visual toward subscribed physics position — mirrors Car.tsx
    const visualT = 1 - Math.pow(1 - CAR_OPTIONS.visualLerpFactor, delta * 60)
    if (visualRef.current) {
      const [px, py, pz] = positionRef.current
      const [qx, qy, qz, qw] = quaternionRef.current
      smoothBodyPos.current.lerp(_tv.set(px, py, pz), visualT)
      smoothBodyQuat.current.slerp(_tq.set(qx, qy, qz, qw), visualT)
      visualRef.current.position.copy(smoothBodyPos.current)
      visualRef.current.quaternion.copy(smoothBodyQuat.current)
    }

    for (let i = 0; i < 4; i++) {
      const vis = visualWheelRefs[i].current
      if (vis) {
        vis.position.lerp(_tv.set(...wheelPosRefs[i].current), visualT)
        vis.quaternion.slerp(_tq.set(...wheelQuatRefs[i].current), visualT)
      }
    }
  })

  return (
    <>
      {/* Physics bodies — same structure as Car.tsx */}
      <group ref={vehicle}>
        <group ref={wheels[0] as MutableRefObject<THREE.Group>} visible={false} />
        <group ref={wheels[1] as MutableRefObject<THREE.Group>} visible={false} />
        <group ref={wheels[2] as MutableRefObject<THREE.Group>} visible={false} />
        <group ref={wheels[3] as MutableRefObject<THREE.Group>} visible={false} />
      </group>

      {/* Visual car body — red-tinted clone of the player car + "BOT" nameplate */}
      <group ref={visualRef}>
        <group position={[7.3, -0.9, 1.4]} rotation={[0, Math.PI, 0]}>
          <primitive object={carScene} scale={0.02} />
        </group>
        <Html position={[0, 2.5, 0]} center distanceFactor={20}>
          <div style={{ color: "#ff4444", fontWeight: "bold", fontSize: "14px", textShadow: "0 0 4px #000" }}>BOT</div>
        </Html>
      </group>

      {/* Visual wheels — scene root so local position = world position */}
      <WheelDebug radius={wheelRadius} wheelRef={visualWheelRefs[0]} />
      <WheelDebug radius={wheelRadius} wheelRef={visualWheelRefs[1]} />
      <WheelDebug radius={wheelRadius} wheelRef={visualWheelRefs[2]} />
      <WheelDebug radius={wheelRadius} wheelRef={visualWheelRefs[3]} />
    </>
  )
}
