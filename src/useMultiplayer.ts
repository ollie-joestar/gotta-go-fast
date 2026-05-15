import { useEffect, useRef, useState, useCallback } from "react"
import { insertCoin, onPlayerJoin, me } from "playroomkit"
import type { PlayerState } from "playroomkit"

export interface RemotePlayer {
  id: string
  color: string
  playerState: PlayerState
}

const PLAYER_COLORS = ["#ff4444", "#44ff44", "#ffaa00", "#ff44ff", "#44ddff", "#ff9900"]

function colorForId(id: string): string {
  let h = 0
  for (let i = 0; i < id.length; i++) h = ((h * 31 + id.charCodeAt(i)) >>> 0)
  return PLAYER_COLORS[h % PLAYER_COLORS.length]
}

export function useMultiplayer() {
  const [remotePlayers, setRemotePlayers] = useState<RemotePlayer[]>([])
  const mapRef = useRef<Map<string, RemotePlayer>>(new Map())
  const connectedRef = useRef(false)
  const initializedRef = useRef(false)
  const lastSendRef = useRef(0)

  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    ;(async () => {
      await insertCoin()
      connectedRef.current = true

      onPlayerJoin((playerState: PlayerState) => {
        if (playerState.id === me()!.id) return

        const remote: RemotePlayer = {
          id: playerState.id,
          color: colorForId(playerState.id),
          playerState,
        }
        mapRef.current.set(playerState.id, remote)
        setRemotePlayers(Array.from(mapRef.current.values()))

        playerState.onQuit(() => {
          mapRef.current.delete(playerState.id)
          setRemotePlayers(Array.from(mapRef.current.values()))
        })
      })
    })()
  }, [])

  // Stable broadcast — throttled to ~20 Hz via ref, no re-render on connect
  const broadcast = useCallback((
    pos: [number, number, number],
    quat: [number, number, number, number],
    lap: number,
  ) => {
    if (!connectedRef.current) return
    const now = performance.now()
    if (now - lastSendRef.current < 50) return
    lastSendRef.current = now
    const m = me()
    if (!m) return
    m.setState("pos", pos)
    m.setState("quat", quat)
    m.setState("lap", lap)
  }, [])

  return { remotePlayers, broadcast }
}
