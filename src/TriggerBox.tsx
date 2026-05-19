// TriggerBox.tsx
import { useBox } from "@react-three/cannon"
import * as THREE from "three"

interface TriggerBoxProps {
  position: [number, number, number]
  scale: [number, number, number]
  onCollide?: (e: any) => void
  color?: string
  collisionFilterMask?: number
}

export function TriggerBox({ position, scale, onCollide, color = "white", collisionFilterMask }: TriggerBoxProps) {
  useBox<THREE.Mesh>(() => ({
    args: scale,
    position,
    type: "Static",
    isTrigger: true,          // no physical response
    onCollide,                // fires when car enters
    ...(collisionFilterMask !== undefined ? { collisionFilterMask } : {}),
  }))

  return (
    <mesh position={position}>
      <boxGeometry args={scale} />
      <meshBasicMaterial color={color} opacity={0.25} transparent />
    </mesh>
  )
}
