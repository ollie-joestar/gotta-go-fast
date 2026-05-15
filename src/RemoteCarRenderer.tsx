import { useRef, useMemo } from "react"
import { useFrame } from "@react-three/fiber"
import { useGLTF } from "@react-three/drei"
import * as THREE from "three"
import type { RemotePlayer } from "./useMultiplayer"

interface RemoteCarRendererProps {
  remote: RemotePlayer
}

// Module-level scratch objects — no per-frame allocation
const _tp = new THREE.Vector3()
const _tq = new THREE.Quaternion()

export function RemoteCarRenderer({ remote }: RemoteCarRendererProps) {
  const { scene } = useGLTF("/models/car.glb")

  const carScene = useMemo(() => {
    const clone = scene.clone(true)
    const color = new THREE.Color(remote.color)
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        ;(child as THREE.Mesh).material = new THREE.MeshStandardMaterial({
          color,
          transparent: true,
          opacity: 0.8,
        })
      }
    })
    return clone
  }, [scene, remote.color])

  const groupRef = useRef<THREE.Group | null>(null)
  const seenRef = useRef(false)

  useFrame((_, delta) => {
    if (!groupRef.current) return
    const s = remote.playerState?.state
    if (!s?.pos || !s?.quat) return

    const [px, py, pz] = s.pos as [number, number, number]
    const [qx, qy, qz, qw] = s.quat as [number, number, number, number]
    _tp.set(px, py, pz)
    _tq.set(qx, qy, qz, qw)

    if (!seenRef.current) {
      // Snap to first received position instead of lerping from origin
      groupRef.current.position.copy(_tp)
      groupRef.current.quaternion.copy(_tq)
      seenRef.current = true
      return
    }

    // Lerp toward the latest received state — delta * 15 gives smooth catch-up at 20 Hz updates
    const t = Math.min(delta * 15, 1)
    groupRef.current.position.lerp(_tp, t)
    groupRef.current.quaternion.slerp(_tq, t)
  })

  return (
    <group ref={groupRef}>
      {/* Same local transform as Car.tsx to align the glb pivot correctly */}
      <group position={[7.3, -0.9, 1.4]} rotation={[0, Math.PI, 0]}>
        <primitive object={carScene} scale={0.02} />
      </group>
    </group>
  )
}
