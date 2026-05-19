// GhostRecorder.ts
import { useEffect, useRef, useCallback } from "react"
import type { GhostData, GhostFrame } from "./DataTypes"
import { TRACK_ID, VERSION } from "./tracks/track01"

const RECORD_HZ = 10
const RECORD_INTERVAL_MS = 1000 / RECORD_HZ

export function useGhostRecorder(
  lapKey: number,
  trackId: string = TRACK_ID,
  userId: string = "player1"
) {
  const framesRef = useRef<GhostFrame[]>([])
  const startTimeRef = useRef<number | null>(null)
  const lastRecordRef = useRef<number>(0)
  const isRecordingRef = useRef<boolean>(false)

  useEffect(() => {
    if (lapKey > 0) {
      framesRef.current = []
      startTimeRef.current = null
      lastRecordRef.current = 0
      isRecordingRef.current = true
      console.log("GhostRecorder: reset and started, lapKey:", lapKey)
    } else {
      isRecordingRef.current = false
      console.log("GhostRecorder: stopped")
    }
  }, [lapKey])

  // Accepts pos/quat directly from cannon subscriptions — no matrixWorld needed
  const tick = useCallback((
    now: number,
    pos: [number, number, number],
    quat: [number, number, number, number],
  ) => {
    if (!isRecordingRef.current) return
    if (startTimeRef.current === null) startTimeRef.current = now
    const elapsed = now - startTimeRef.current
    if (elapsed - lastRecordRef.current < RECORD_INTERVAL_MS) return
    lastRecordRef.current = elapsed
    framesRef.current.push({
      t: Math.round(elapsed),
      p: [
        parseFloat(pos[0].toFixed(3)),
        parseFloat(pos[1].toFixed(3)),
        parseFloat(pos[2].toFixed(3)),
      ],
      q: [
        parseFloat(quat[0].toFixed(4)),
        parseFloat(quat[1].toFixed(4)),
        parseFloat(quat[2].toFixed(4)),
        parseFloat(quat[3].toFixed(4)),
      ],
    })
  }, [])

  // stable reference — reads framesRef directly, never stale
  const save = useCallback((lapTimeMs: number) => {
    console.log("save() called, frames recorded:", framesRef.current.length)

    if (framesRef.current.length === 0) {
      console.warn("No frames — was recording active?")
      return
    }

    const ghostData: GhostData = {
      userId: userId,
      trackId: TRACK_ID,
      version: VERSION,
      date: new Date().toISOString(),
      lapTimeMs,
      frames: framesRef.current,
    }

    const json = JSON.stringify(ghostData, null, 2)
    console.log("GHOST DATA (first 3 frames):", ghostData.frames.slice(0, 3))

    const blob = new Blob([json], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `ghost_${userId}_${trackId}_${lapTimeMs}ms.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    return ghostData
  }, [trackId])

  return { tick, save, frames: framesRef }
}
