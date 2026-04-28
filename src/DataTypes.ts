// DataTypes.ts
export interface GhostFrame {
  t: number                          // timestamp in ms since race start
  p: [number, number, number]        // position x, y, z
  q: [number, number, number, number] // quaternion x, y, z, w
}

export interface GhostData {
  trackId: string
  date: string
  lapTimeMs: number
  frames: GhostFrame[]
}

export interface Checkpoints {
  0: [number, number, number]        // position x, y, z
  1: [number, number, number]
  2: [number, number, number]
}


export interface AIFrame {
  position: [number, number, number]        // position x, y, z
  quaternion: [number, number, number, number] // quaternion x, y, z, w
  velocity: [number, number, number]        // velocity x, y, z
  totalChekpoints: number                    // total number of checkpoints in track
  currentCheckpoint: number                    // index of next checkpoint to reach
  checkpoints: Checkpoints[]                  // array of next 3 checkpoint positions
}
