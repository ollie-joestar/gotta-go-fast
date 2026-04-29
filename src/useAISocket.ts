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

  function sendFrame(frame: AIFrame) {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(frame))
    }
  }

  return { sendFrame, commands, connected, lastReceivedAt }
}
