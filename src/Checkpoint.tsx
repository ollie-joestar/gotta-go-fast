interface CheckpointProps {
  index: number
  position: [number, number, number]
  size: [number, number, number]
  visualSize?: [number, number, number]
  rotation?: [number, number, number]
  visible?: boolean
  color?: string
}

export function Checkpoint({ position, size, visualSize, rotation, visible = true, color = "cyan" }: CheckpointProps) {
  if (!visible) return null

  return (
    <mesh position={position} rotation={rotation ?? [0, 0, 0]}>
      <boxGeometry args={visualSize ?? size} />
      <meshBasicMaterial color={color} wireframe />
    </mesh>
  )
}
