// DataTypes.ts
export interface GhostFrame {
  t: number                          // timestamp in ms since race start
  p: [number, number, number]        // position x, y, z
  q: [number, number, number, number] // quaternion x, y, z, w
}

export interface GhostData {
  trackId: string
  version: number
  userId: string
  date: string
  lapTimeMs: number
  frames: GhostFrame[]
}

