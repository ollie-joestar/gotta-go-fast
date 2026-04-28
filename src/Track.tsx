// Track.tsx
import { useGLTF } from "@react-three/drei"
import { useEffect } from "react"
import * as THREE from "three"

export function Track() {
  // const { scene } = useGLTF("/models/track_drift.glb")
  const { scene } = useGLTF("/models/Spielberg.glb")

  useEffect(() => {
    scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.material.side = THREE.DoubleSide
      }
    })
  }, [scene])

  return <primitive object={scene} />

}
