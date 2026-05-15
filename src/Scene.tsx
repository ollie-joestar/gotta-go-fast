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
import { Track } from "./Track"
import type { CheckpointDef } from "./tracks/track01"
import { Checkpoint } from "./Checkpoint"
import { GhostRenderer } from "./GhostRenderer"
import type { GhostData } from "./DataTypes"
import type { AIDebugFrame } from "./aiTypes"
import { useMultiplayer } from "./useMultiplayer"
import { RemoteCarRenderer } from "./RemoteCarRenderer"

interface SceneProps {
  onDebugSpeed: (speed: number) => void
  onDebugTransform?: (pos: [number, number, number], quat: [number, number, number, number]) => void
  onLapTime?: (ms: number) => void
  onLapChange?: (currentLap: number, totalLaps: number) => void
  onRaceFinished?: (won: boolean) => void
  ghostData?: GhostData
  onDebugAIFrame?: (frame: AIDebugFrame) => void
  showCheckpoints?: boolean
  onPlayerCount?: (count: number) => void
  onCountdown?: (value: number | null) => void
}

// Scene.tsx
export function Scene({ onDebugSpeed, onDebugTransform, onLapTime, onLapChange, onRaceFinished, ghostData, onDebugAIFrame, showCheckpoints = false, onPlayerCount, onCountdown }: SceneProps) {
  const [thirdPerson, setThirdPerson] = useState<boolean>(true)
  const [isBot, setIsBot] = useState<boolean>(false)
  const [shadowsEnabled, setShadowsEnabled] = useState<boolean>(false)
  const [lapKey, setLapKey] = useState<number>(0)
  const lapKeyRef = useRef<number>(0)
  const [currentCheckpoint, setCurrentCheckpoint] = useState<number>(0)
  const [ghostStartSignal, setGhostStartSignal] = useState<number>(0)
  const lapStartTime = useRef<number | null>(null)
  const saveRef = useRef<((lapMs: number) => void) | null>(null)
  const triggerCooldownRef = useRef<number>(0)
  const [carStartPos, setCarStartPos] = useState<[number, number, number] | null>(null)
  const [resetKey, setResetKey] = useState<number>(0)
  const [checkpoints, setCheckpoints] = useState<CheckpointDef[]>([])
  const checkpointsRef = useRef<CheckpointDef[]>([])
  const totalLapsRef = useRef<number>(1)
  // Tracks the next checkpoint index the car must hit (1..N-1 in order; N means all done)
  const nextCheckpointRef = useRef<number>(0)
  const [raceFinished, setRaceFinished] = useState(false)

  const { remotePlayers, broadcast, broadcastFinished } = useMultiplayer()

  useEffect(() => {
    onPlayerCount?.(remotePlayers.length)
  }, [remotePlayers.length, onPlayerCount])

  // Refs so handleTrigger (useCallback []) can always read the latest values
  const remotePlayersRef = useRef(remotePlayers)
  useEffect(() => { remotePlayersRef.current = remotePlayers }, [remotePlayers])

  const broadcastFinishedRef = useRef(broadcastFinished)

  const [countdown, setCountdown] = useState<number | null>(null)
  const countdownTimersRef = useRef<ReturnType<typeof setTimeout>[]>([])

  const startCountdown = useCallback(() => {
    countdownTimersRef.current.forEach(clearTimeout)
    countdownTimersRef.current = []
    setCountdown(3)
    countdownTimersRef.current.push(setTimeout(() => setCountdown(2), 1000))
    countdownTimersRef.current.push(setTimeout(() => setCountdown(1), 2000))
    countdownTimersRef.current.push(setTimeout(() => setCountdown(0), 3000))
    countdownTimersRef.current.push(setTimeout(() => setCountdown(null), 3700))
  }, [])

  useEffect(() => {
    onCountdown?.(countdown)
  }, [countdown, onCountdown])

  // Start countdown once track loads; carStartPos only goes from null → value once
  useEffect(() => {
    if (!carStartPos) return
    startCountdown()
  }, [carStartPos, startCountdown])

  // Cleanup on unmount
  useEffect(() => {
    return () => { countdownTimersRef.current.forEach(clearTimeout) }
  }, [])

  // Stable refs for callbacks so handleTrigger (useCallback []) can always call latest version
  const onLapChangeRef = useRef(onLapChange)
  const onRaceFinishedRef = useRef(onRaceFinished)
  useEffect(() => { onLapChangeRef.current = onLapChange }, [onLapChange])
  useEffect(() => { onRaceFinishedRef.current = onRaceFinished }, [onRaceFinished])

  useEffect(() => {
    function keydownHandler(e: KeyboardEvent) {
      if (e.key === "c") setThirdPerson(prev => !prev)
      if (e.key === "b") setIsBot(prev => !prev)
      if (e.key === "u") setShadowsEnabled(prev => !prev)
      if (e.key === "r") {
        lapKeyRef.current = 0
        setLapKey(0)
        lapStartTime.current = null
        triggerCooldownRef.current = 0
        setCurrentCheckpoint(0)
        setResetKey(k => k + 1)
        nextCheckpointRef.current = 0
        setRaceFinished(false)
        broadcastFinishedRef.current(false)
        onLapChangeRef.current?.(0, totalLapsRef.current)
        startCountdown()
        console.log("Recording reset via 'r'")
      }
    }
    window.addEventListener("keydown", keydownHandler)
    return () => window.removeEventListener("keydown", keydownHandler)
  }, [])

  const handleTrigger = useCallback(() => {
    const now = Date.now()
    const cps = checkpointsRef.current

    if (lapKeyRef.current > 0) {
      // Require all checkpoints 1..N-1 to have been hit in order
      if (nextCheckpointRef.current < cps.length) return
      nextCheckpointRef.current = 1
    } else {
      nextCheckpointRef.current = 1
    }

    if (lapKeyRef.current > 0 && lapStartTime.current !== null) {
      const lapMs = now - lapStartTime.current
      console.log("Lap finished, ms:", lapMs)
      saveRef.current?.(lapMs)

      // Check if all laps are done (lapKeyRef still holds lap number that just finished)
      if (lapKeyRef.current >= totalLapsRef.current) {
        const won = !remotePlayersRef.current.some(p => p.playerState?.state?.finished)
        broadcastFinishedRef.current(true)
        setRaceFinished(true)
        onRaceFinishedRef.current?.(won)
        return
      }
    }

    setGhostStartSignal(s => s + 1)
    lapKeyRef.current += 1
    setLapKey(lapKeyRef.current)
    lapStartTime.current = now
    onLapChangeRef.current?.(lapKeyRef.current, totalLapsRef.current)
    console.log("Lap started/restarted, lapKey:", lapKeyRef.current)
  }, [])

  const handleSaveReady = useCallback((saveFn: (lapMs: number) => void) => {
    saveRef.current = saveFn
  }, [])

  const handleTrackLoad = useCallback((pos: [number, number, number], cps: CheckpointDef[], laps: number) => {
    checkpointsRef.current = cps
    totalLapsRef.current = laps
    setCarStartPos(pos)
    setCheckpoints(cps)
  }, [])

  return (
    <Suspense fallback={null}>
      <FPSCap fps={60} />
      <Environment files="/textures/skybox_sky.hdr" background="both" />
      <PerspectiveCamera makeDefault position={[0, 7.5, 26]} fov={60} />
      {!thirdPerson && <OrbitControls />}
      <ambientLight color="#ff9a3c" intensity={0.25} />
      <directionalLight
        position={[500, 120, 200]}
        color="#ffb347"
        intensity={25.0}
        castShadow={shadowsEnabled}
        shadow-mapSize-width={4096}
        shadow-mapSize-height={4096}
        shadow-camera-near={1}
        shadow-camera-far={1200}
        shadow-camera-left={-350}
        shadow-camera-right={350}
        shadow-camera-top={350}
        shadow-camera-bottom={-350}
        shadow-bias={0.000}
        shadow-normalBias={0.1}
        shadow-intensity={1}
        shadow-radius={5}
      />
      <Track onTrigger={handleTrigger} cooldownRef={triggerCooldownRef} onLoad={handleTrackLoad} />
      <Ground />
      {checkpoints.map((cp, i) => (
        <Checkpoint
          key={i}
          index={i}
          position={cp.position}
          size={cp.size}
          visualSize={cp.visualSize}
          rotation={cp.rotation}
          color={cp.color}
          visible={showCheckpoints}
        />
      ))}
      {carStartPos && (
        <Car
          startPosition={carStartPos}
          resetSignal={resetKey}
          thirdPerson={thirdPerson}
          lapKey={lapKey}
          onSaveReady={handleSaveReady}
          onDebugSpeed={onDebugSpeed}
          onDebugTransform={onDebugTransform}
          onLapTime={onLapTime}
          lapStartTimeRef={lapStartTime}
          currentCheckpoint={currentCheckpoint}
          isBot={isBot}
          checkpoints={checkpoints}
          disabled={raceFinished || (countdown !== null && countdown > 0)}
          onCheckpointTrigger={(idx) => {
            if (idx !== nextCheckpointRef.current) return
            nextCheckpointRef.current = idx + 1  // advances to N when idx = N-1 (signals all done)
            setCurrentCheckpoint((idx + 1) % checkpoints.length)
          }}
          onDebugAIFrame={onDebugAIFrame}
          onNetworkFrame={broadcast}
        />
      )}
      {ghostData && <GhostRenderer ghostData={ghostData} startSignal={ghostStartSignal} />}
      {remotePlayers.map(remote => (
        <RemoteCarRenderer key={remote.id} remote={remote} />
      ))}
    </Suspense>
  )
}
