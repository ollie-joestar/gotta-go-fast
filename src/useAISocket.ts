import { useEffect, useRef } from "react"
import type { AIFrame, AICommand } from "./aiTypes"

const WS_URL = "ws://localhost:8765/AI"

export function useAISocket() {
  const ws = useRef<WebSocket | null>(null)
  const commands = useRef<Set<AICommand>>(new Set())
  const connected = useRef(false)
  const lastReceivedAt = useRef<number>(0)

  useEffect(() => {
    function connect() {
      const socket = new WebSocket(WS_URL)
      ws.current = socket

      socket.onopen = () => {
        connected.current = true
        console.log("[AI] connected to", WS_URL)
      }

      socket.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data)
          console.log("[AI] received:", data)
          // Testing another option for parsing commands
          // commands.current = new Set<AICommand>(data.commands ?? [])
          commands.current = data
          lastReceivedAt.current = Date.now()
        } catch {
          // ignore malformed frames
        }
      }

      socket.onclose = () => {
        connected.current = false
        console.log("[AI] disconnected — retrying in 2s")
        setTimeout(connect, 2000)
      }

      socket.onerror = () => {
        console.log("[AI] connection error — closing socket and retrying in 2s")
        socket.close()
      }
    }

    connect()
    return () => ws.current?.close()
  }, [])

  function roundFrame(frame: AIFrame): AIFrame {
    const r1 = (n: number) => Math.round(n * 10) / 10
    const r3 = (n: number) => Math.round(n * 1000) / 1000
    const r4 = (n: number) => Math.round(n * 10000) / 10000
    const v3 = (v: [number, number, number], fn: (n: number) => number): [number, number, number] =>
      [fn(v[0]), fn(v[1]), fn(v[2])]
    return {
      position: v3(frame.position, r1),
      quaternion: [r4(frame.quaternion[0]), r4(frame.quaternion[1]), r4(frame.quaternion[2]), r4(frame.quaternion[3])],
      velocity: v3(frame.velocity, r3),
      totalCheckpoints: frame.totalCheckpoints,
      currentCheckpoint: frame.currentCheckpoint,
      checkpoints: {
        0: v3(frame.checkpoints[0], r1),
        1: v3(frame.checkpoints[1], r1),
        2: v3(frame.checkpoints[2], r1),
      }
    }
  }

  function sendFrame(frame: AIFrame) {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(roundFrame(frame)))
    }
  }

  return { sendFrame, commands, connected, lastReceivedAt }
}
