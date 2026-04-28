// ColliderBox.tsx
import { useBox } from "@react-three/cannon"
import * as THREE from "three"

const debug = true

interface ColliderBoxProps {
  position: [number, number, number]
  scale: [number, number, number]
  color?: THREE.Color | [number, number, number] | string
}

export function ColliderBox({ position, scale, color = "black" }: ColliderBoxProps) {
  useBox<THREE.Mesh>(() => ({
    args: scale,
    position,
    type: "Static",
  }))

  return (
    debug && (
      <mesh position={position}>
        <boxGeometry args={scale} />
        {/* <meshBasicMaterial color={color} transparent opacity={0.95} /> */}
        <meshBasicMaterial color={color} transparent opacity={1} />
      </mesh>
    )
  )
}
