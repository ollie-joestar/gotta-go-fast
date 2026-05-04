// Scene.tsx — owns all recording state, passes down as props
import { Environment, OrbitControls, PerspectiveCamera } from "@react-three/drei"
import { useThree } from "@react-three/fiber"
import { Suspense, useState, useEffect, useRef, useCallback } from "react"

function FPSCap({ fps = 60 }) {
  const { invalidate } = useThree()
  useEffect(() => {
    const interval = 1000 / fps
    let last = 0
    let id: number
    const tick = (now: number) => {
      id = requestAnimationFrame(tick)
      if (now - last >= interval) {
        last = now - ((now - last) % interval)
        invalidate()
      }
    }
    id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [fps, invalidate])
  return null
}
import { Car } from "./Car"
import { Ground } from "./Ground"
import { Colliders, CHECKPOINTS } from "./tracks/track01"
import { Checkpoint } from "./Checkpoint"
import { GhostRenderer } from "./GhostRenderer"
import type { GhostData } from "./DataTypes"

interface SceneProps {
  onDebugSpeed: (speed: number) => void
  onDebugTransform?: (pos: [number, number, number], quat: [number, number, number, number]) => void
  onLapTime?: (ms: number) => void
  ghostData?: GhostData
}

// Scene.tsx
export function Scene({ onDebugSpeed, onDebugTransform, onLapTime, ghostData }: SceneProps) {
  const [thirdPerson, setThirdPerson] = useState<boolean>(true)
  const [lapKey, setLapKey] = useState<number>(0)
  const lapKeyRef = useRef<number>(0)
  const [currentCheckpoint, setCurrentCheckpoint] = useState<number>(0)
  const [ghostStartSignal, setGhostStartSignal] = useState<number>(0)
  const lapStartTime = useRef<number | null>(null)
  const saveRef = useRef<((lapMs: number) => void) | null>(null)
  const triggerCooldownRef = useRef<number>(0)

  useEffect(() => {
    function keydownHandler(e: KeyboardEvent) {
      if (e.key === "c") setThirdPerson(prev => !prev)
      if (e.key === "r") {
        lapKeyRef.current = 0
        setLapKey(0)
        lapStartTime.current = null
        triggerCooldownRef.current = 0
        console.log("Recording reset via 'r'")
      }
    }
    window.addEventListener("keydown", keydownHandler)
    return () => window.removeEventListener("keydown", keydownHandler)
  }, [])

  const handleTrigger = useCallback(() => {
    const now = Date.now()
    setGhostStartSignal(s => s + 1)
    if (lapKeyRef.current > 0 && lapStartTime.current !== null) {
      const lapMs = now - lapStartTime.current
      console.log("Lap finished, ms:", lapMs)
      saveRef.current?.(lapMs)
    }
    lapKeyRef.current += 1
    setLapKey(lapKeyRef.current)
    lapStartTime.current = now
    console.log("Lap started/restarted, lapKey:", lapKeyRef.current)
  }, [])

  const handleSaveReady = useCallback((saveFn: (lapMs: number) => void) => {
    saveRef.current = saveFn
  }, [])

  return (
    <Suspense fallback={null}>
      <FPSCap fps={60} />
      <Environment files="/textures/skybox_sky.hdr" background="both" />
      <PerspectiveCamera makeDefault position={[0, 7.5, 26]} fov={60} />
      {!thirdPerson && <OrbitControls />}
      <Ground />
      <Colliders onTrigger={handleTrigger} cooldownRef={triggerCooldownRef} />
      {CHECKPOINTS.map((cp, i) => (
        <Checkpoint
          key={i}
          index={i}
          position={cp.position}
          size={cp.size}
          color={cp.color}
          onTrigger={(idx) => setCurrentCheckpoint((idx + 1) % CHECKPOINTS.length)}
        />
      ))}
      <Car
        thirdPerson={thirdPerson}
        lapKey={lapKey}
        onSaveReady={handleSaveReady}
        onDebugSpeed={onDebugSpeed}
        onDebugTransform={onDebugTransform}
        onLapTime={onLapTime}
        lapStartTimeRef={lapStartTime}
        currentCheckpoint={currentCheckpoint}
        isBot={false}
      />
      {ghostData && <GhostRenderer ghostData={ghostData} startSignal={ghostStartSignal} />}
    </Suspense>
  )
}
