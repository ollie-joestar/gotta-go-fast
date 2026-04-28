// Car.tsx — receives isRecording and exposes save via callback
import { useBox, useRaycastVehicle } from "@react-three/cannon"
import { useGLTF } from "@react-three/drei"
import { useRef, useEffect } from "react"
import type { RefObject } from "react"
import { useWheels } from "./Wheels"
import { WheelDebug } from "./WheelDebug"
import { useControls } from "./Controller"
import { useFrame } from "@react-three/fiber"
import { useGhostRecorder } from "./GhostRecorder"
import * as THREE from "three"

interface CarProps {
  thirdPerson: boolean
  isRecording: boolean
  onSaveReady: (saveFn: (lapMs: number) => void) => void
  onDebugSpeed: (speed: number) => void
}

const carMass = 1200 as number

export function Car({ thirdPerson, isRecording, onSaveReady, onDebugSpeed }: CarProps) {
  const { scene } = useGLTF("/models/car.glb")
  const size: [number, number, number] = [2.4, 1.3, 6]
  const position: [number, number, number] = [0, 1, 0]
  const wheelRadius = 0.43
  const chassisBodyArgs = size

  const chassisRef = useRef<THREE.Mesh | null>(null)
  const visualRef = useRef<THREE.Group | null>(null)

  const { tick, save } = useGhostRecorder(chassisRef, isRecording)

  // expose save to Scene via callback so Scene can call it on lap finish
  useEffect(() => {
    onSaveReady(save)
  }, [save, onSaveReady])

  const [chassisBody, chassisApi] = useBox(
    () => ({ args: chassisBodyArgs, mass: carMass, position }),
    chassisRef
  )

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

  const { debugSpeed } = useControls(vehicleApi, chassisApi)

  useEffect(() => {
    onDebugSpeed(debugSpeed)
  }, [debugSpeed, onDebugSpeed])

  useFrame((state) => {
    if (!chassisBody.current) return

    if (visualRef.current) {
      visualRef.current.position.setFromMatrixPosition(chassisBody.current.matrixWorld)
      visualRef.current.quaternion.setFromRotationMatrix(chassisBody.current.matrixWorld)
    }

    tick(state.clock.getElapsedTime() * 1000)

    if (!thirdPerson) return
    const pos = new THREE.Vector3()
    pos.setFromMatrixPosition(chassisBody.current.matrixWorld)
    const quaternion = new THREE.Quaternion()
    quaternion.setFromRotationMatrix(chassisBody.current.matrixWorld)
    const wDir = new THREE.Vector3(0, 0, -1)
    wDir.applyQuaternion(quaternion)
    wDir.normalize()
    const camPos = pos.clone().add(
      wDir.clone().multiplyScalar(-10).add(new THREE.Vector3(0, 5, 0))
    )
    state.camera.position.copy(camPos)
    state.camera.lookAt(pos)
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
