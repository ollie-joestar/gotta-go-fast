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
import { QualityContext, type QualityPreset } from "./QualityContext"
import type { CheckpointDef } from "./tracks/track01"
import { Checkpoint } from "./Checkpoint"
import { GhostRenderer } from "./GhostRenderer"
import type { GhostData } from "./DataTypes"
import type { AIDebugFrame } from "./aiTypes"
import type { RemotePlayer } from "./useMultiplayer"
import { RemoteCarRenderer } from "./RemoteCarRenderer"
import { BotCar, BOT_ENABLED } from "./BotCar"

interface SceneProps {
  onDebugSpeed: (speed: number) => void
  onDebugTransform?: (pos: [number, number, number], quat: [number, number, number, number]) => void
  onLapTime?: (ms: number) => void
  onLapChange?: (currentLap: number, totalLaps: number) => void
  onRaceFinished?: (won: boolean) => void
  ghostData?: GhostData
  onDebugAIFrame?: (frame: AIDebugFrame) => void
  showCheckpoints?: boolean
  onCountdown?: (value: number | null) => void
  // Multiplayer — managed in App.tsx, threaded down as props
  remotePlayers: RemotePlayer[]
  broadcast: (pos: [number, number, number], quat: [number, number, number, number], lap: number) => void
  broadcastFinished: (finished: boolean) => void
  registerBotPlayer: () => void
  broadcastBot: (pos: [number, number, number], quat: [number, number, number, number], lap: number) => void
  gamePhase: string   // "lobby" | "playing"
  allReady: boolean   // every player has loaded assets
  onGameReady?: () => void  // called when this client's assets are loaded
}

// Scene.tsx
export function Scene({
  onDebugSpeed, onDebugTransform, onLapTime, onLapChange, onRaceFinished,
  ghostData, onDebugAIFrame, showCheckpoints = false, onCountdown,
  remotePlayers, broadcast, broadcastFinished, registerBotPlayer, broadcastBot,
  gamePhase, allReady, onGameReady,
}: SceneProps) {
  const [thirdPerson, setThirdPerson] = useState<boolean>(true)
  const [isBot, setIsBot] = useState<boolean>(false)
  const [quality, setQuality] = useState<QualityPreset>('low')
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

  // Bot-specific state — tracked independently of the human player
  const [botCurrentCheckpoint, setBotCurrentCheckpoint] = useState(0)
  const botNextCheckpointRef = useRef(0)
  const botLapKeyRef = useRef(0)
  const [botLapKey, setBotLapKey] = useState(0)
  const [finishLinePos, setFinishLinePos] = useState<[number, number, number] | null>(null)
  const [finishLineSize, setFinishLineSize] = useState<[number, number, number] | null>(null)

  useEffect(() => {
    if (BOT_ENABLED) registerBotPlayer()
  }, [registerBotPlayer])

  // Stable ref so handleTrigger (useCallback []) always sees latest remotePlayers
  const remotePlayersRef = useRef(remotePlayers)
  useEffect(() => { remotePlayersRef.current = remotePlayers }, [remotePlayers])

  // Stable ref so handleTrigger (useCallback []) always sees latest broadcastFinished
  const broadcastFinishedRef = useRef(broadcastFinished)
  useEffect(() => { broadcastFinishedRef.current = broadcastFinished }, [broadcastFinished])

  // ─── Countdown ─────────────────────────────────────────────────────────────
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

  // Countdown begins only when host has started (gamePhase="playing") AND
  // this client's track is loaded (carStartPos set) AND all players are ready
  useEffect(() => {
    if (gamePhase !== "playing" || !carStartPos || !allReady) return
    startCountdown()
  }, [gamePhase, carStartPos, allReady, startCountdown])

  // Notify App.tsx that this client's assets are loaded
  useEffect(() => {
    if (gamePhase !== "playing" || !carStartPos) return
    onGameReady?.()
  }, [gamePhase, carStartPos, onGameReady])

  // Cleanup countdown timers on unmount
  useEffect(() => {
    return () => { countdownTimersRef.current.forEach(clearTimeout) }
  }, [])

  // ─── Stable refs for props used in useCallback([]) closures ──────────────
  const onLapChangeRef = useRef(onLapChange)
  const onRaceFinishedRef = useRef(onRaceFinished)
  useEffect(() => { onLapChangeRef.current = onLapChange }, [onLapChange])
  useEffect(() => { onRaceFinishedRef.current = onRaceFinished }, [onRaceFinished])

  // Ref so keydown handler (mounted once with []) can read latest gamePhase
  const gamePhaseRef = useRef(gamePhase)
  useEffect(() => { gamePhaseRef.current = gamePhase }, [gamePhase])

  useEffect(() => {
    function keydownHandler(e: KeyboardEvent) {
      if (e.key === "c") setThirdPerson(prev => !prev)
      if (e.key === "b") setIsBot(prev => !prev)
      if (e.key === "u") setQuality(prev => prev === 'low' ? 'high' : 'low')
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
        // Only restart countdown if the race has already started
        if (gamePhaseRef.current === "playing") startCountdown()
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

  const handleBotTrigger = useCallback(() => {
    const cps = checkpointsRef.current
    if (botLapKeyRef.current > 0) {
      if (botNextCheckpointRef.current < cps.length) return
      botNextCheckpointRef.current = 1
    } else {
      botNextCheckpointRef.current = 1
    }
    botLapKeyRef.current += 1
    setBotLapKey(botLapKeyRef.current)
    console.log("[Bot] Lap", botLapKeyRef.current)
  }, [])

  const handleSaveReady = useCallback((saveFn: (lapMs: number) => void) => {
    saveRef.current = saveFn
  }, [])

  const handleTrackLoad = useCallback((
    pos: [number, number, number],
    cps: CheckpointDef[],
    laps: number,
    trigPos: [number, number, number],
    trigSize: [number, number, number],
  ) => {
    checkpointsRef.current = cps
    totalLapsRef.current = laps
    setCarStartPos(pos)
    setCheckpoints(cps)
    if (BOT_ENABLED) {
      setFinishLinePos(trigPos)
      setFinishLineSize(trigSize)
    }
  }, [])

  // Car is disabled when: race finished, OR game not started yet, OR
  // assets still loading, OR during the pre-race countdown
  const carDisabled =
    raceFinished ||
    gamePhase !== "playing" ||
    !allReady ||
    (countdown !== null && countdown > 0)

  return (
    <QualityContext.Provider value={quality}>
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
          castShadow={quality === 'high'}
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
            disabled={carDisabled}
            onCheckpointTrigger={(idx) => {
              if (idx !== nextCheckpointRef.current) return
              nextCheckpointRef.current = idx + 1  // advances to N when idx = N-1 (signals all done)
              setCurrentCheckpoint((idx + 1) % checkpoints.length)
            }}
            onDebugAIFrame={onDebugAIFrame}
            onNetworkFrame={broadcast}
          />
        )}
        {ghostData && <GhostRenderer ghostData={ghostData} startSignal={ghostStartSignal} lapKey={lapKey} />}
        {remotePlayers
          .filter(r => r.id !== "bot-player")
          .map(remote => (
            <RemoteCarRenderer key={remote.id} remote={remote} />
          ))}
        {BOT_ENABLED && carStartPos && checkpoints.length > 0 && (
          <BotCar
            startPosition={[carStartPos[0] + 3, carStartPos[1], carStartPos[2]]}
            resetSignal={resetKey}
            lapKey={botLapKey}
            currentCheckpoint={botCurrentCheckpoint}
            checkpoints={checkpoints}
            disabled={carDisabled}
            onCheckpointTrigger={(idx) => {
              if (idx !== botNextCheckpointRef.current) return
              botNextCheckpointRef.current = idx + 1
              setBotCurrentCheckpoint((idx + 1) % checkpoints.length)
            }}
            onFinishLineTrigger={handleBotTrigger}
            finishLinePos={finishLinePos ?? undefined}
            finishLineSize={finishLineSize ?? undefined}
            onNetworkFrame={broadcastBot}
          />
        )}
      </Suspense>
    </QualityContext.Provider>
  )
}
