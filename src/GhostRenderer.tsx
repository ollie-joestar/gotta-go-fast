// GhostRenderer.tsx
import { useRef, useEffect, useMemo } from "react"
import { useFrame } from "@react-three/fiber"
import { useGLTF } from "@react-three/drei"
import * as THREE from "three"
import type { GhostData } from "./DataTypes"

interface GhostRendererProps {
  ghostData: GhostData
  startSignal: number  // increments every time the ghost should restart from frame 0
}

// Module-level scratch objects — avoids per-frame allocation
const _p0 = new THREE.Vector3()
const _p1 = new THREE.Vector3()
const _q0 = new THREE.Quaternion()
const _q1 = new THREE.Quaternion()

export function GhostRenderer({ ghostData, startSignal }: GhostRendererProps) {
  const { scene } = useGLTF("/models/car.glb")

  // Deep-clone the car scene so it can exist independently from the player car
  const ghostScene = useMemo(() => {
    const clone = scene.clone(true)
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        ;(child as THREE.Mesh).material = new THREE.MeshStandardMaterial({
          color: 0x44aaff,
          transparent: true,
          opacity: 0.45,
          depthWrite: false,
        })
      }
    })
    return clone
  }, [scene])

  const groupRef = useRef<THREE.Group | null>(null)
  const startTimeRef = useRef<number | null>(null)
  const hasStartedRef = useRef(false)

  useEffect(() => {
    if (startSignal === 0) return  // don't play until the first S/F crossing
    hasStartedRef.current = true
    startTimeRef.current = null  // reset clock on next frame
    if (groupRef.current) groupRef.current.visible = true
  }, [startSignal])

  useFrame((state) => {
    if (!groupRef.current || !hasStartedRef.current) return

    const now = state.clock.getElapsedTime() * 1000
    if (startTimeRef.current === null) startTimeRef.current = now
    const elapsed = now - startTimeRef.current

    const frames = ghostData.frames
    if (frames.length < 2) return
    if (elapsed >= frames[frames.length - 1].t) return  // ghost lap finished

    // Binary search for lower-bound frame index
    let lo = 0, hi = frames.length - 2
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1
      if (frames[mid].t <= elapsed) lo = mid
      else hi = mid - 1
    }

    const f0 = frames[lo]
    const f1 = frames[lo + 1]
    const alpha = (elapsed - f0.t) / (f1.t - f0.t)

    _p0.set(f0.p[0], f0.p[1], f0.p[2])
    _p1.set(f1.p[0], f1.p[1], f1.p[2])
    _q0.set(f0.q[0], f0.q[1], f0.q[2], f0.q[3])
    _q1.set(f1.q[0], f1.q[1], f1.q[2], f1.q[3])

    groupRef.current.position.copy(_p0.lerp(_p1, alpha))
    groupRef.current.quaternion.copy(_q0.slerp(_q1, alpha))
  })

  return (
    <group ref={groupRef} visible={false}>
      {/* Same local transform as Car.tsx to align the glb pivot correctly */}
      <group position={[7.3, -0.9, 1.4]} rotation={[0, Math.PI, 0]}>
        <primitive object={ghostScene} scale={0.02} />
      </group>
    </group>
  )
}
