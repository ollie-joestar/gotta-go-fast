// Car.tsx — receives isRecording and exposes save via callback
import { useBox, useRaycastVehicle } from "@react-three/cannon"
import { useGLTF } from "@react-three/drei"
import { useRef, useEffect } from "react"
import type { RefObject } from "react"
import { useWheels } from "./Wheels"
import { WheelDebug } from "./WheelDebug"
import { useControls } from "./Controller"
import { useBotController } from "./BotController"
import { useFrame } from "@react-three/fiber"
import { useGhostRecorder } from "./GhostRecorder"
import { CHECKPOINTS } from "./checkpoints"
import { CAR_OPTIONS } from "./options"
import * as THREE from "three"

interface CarProps {
  thirdPerson: boolean
  isRecording: boolean
  onSaveReady: (saveFn: (lapMs: number) => void) => void
  onDebugSpeed: (speed: number) => void
  currentCheckpoint?: number
  isBot?: boolean
}

export function Car({ thirdPerson, isRecording, onSaveReady, onDebugSpeed, currentCheckpoint = 0, isBot = false }: CarProps) {
  const { scene } = useGLTF("/models/car.glb")
  const size = CAR_OPTIONS.size
  const position: [number, number, number] = [0, 1, 0]
  const wheelRadius = CAR_OPTIONS.wheelRadius
  const chassisBodyArgs = size

  const chassisRef = useRef<THREE.Mesh | null>(null)
  const visualRef = useRef<THREE.Group | null>(null)
  const smoothCamPos = useRef(new THREE.Vector3(0, CAR_OPTIONS.cameraHeight, CAR_OPTIONS.cameraDistance))
  const velocityRef = useRef<[number, number, number]>([0, 0, 0])
  const chassisPosRef = useRef<[number, number, number]>([0, 1, 0])
  const chassisQuatRef = useRef<[number, number, number, number]>([0, 0, 0, 1])

  const { tick, save } = useGhostRecorder(chassisRef, isRecording)

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

  const [wheels, wheelInfos] = useWheels(
    size[0], size[1], size[2] / 2 - wheelRadius, wheelRadius
  )

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

    if (visualRef.current) {
      visualRef.current.position.setFromMatrixPosition(chassisBody.current.matrixWorld)
      visualRef.current.quaternion.setFromRotationMatrix(chassisBody.current.matrixWorld)
    }

    tick(state.clock.getElapsedTime() * 1000)

    if (!thirdPerson) return

    // Use physics-subscribed refs instead of matrixWorld to avoid stale reads between physics ticks
    const [px, py, pz] = chassisPosRef.current
    const [qx, qy, qz, qw] = chassisQuatRef.current
    const pos = new THREE.Vector3(px, py, pz)
    const quat = new THREE.Quaternion(qx, qy, qz, qw)
    const wDir = new THREE.Vector3(0, 0, -1).applyQuaternion(quat).normalize()

    const idealPos = pos.clone()
      .add(wDir.clone().multiplyScalar(-CAR_OPTIONS.cameraDistance))
      .add(new THREE.Vector3(0, CAR_OPTIONS.cameraHeight, 0))

    // Frame-rate independent lerp: same visual smoothing at any refresh rate
    const posT = 1 - Math.pow(1 - CAR_OPTIONS.cameraLerpFactor, delta * 60)
    smoothCamPos.current.lerp(idealPos, posT)
    state.camera.position.copy(smoothCamPos.current)
    state.camera.lookAt(pos.clone().add(wDir.clone().multiplyScalar(CAR_OPTIONS.cameraLookAhead)))

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
      <group ref={vehicle}>
        <mesh ref={chassisBody} visible={true} />
        <WheelDebug radius={wheelRadius} wheelRef={wheels[0]} />
        <WheelDebug radius={wheelRadius} wheelRef={wheels[1]} />
        <WheelDebug radius={wheelRadius} wheelRef={wheels[2]} />
        <WheelDebug radius={wheelRadius} wheelRef={wheels[3]} />
      </group>
      <group ref={visualRef}>
        <group position={[7.3, -0.9, 1.4]} rotation={[0, Math.PI, 0]}>
          <primitive object={scene} scale={0.02} />
        </group>
      </group>
    </>
  )
}

useGLTF.preload("/models/car.glb")
