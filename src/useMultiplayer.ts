import { useEffect, useRef, useState, useCallback } from "react"
import {
  insertCoin, onPlayerJoin, me,
  useMultiplayerState, useIsHost, usePlayersList, usePlayersState,
  getRoomCode,
} from "playroomkit"
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
  const [isConnected, setIsConnected] = useState(false)
  const initializedRef = useRef(false)
  const lastSendRef = useRef(0)
  const lastBotSendRef = useRef(0)

  // ─── Room-level phase: "lobby" | "playing" ───────────────────────────────
  const [phase, setPhaseRaw] = useMultiplayerState("phase", "lobby") as [
    string,
    (v: string) => void,
  ]

  // ─── Host detection & player list ────────────────────────────────────────
  const amHost = useIsHost()
  // false = don't re-render on every position update (avoids 20 Hz re-renders)
  const playersList = usePlayersList(false) as PlayerState[]
  const playersReadyStates = usePlayersState("ready") as Array<{ player: PlayerState; state: unknown }>

  // Local readiness flag — set immediately when setReady() is called, without
  // waiting for a Playroomkit round-trip through usePlayersState("ready").
  const [isLocalReady, setIsLocalReady] = useState(false)

  // allReady: local player ready immediately + every remote player has confirmed.
  // We track local readiness via isLocalReady (no Playroomkit round-trip) and
  // only check playersReadyStates for remote players so a Playroomkit delay in
  // reflecting me().setState("ready") back through usePlayersState can't stall the race.
  const localId = me()?.id
  const allReady =
    isLocalReady &&
    playersList
      .filter(p => p.id !== localId)
      .every(p => playersReadyStates.find(ps => ps.player.id === p.id)?.state === true)

  const roomCode = getRoomCode()

  // ─── Playroomkit connection ───────────────────────────────────────────────
  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    ;(async () => {
      await insertCoin()
      connectedRef.current = true
      setIsConnected(true)

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

  // ─── Stable broadcast — throttled to ~20 Hz ──────────────────────────────
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

  // Broadcast race-finish state; false clears it on restart
  const broadcastFinished = useCallback((finished: boolean) => {
    if (!connectedRef.current) return
    const m = me()
    if (!m) return
    m.setState("finished", finished)
  }, [])

  // Tell the room this client's assets are loaded and it's ready to race
  const setReady = useCallback(() => {
    if (!connectedRef.current) return
    const m = me()
    if (!m) return
    m.setState("ready", true)
    setIsLocalReady(true)
  }, [])

  // Host-only: transition room phase from "lobby" → "playing"
  const startGame = useCallback(() => {
    if (!amHost) return
    setPhaseRaw("playing")
  }, [amHost, setPhaseRaw])

  // ─── Bot player (local mock, no network broadcast) ────────────────────────
  // TODO: verify Playroom API for bot player registration.
  // Playroom has no native API for synthetic/bot players; we create a local-only mock
  // PlayerState whose setState updates in-memory state only — no network broadcast occurs.
  const registerBotPlayer = useCallback(() => {
    if (mapRef.current.has("bot-player")) return
    const mockState: Record<string, unknown> = {}
    const mockPlayerState: PlayerState = {
      id: "bot-player",
      state: mockState,
      onQuit: () => {},
      setState(key: string, value: unknown) { mockState[key] = value },
    }
    mapRef.current.set("bot-player", {
      id: "bot-player",
      color: "#cc2222",
      playerState: mockPlayerState,
    })
    setRemotePlayers(Array.from(mapRef.current.values()))
  }, [])

  // Update bot player state — throttled to ~20 Hz, mirrors broadcast()
  const broadcastBot = useCallback((
    pos: [number, number, number],
    quat: [number, number, number, number],
    lap: number,
  ) => {
    const now = performance.now()
    if (now - lastBotSendRef.current < 50) return
    lastBotSendRef.current = now
    const bot = mapRef.current.get("bot-player")
    if (!bot) return
    bot.playerState.setState("pos", pos)
    bot.playerState.setState("quat", quat)
    bot.playerState.setState("lap", lap)
  }, [])

  return {
    // Remote car rendering
    remotePlayers,
    broadcast,
    broadcastFinished,
    registerBotPlayer,
    broadcastBot,
    // Lobby / phase
    phase,
    amHost,
    playersList,
    allReady,
    setReady,
    startGame,
    roomCode,
    isConnected,
  }
}
