declare module "playroomkit" {
  export interface PlayerState {
    id: string
    state: Record<string, unknown>
    onQuit(cb: () => void): void
    setState(key: string, value: unknown): void
  }
  export function insertCoin(opts?: Record<string, unknown>): Promise<void>
  export function onPlayerJoin(cb: (state: PlayerState) => void): void
  export function me(): PlayerState | null
}
