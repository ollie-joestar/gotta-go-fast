import { useBox } from "@react-three/cannon"
import * as THREE from "three"

interface CheckpointProps {
  index: number
  position: [number, number, number]
  size: [number, number, number]
  onTrigger: (index: number) => void
  visible?: boolean
  color?: string
}

export function Checkpoint({ index, position, size, onTrigger, visible = true, color = "cyan" }: CheckpointProps) {
  useBox<THREE.Mesh>(() => ({
    args: size,
    position,
    type: "Static",
    isTrigger: true,
    onCollide: () => onTrigger(index),
  }))

  if (!visible) return null

  return (
    <mesh position={position}>
      <boxGeometry args={size} />
      <meshBasicMaterial color={color} wireframe />
    </mesh>
  )
}
