// Car.tsx — receives isRecording and exposes save via callback
import { useBox, useRaycastVehicle } from "@react-three/cannon"
import { useGLTF } from "@react-three/drei"
import React, { useRef, useEffect } from "react"
import type { RefObject } from "react"
import { useWheels } from "./Wheels"
import { WheelDebug } from "./WheelDebug"
import { useControls } from "./Controller"
import { useBotController } from "./BotController"
import { useFrame } from "@react-three/fiber"
import { useGhostRecorder } from "./GhostRecorder"
import { CHECKPOINTS, CAR_START_POSITION } from "./tracks/track01"
import type { CheckpointDef } from "./tracks/track01"
import { CAR_OPTIONS } from "./options"
import type { AIDebugFrame } from "./aiTypes"
import * as THREE from "three"

interface CarProps {
  thirdPerson: boolean
  lapKey: number
  onSaveReady: (saveFn: (lapMs: number) => void) => void
  onDebugSpeed: (speed: number) => void
  onDebugTransform?: (pos: [number, number, number], quat: [number, number, number, number]) => void
  onLapTime?: (ms: number) => void
  lapStartTimeRef?: React.RefObject<number | null>
  currentCheckpoint?: number
  isBot?: boolean
  checkpoints?: CheckpointDef[]
  onCheckpointTrigger?: (index: number) => void
  onDebugAIFrame?: (frame: AIDebugFrame) => void
}

export function Car({ thirdPerson, lapKey, onSaveReady, onDebugSpeed, onDebugTransform, onLapTime, lapStartTimeRef, currentCheckpoint = 0, isBot = false, checkpoints, onCheckpointTrigger, onDebugAIFrame }: CarProps) {
  const { scene } = useGLTF("/models/car.glb")
  const size = CAR_OPTIONS.size
  const position = CAR_START_POSITION
  const wheelRadius = CAR_OPTIONS.wheelRadius
  const chassisBodyArgs = size

  const chassisRef = useRef<THREE.Mesh | null>(null)
  const visualRef = useRef<THREE.Group | null>(null)

  // Smoothed body position/quaternion — lerped each frame toward physics subscription
  const smoothBodyPos = useRef(new THREE.Vector3(0, 1, 0))
  const smoothBodyQuat = useRef(new THREE.Quaternion())

  // Which checkpoints the car is currently inside — prevents re-firing while overlapping
  const cpInsideRef = useRef<boolean[]>([])

  // Visual wheel refs — rendered at scene root, positioned via subscribed world positions
  const visualWheelRefs = [
    useRef<THREE.Object3D | null>(null),
    useRef<THREE.Object3D | null>(null),
    useRef<THREE.Object3D | null>(null),
    useRef<THREE.Object3D | null>(null),
  ]

  // Subscribed wheel world positions — same reliable mechanism as chassis
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

  const camYaw = useRef(0)
  const velocityRef = useRef<[number, number, number]>([0, 0, 0])
  const chassisPosRef = useRef<[number, number, number]>([0, 1, 0])
  const chassisQuatRef = useRef<[number, number, number, number]>([0, 0, 0, 1])

  const { tick, save } = useGhostRecorder(chassisRef, lapKey)

  useEffect(() => {
    onSaveReady(save)
  }, [save, onSaveReady])

  const [chassisBody, chassisApi] = useBox(
    () => ({ args: chassisBodyArgs, mass: CAR_OPTIONS.mass, position }),
    chassisRef
  )

  useEffect(() => {
    const unsubVel = chassisApi.velocity.subscribe((v: [number, number, number]) => { velocityRef.current = v })
    const unsubPos = chassisApi.position.subscribe((p: [number, number, number]) => { chassisPosRef.current = p })
    const unsubQuat = chassisApi.quaternion.subscribe((q: [number, number, number, number]) => { chassisQuatRef.current = q })
    return () => { unsubVel(); unsubPos(); unsubQuat() }
  }, [chassisApi])

  const [wheels, wheelInfos, wheelApis] = useWheels(
    size[0], size[1], size[2] / 2 - wheelRadius, wheelRadius
  )

  // Subscribe to wheel world positions — the only reliable way to read them from cannon

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

  const { debugSpeed } = useControls(vehicleApi, chassisApi, !isBot)
  useBotController({ vehicleApi, chassisApi, currentCheckpoint, allCheckpoints: CHECKPOINTS, enabled: isBot })

  useEffect(() => {
    onDebugSpeed(debugSpeed)
  }, [debugSpeed, onDebugSpeed])

  useFrame((state, delta) => {
    if (!chassisBody.current) return

    tick(state.clock.getElapsedTime() * 1000)

    onDebugTransform?.(chassisPosRef.current, chassisQuatRef.current)
    onLapTime?.(lapStartTimeRef?.current != null ? Date.now() - lapStartTimeRef.current : 0)

    // Pure AABB checkpoint detection — no physics body on checkpoints, zero bump
    if (checkpoints && onCheckpointTrigger) {
      const [px, py, pz] = chassisPosRef.current
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

    // AI debug frame — assembled each frame for both player and bot
    if (onDebugAIFrame) {
      const total = CHECKPOINTS.length
      const c0 = CHECKPOINTS[(currentCheckpoint + 0) % total]
      const c1 = CHECKPOINTS[(currentCheckpoint + 1) % total]
      const c2 = CHECKPOINTS[(currentCheckpoint + 2) % total]
      onDebugAIFrame({
        position: chassisPosRef.current,
        quaternion: chassisQuatRef.current,
        velocity: velocityRef.current,
        totalCheckpoints: total,
        currentCheckpoint,
        nextCheckpoints: [
          { position: c0.position, size: c0.size },
          { position: c1.position, size: c1.size },
          { position: c2.position, size: c2.size },
        ],
      })
    }

    // Fast lerp factor — nearly instant, just removes physics-render timing jitter
    const visualT = 1 - Math.pow(1 - CAR_OPTIONS.visualLerpFactor, delta * 60)

    // Smooth car body visual toward subscribed chassis world position
    if (visualRef.current) {
      const [px, py, pz] = chassisPosRef.current
      const [qx, qy, qz, qw] = chassisQuatRef.current
      smoothBodyPos.current.lerp(_tv.set(px, py, pz), visualT)
      smoothBodyQuat.current.slerp(_tq.set(qx, qy, qz, qw), visualT)
      visualRef.current.position.copy(smoothBodyPos.current)
      visualRef.current.quaternion.copy(smoothBodyQuat.current)
    }

    // Smooth visual wheels toward subscribed wheel world positions
    // WheelDebug is at scene root so local position = world position — no coordinate space mismatch
    for (let i = 0; i < 4; i++) {
      const vis = visualWheelRefs[i].current
      if (vis) {
        vis.position.lerp(_tv.set(...wheelPosRefs[i].current), visualT)
        vis.quaternion.slerp(_tq.set(...wheelQuatRefs[i].current), visualT)
      }
    }

    if (!thirdPerson) return

    const [qx, qy, qz, qw] = chassisQuatRef.current

    // Project car's forward onto the horizontal plane for a yaw that is completely
    // immune to car pitch and roll — Euler decomposition would flip under those conditions
    _tv.set(0, 0, -1).applyQuaternion(_tq2.set(qx, qy, qz, qw))
    _tv.y = 0
    if (_tv.lengthSq() > 1e-6) _tv.normalize()
    const targetYaw = Math.atan2(-_tv.x, -_tv.z)

    // Spring the camera yaw toward car heading — this is what gives the
    // arcade "camera swings into corners" feel without any world-space position lag
    const yawT = 1 - Math.pow(1 - CAR_OPTIONS.cameraYawLerp, delta * 60)
    let yawDiff = targetYaw - camYaw.current
    while (yawDiff > Math.PI) yawDiff -= Math.PI * 2
    while (yawDiff < -Math.PI) yawDiff += Math.PI * 2
    camYaw.current += yawDiff * yawT

    // Camera position: visual car pos + fixed offset rotated by camera yaw.
    // Using smoothBodyPos (the visual position) means camera and rendered car are
    // always in sync — no screen-space jitter regardless of physics tick timing.
    const carPos = smoothBodyPos.current
    _tq.setFromAxisAngle(_up, camYaw.current)
    _tv.set(0, CAR_OPTIONS.cameraHeight, CAR_OPTIONS.cameraDistance).applyQuaternion(_tq)
    state.camera.position.copy(carPos).add(_tv)

    // Look-at: derive direction from camYaw (already spring-smoothed) so camera
    // position and look-at are always consistent — no physics quat involved, no jitter.
    _tv.set(-Math.sin(camYaw.current), 0, -Math.cos(camYaw.current))
    _tv2.copy(carPos).addScaledVector(_tv, CAR_OPTIONS.cameraLookAhead)
    state.camera.lookAt(_tv2)

    const [vx, vy, vz] = velocityRef.current
    const speed = Math.sqrt(vx * vx + vy * vy + vz * vz)
    const cam = state.camera as THREE.PerspectiveCamera
    const targetFov = THREE.MathUtils.lerp(CAR_OPTIONS.cameraFovBase, CAR_OPTIONS.cameraFovMax, Math.min(speed / CAR_OPTIONS.cameraFovSpeedMax, 1))
    const fovT = 1 - Math.pow(1 - CAR_OPTIONS.cameraFovLerp, delta * 60)
    cam.fov = THREE.MathUtils.lerp(cam.fov, targetFov, fovT)
    cam.updateProjectionMatrix()
  })

  return (
    <>
      {/* Physics bodies — cannon needs mounted refs; nothing here is rendered */}
      <group ref={vehicle}>
        <mesh ref={chassisBody} visible={false} />
        <group ref={wheels[0] as React.MutableRefObject<THREE.Group>} visible={false} />
        <group ref={wheels[1] as React.MutableRefObject<THREE.Group>} visible={false} />
        <group ref={wheels[2] as React.MutableRefObject<THREE.Group>} visible={false} />
        <group ref={wheels[3] as React.MutableRefObject<THREE.Group>} visible={false} />
      </group>

      {/* Visual car body — scene root, smoothed toward subscribed chassis world position */}
      <group ref={visualRef}>
        <group position={[7.3, -0.9, 1.4]} rotation={[0, Math.PI, 0]}>
          <primitive object={scene} scale={0.02} />
        </group>
      </group>

      {/* Visual wheels — scene root so local position = world position; lerped via subscriptions */}
      <WheelDebug radius={wheelRadius} wheelRef={visualWheelRefs[0]} />
      <WheelDebug radius={wheelRadius} wheelRef={visualWheelRefs[1]} />
      <WheelDebug radius={wheelRadius} wheelRef={visualWheelRefs[2]} />
      <WheelDebug radius={wheelRadius} wheelRef={visualWheelRefs[3]} />
    </>
  )
}

useGLTF.preload("/models/car.glb")

// Module-level scratch objects to avoid allocating per frame
const _tv = new THREE.Vector3()
const _tv2 = new THREE.Vector3()
const _tq = new THREE.Quaternion()
const _tq2 = new THREE.Quaternion()
const _up = new THREE.Vector3(0, 1, 0)
