// App.tsx
import { Canvas } from "@react-three/fiber"
import { Physics } from "@react-three/cannon"
import { Scene } from "./Scene"
import { useState, useCallback, useEffect, useRef } from "react"
import type { GhostData } from "./DataTypes"
import type { AIDebugFrame } from "./aiTypes"
import { useMultiplayer } from "./useMultiplayer"
import { me } from "playroomkit"

function fmtTime(ms: number) {
  const m = Math.floor(ms / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  const cs = Math.floor((ms % 1000) / 10)
  return `${m}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`
}

function fmtV3(v: [number, number, number], d: number) {
  return v.map(n => n.toFixed(d).padStart(d + 5)).join(" ")
}

function fmtAIDebug(f: AIDebugFrame): string {
  const { position: p, quaternion: q, velocity: v, currentCheckpoint: cc, totalCheckpoints: tc, nextCheckpoints: nc } = f
  return (
    `pos   ${fmtV3(p, 2)}\n` +
    `quat  ${q.map(n => n.toFixed(4).padStart(9)).join(" ")}\n` +
    `vel   ${fmtV3(v, 3)}\n` +
    `cp    ${cc} / ${tc}\n\n` +
    nc.map((c, i) =>
      `cp+${i} pos  ${fmtV3(c.position, 1)}\n` +
      `cp+${i} size ${fmtV3(c.size, 1)}`
    ).join("\n")
  )
}

export default function App() {
  const [showDebug, setShowDebug] = useState(false)
  const [showAIDebug, setShowAIDebug] = useState(false)
  const [ghostData, setGhostData] = useState<GhostData | null>(null)
  const [lapInfo, setLapInfo] = useState<{ current: number; total: number } | null>(null)
  const [raceFinished, setRaceFinished] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [raceWon, setRaceWon] = useState<boolean | null>(null)

  // Multiplayer — lives here so App has access to lobby / phase state
  const {
    remotePlayers,
    broadcast,
    broadcastFinished,
    registerBotPlayer,
    broadcastBot,
    phase,
    amHost,
    playersList,
    allReady,
    setReady,
    startGame,
    roomCode,
    isConnected,
  } = useMultiplayer()

  // Real remote players (excludes local bot for "online" display)
  const realRemoteCount = remotePlayers.filter(r => r.id !== "bot-player").length

  // DOM refs for imperative updates — avoids React state for per-frame values
  // which would cause 60 re-renders/sec and break canvas frameloop="demand"
  const lapTimeElRef = useRef<HTMLDivElement>(null)
  const speedElRef = useRef<HTMLDivElement>(null)
  const posElRef = useRef<HTMLDivElement>(null)
  const quatElRef = useRef<HTMLDivElement>(null)
  const aiDebugElRef = useRef<HTMLDivElement>(null)

  const handleTransform = useCallback((pos: [number, number, number], quat: [number, number, number, number]) => {
    if (posElRef.current)
      posElRef.current.textContent = `x: ${pos[0].toFixed(3)}  y: ${pos[1].toFixed(3)}  z: ${pos[2].toFixed(3)}`
    if (quatElRef.current)
      quatElRef.current.textContent = `qx: ${quat[0].toFixed(4)}  qy: ${quat[1].toFixed(4)}  qz: ${quat[2].toFixed(4)}  qw: ${quat[3].toFixed(4)}`
  }, [])

  const handleLapTime = useCallback((ms: number) => {
    if (lapTimeElRef.current) lapTimeElRef.current.textContent = fmtTime(ms)
  }, [])

  const handleDebugSpeed = useCallback((speed: number) => {
    if (speedElRef.current) speedElRef.current.textContent = `speed: ${speed.toFixed(2)}`
  }, [])

  const handleDebugAIFrame = useCallback((frame: AIDebugFrame) => {
    if (aiDebugElRef.current) aiDebugElRef.current.textContent = fmtAIDebug(frame)
  }, [])

  const handleLapChange = useCallback((current: number, total: number) => {
    if (current === 0) {
      setLapInfo(null)
      setRaceFinished(false)
    } else {
      setLapInfo({ current, total })
    }
  }, [])

  const handleRaceFinished = useCallback((won: boolean) => {
    setRaceFinished(true)
    setRaceWon(won)
  }, [])

  const handleCountdown = useCallback((value: number | null) => {
    setCountdown(value)
  }, [])

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === "h") setShowDebug(v => !v)
      if (e.key === "p") setShowAIDebug(v => !v)
      if (e.key === "r") {
        setLapInfo(null)
        setRaceFinished(false)
        setRaceWon(null)
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  const handleGhostFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string) as GhostData
        setGhostData(data)
      } catch {
        console.error("Failed to parse ghost JSON")
      }
    }
    reader.readAsText(file)
  }, [])

  // const isLinux = navigator.userAgent.includes('Linux')
  // const dpr = isLinux ? Math.min(window.devicePixelRatio, 600 / window.innerHeight) : window.devicePixelRatio
  const dpr = window.devicePixelRatio

  const localId = me()?.id

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh" }}>

      <Canvas frameloop="demand" shadows="soft" dpr={dpr}>
        <Physics
          gravity={[0, -9.81, 0]}
          defaultContactMaterial={{ friction: 1.0, restitution: 0 }}
          broadphase="SAP"
        >
          <Scene
            onDebugSpeed={handleDebugSpeed}
            onDebugTransform={handleTransform}
            onLapTime={handleLapTime}
            onLapChange={handleLapChange}
            onRaceFinished={handleRaceFinished}
            ghostData={ghostData ?? undefined}
            onDebugAIFrame={handleDebugAIFrame}
            showCheckpoints={showAIDebug}
            onCountdown={handleCountdown}
            remotePlayers={remotePlayers}
            broadcast={broadcast}
            broadcastFinished={broadcastFinished}
            registerBotPlayer={registerBotPlayer}
            broadcastBot={broadcastBot}
            gamePhase={phase}
            allReady={allReady}
            onGameReady={setReady}
          />
        </Physics>
      </Canvas>

      {/* Overlay — lives outside Canvas, no drei Html needed */}
      <div style={{
        position: "absolute",
        top: 8,
        left: 8,
        color: "white",
        fontFamily: "monospace",
        fontSize: 12,
        background: "rgba(0,0,0,0.55)",
        padding: "6px 8px",
        borderRadius: 6,
        pointerEvents: "none",
        lineHeight: "1.7",
      }}>
        <div ref={lapTimeElRef} style={{ color: "#ffdd44", fontWeight: "bold", fontSize: 15, marginBottom: 2 }}>
          0:00.00
        </div>
        {lapInfo && (
          <div style={{ color: "#ffffff", fontWeight: "bold", fontSize: 14, marginBottom: 2, letterSpacing: 1 }}>
            LAP {lapInfo.current}/{lapInfo.total}
          </div>
        )}
        <div style={{ color: realRemoteCount > 0 ? "#44ff88" : "#666", fontSize: 11 }}>
          {realRemoteCount > 0 ? `${realRemoteCount + 1} players online` : "1 player (solo)"}
        </div>
        {showDebug && <>
          <div ref={speedElRef}>speed: 0.00</div>
          <div ref={posElRef}>x: 0.000  y: 0.000  z: 0.000</div>
          <div ref={quatElRef} style={{ color: "#aaddff" }}>qx: 0.0000  qy: 0.0000  qz: 0.0000  qw: 1.0000</div>
        </>}
        <div style={{ marginTop: 4, color: "#666", fontSize: 10 }}>[h] debug  [p] ai frame  [b] bot  [f] flip</div>
      </div>

      <div style={{
        position: "absolute",
        top: 8,
        right: 8,
        color: "white",
        fontFamily: "monospace",
        fontSize: 12,
        background: "rgba(0,0,0,0.55)",
        padding: "4px 8px",
        borderRadius: 6,
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}>
        <label style={{ cursor: "pointer" }}>
          {ghostData ? `ghost: ${ghostData.lapTimeMs}ms` : "load ghost"}
          <input
            type="file"
            accept=".json"
            style={{ display: "none" }}
            onChange={handleGhostFile}
          />
        </label>
        {ghostData && (
          <span style={{ color: "#44aaff", fontSize: 10 }}>
            {ghostData.frames.length} frames · {ghostData.trackId}
          </span>
        )}
      </div>

      {/* AI frame debug — bottom right, toggled with [p] */}
      <div style={{
        position: "absolute",
        bottom: 8,
        right: 8,
        color: "white",
        fontFamily: "monospace",
        fontSize: 11,
        background: "rgba(0,0,0,0.55)",
        padding: "6px 8px",
        borderRadius: 6,
        pointerEvents: "none",
        lineHeight: "1.6",
      }}>
        {showAIDebug && (
          <div
            ref={aiDebugElRef}
            style={{ color: "#aaffcc", whiteSpace: "pre", marginBottom: 4 }}
          >
            —
          </div>
        )}
        <div style={{ color: "#666", fontSize: 10 }}>[p] ai frame</div>
      </div>

      {/* ── Lobby overlay ─────────────────────────────────────────────────── */}
      {isConnected && phase === "lobby" && (
        <div style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(0,0,0,0.82)",
          gap: 16,
        }}>
          <div style={{
            color: "#ffdd44",
            fontSize: 52,
            fontFamily: "monospace",
            fontWeight: "bold",
            letterSpacing: 8,
            textShadow: "0 0 40px #ffaa00",
          }}>
            LOBBY
          </div>

          {roomCode && (
            <div style={{ color: "#aaa", fontFamily: "monospace", fontSize: 14 }}>
              Room code: <span style={{ color: "#44ddff", fontWeight: "bold", letterSpacing: 2 }}>{roomCode}</span>
            </div>
          )}

          {/* Player list */}
          <div style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 8,
            padding: "12px 24px",
            minWidth: 240,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}>
            <div style={{ color: "#888", fontFamily: "monospace", fontSize: 11, marginBottom: 4, letterSpacing: 1 }}>
              PLAYERS ({playersList.length})
            </div>
            {playersList.map(p => {
              const name = p.getProfile?.()?.name ?? p.id.slice(0, 10)
              const isMe = p.id === localId
              return (
                <div key={p.id} style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontFamily: "monospace",
                  fontSize: 14,
                  color: isMe ? "#ffdd44" : "#ffffff",
                }}>
                  <span style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: p.getProfile?.()?.color?.hex ?? "#888",
                    display: "inline-block",
                    flexShrink: 0,
                  }} />
                  <span>{name}{isMe ? " (you)" : ""}</span>
                  {isMe && amHost && (
                    <span style={{ color: "#ffaa44", fontSize: 10, marginLeft: 4 }}>HOST</span>
                  )}
                </div>
              )
            })}
          </div>

          {/* Host starts the race; guests wait */}
          {amHost ? (
            <button
              onClick={startGame}
              style={{
                marginTop: 8,
                padding: "14px 48px",
                fontSize: 22,
                fontFamily: "monospace",
                fontWeight: "bold",
                letterSpacing: 3,
                color: "#000",
                background: "#ffdd44",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                textTransform: "uppercase",
                boxShadow: "0 0 30px rgba(255,200,0,0.5)",
              }}
            >
              START RACE
            </button>
          ) : (
            <div style={{ color: "#888", fontFamily: "monospace", fontSize: 14, marginTop: 8 }}>
              Waiting for host to start the race…
            </div>
          )}
        </div>
      )}

      {/* ── Loading overlay (host started, assets still loading) ───────────── */}
      {isConnected && phase === "playing" && !allReady && (
        <div style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(0,0,0,0.75)",
          gap: 16,
          pointerEvents: "none",
        }}>
          <div style={{
            color: "#ffffff",
            fontSize: 32,
            fontFamily: "monospace",
            fontWeight: "bold",
            letterSpacing: 4,
            animation: "loadingPulse 1.2s ease-in-out infinite",
          }}>
            LOADING…
          </div>
          <div style={{ color: "#666", fontFamily: "monospace", fontSize: 13 }}>
            Waiting for all players to finish loading
          </div>
          <div style={{ color: "#444", fontFamily: "monospace", fontSize: 11 }}>
            {playersList.length} player{playersList.length !== 1 ? "s" : ""} in room
          </div>
        </div>
      )}

      {/* ── Countdown overlay ─────────────────────────────────────────────── */}
      {countdown !== null && (
        <div style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
        }}>
          <div key={countdown} style={{
            color: countdown === 0 ? "#44ff88" : "#ffffff",
            fontSize: countdown === 0 ? 120 : 160,
            fontFamily: "monospace",
            fontWeight: "bold",
            letterSpacing: 4,
            textShadow: countdown === 0
              ? "0 0 60px #00ff66, 0 0 20px #00ff66"
              : "0 0 40px rgba(0,0,0,0.8), 0 0 10px rgba(0,0,0,0.9)",
            animation: "countdownPop 0.15s ease-out",
          }}>
            {countdown === 0 ? "GO!" : countdown}
          </div>
        </div>
      )}

      {/* ── FINISH overlay ────────────────────────────────────────────────── */}
      {raceFinished && (
        <div style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(0,0,0,0.65)",
          pointerEvents: "none",
        }}>
          <div style={{
            color: realRemoteCount > 0 && raceWon === false ? "#ff4444" : "#ffdd44",
            fontSize: 100,
            fontFamily: "monospace",
            fontWeight: "bold",
            letterSpacing: 12,
            textShadow: realRemoteCount > 0 && raceWon === false
              ? "0 0 60px #ff0000, 0 0 20px #cc0000"
              : "0 0 60px #ffaa00, 0 0 20px #ff6600",
          }}>
            FINISH
          </div>
          {realRemoteCount > 0 && raceWon !== null && (
            <div style={{
              color: raceWon ? "#44ff88" : "#ff4444",
              fontSize: 40,
              fontFamily: "monospace",
              fontWeight: "bold",
              marginTop: 8,
              letterSpacing: 3,
              textShadow: raceWon
                ? "0 0 40px #00ff66, 0 0 15px #00cc44"
                : "0 0 40px #ff0000, 0 0 15px #cc0000",
            }}>
              {raceWon ? "You won!" : "You lost!"}
            </div>
          )}
          <div style={{ color: "#aaa", fontFamily: "monospace", fontSize: 14, marginTop: 20 }}>
            press [r] to restart
          </div>
        </div>
      )}
    </div>
  )
}
