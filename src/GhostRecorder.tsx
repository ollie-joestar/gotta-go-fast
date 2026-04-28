// GhostRecorder.ts
import { useEffect, useRef, useCallback } from "react"
import type { GhostData, GhostFrame } from "./ghostTypes"
import * as THREE from "three"

const RECORD_HZ = 10
const RECORD_INTERVAL_MS = 1000 / RECORD_HZ

export function useGhostRecorder(
  chassisRef: React.RefObject<THREE.Mesh | null>,
  isRecording: boolean,
  trackId: string = "track_01"
) {
  const framesRef = useRef<GhostFrame[]>([])
  const startTimeRef = useRef<number | null>(null)
  const lastRecordRef = useRef<number>(0)
  const isRecordingRef = useRef<boolean>(false)  // ← ref mirror of isRecording

  // keep ref in sync so tick/save closures never go stale
  useEffect(() => {
    isRecordingRef.current = isRecording
    if (isRecording) {
      framesRef.current = []
      startTimeRef.current = null
      lastRecordRef.current = 0
      console.log("GhostRecorder: reset and started")
    }
  }, [isRecording])

  // stable reference — never recreated
  const tick = useCallback((now: number) => {
    if (!isRecordingRef.current || !chassisRef.current) return
    if (startTimeRef.current === null) startTimeRef.current = now
    const elapsed = now - startTimeRef.current
    if (elapsed - lastRecordRef.current < RECORD_INTERVAL_MS) return
    lastRecordRef.current = elapsed
    const pos = new THREE.Vector3()
    pos.setFromMatrixPosition(chassisRef.current.matrixWorld)
    const quat = new THREE.Quaternion()
    quat.setFromRotationMatrix(chassisRef.current.matrixWorld)
    framesRef.current.push({
      t: Math.round(elapsed),
      p: [
        parseFloat(pos.x.toFixed(3)),
        parseFloat(pos.y.toFixed(3)),
        parseFloat(pos.z.toFixed(3)),
      ],
      q: [
        parseFloat(quat.x.toFixed(4)),
        parseFloat(quat.y.toFixed(4)),
        parseFloat(quat.z.toFixed(4)),
        parseFloat(quat.w.toFixed(4)),
      ],
    })
  }, [chassisRef])  // chassisRef is stable, so this is created once

  // stable reference — reads framesRef directly, never stale
  const save = useCallback((lapTimeMs: number) => {
    console.log("save() called, frames recorded:", framesRef.current.length)

    if (framesRef.current.length === 0) {
      console.warn("No frames — was recording active?")
      return
    }

    const ghostData: GhostData = {
      trackId,
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
    a.download = `ghost_${trackId}_${lapTimeMs}ms.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    // Extra logging to help debug data handling
    // Option 1 — open in new tab (not recommended for large data, but works)
    // DOESNT WORK IN MY ZEN
    // window.open(url, "_blank")

    // Option 2 — log it to console so you can copy it
    // console.log("GHOST DATA:", json)

    return ghostData
  }, [trackId])  // trackId is a stable string, so this is created once

  return { tick, save, frames: framesRef }
}
