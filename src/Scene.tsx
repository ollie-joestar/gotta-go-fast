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
import { Colliders } from "./Colliders"
import { Checkpoint } from "./Checkpoint"
import { CHECKPOINTS } from "./checkpoints"

interface SceneProps {
  onDebugSpeed: (speed: number) => void
}

// Scene.tsx
export function Scene({ onDebugSpeed }: SceneProps) {
  const [thirdPerson, setThirdPerson] = useState<boolean>(true)
  const [isRecording, setIsRecording] = useState<boolean>(false)
  const [currentCheckpoint, setCurrentCheckpoint] = useState<number>(0)
  const isRecordingRef = useRef<boolean>(false)  // ← add this
  const lapStartTime = useRef<number | null>(null)
  const saveRef = useRef<((lapMs: number) => void) | null>(null)

  // keep ref in sync with state
  useEffect(() => {
    isRecordingRef.current = isRecording
  }, [isRecording])

  useEffect(() => {
    function keydownHandler(e: KeyboardEvent) {
      if (e.key === "c") setThirdPerson(prev => !prev)
    }
    window.addEventListener("keydown", keydownHandler)
    return () => window.removeEventListener("keydown", keydownHandler)
  }, [])

  // ← no deps, reads from ref instead of closing over state
  const handleTrigger = useCallback(() => {
    // THIS LINE DISABLES RECORDING, UNCOMMENT TO ENABLE
    return
    // ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    console.log("handleTrigger called, isRecording:", isRecordingRef.current)
    if (!isRecordingRef.current) {
      setIsRecording(true)
      isRecordingRef.current = true  // update ref immediately, don't wait for re-render
      lapStartTime.current = Date.now()
      console.log("Recording started")
    } else {
      const lapMs = Date.now() - (lapStartTime.current ?? Date.now())
      console.log("Lap finished, ms:", lapMs)
      saveRef.current?.(lapMs)
      setIsRecording(false)
      isRecordingRef.current = false  // update ref immediately
      lapStartTime.current = null
    }
  }, [])  // ← empty deps now, ref is always current

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
      <Colliders onTrigger={handleTrigger} />
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
        isRecording={isRecording}
        onSaveReady={handleSaveReady}
        onDebugSpeed={onDebugSpeed}
        currentCheckpoint={currentCheckpoint}
        isBot={false}
      />
    </Suspense>
  )
}
