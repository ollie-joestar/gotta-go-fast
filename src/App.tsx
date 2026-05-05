// App.tsx
import { Canvas } from "@react-three/fiber"
import { Physics } from "@react-three/cannon"
import { Scene } from "./Scene"
import { useState, useCallback, useEffect, useRef } from "react"
import type { GhostData } from "./DataTypes"
import type { AIDebugFrame } from "./aiTypes"

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

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === "h") setShowDebug(v => !v)
      if (e.key === "p") setShowAIDebug(v => !v)
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

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh" }}>

      <Canvas frameloop="demand">
        <Physics
          gravity={[0, -9.81, 0]}
          defaultContactMaterial={{ friction: 1.0, restitution: 0 }}
          broadphase="SAP"
        >
          <Scene
            onDebugSpeed={handleDebugSpeed}
            onDebugTransform={handleTransform}
            onLapTime={handleLapTime}
            ghostData={ghostData ?? undefined}
            onDebugAIFrame={handleDebugAIFrame}
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
        {showDebug && <>
          <div ref={speedElRef}>speed: 0.00</div>
          <div ref={posElRef}>x: 0.000  y: 0.000  z: 0.000</div>
          <div ref={quatElRef} style={{ color: "#aaddff" }}>qx: 0.0000  qy: 0.0000  qz: 0.0000  qw: 1.0000</div>
        </>}
        <div style={{ marginTop: 4, color: "#666", fontSize: 10 }}>[h] debug  [p] ai frame</div>
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
    </div>
  )
}
