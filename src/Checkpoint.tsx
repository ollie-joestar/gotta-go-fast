interface CheckpointProps {
  index: number
  position: [number, number, number]
  size: [number, number, number]
  visible?: boolean
  color?: string
}

export function Checkpoint({ position, size, visible = true, color = "cyan" }: CheckpointProps) {
  if (!visible) return null

  return (
    <mesh position={position}>
      <boxGeometry args={size} />
      <meshBasicMaterial color={color} wireframe />
    </mesh>
  )
}
