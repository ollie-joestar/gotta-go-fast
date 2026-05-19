declare module "playroomkit" {
  export interface PlayerProfile {
    name: string
    color: { r: number; g: number; b: number; hex: string }
    photo: string
  }

  export interface PlayerState {
    id: string
    state: Record<string, unknown>
    onQuit(cb: () => void): void
    setState(key: string, value: unknown): void
    getState?(key: string): unknown
    getProfile?(): PlayerProfile
  }

  // Core lifecycle
  export function insertCoin(opts?: Record<string, unknown>): Promise<void>
  export function onPlayerJoin(cb: (state: PlayerState) => void): void
  export function me(): PlayerState | null
  export function isHost(): boolean
  export function getRoomCode(): string | null

  // Room-level state (not player-specific)
  export function setState(key: string, value: unknown, reliable?: boolean): void
  export function getState(key: string): unknown

  // React hooks
  export function useMultiplayerState(
    key: string,
    defaultValue?: unknown
  ): [unknown, (value: unknown, reliable?: boolean) => void]
  export function useIsHost(): boolean
  export function usePlayersList(listenForPositions?: boolean): PlayerState[]
  export function usePlayersState(key: string): Array<{ player: PlayerState; state: unknown }>
}
