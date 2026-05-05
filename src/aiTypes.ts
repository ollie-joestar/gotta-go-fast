// Sliding window of the next 3 checkpoint positions sent to the AI each frame.
export interface Checkpoints {
  0: [number, number, number]
  1: [number, number, number]
  2: [number, number, number]
}

export interface CheckpointDebug {
  position: [number, number, number]
  size: [number, number, number]
}

// Full frame used for the in-game debug overlay (superset of AIFrame — includes sizes).
export interface AIDebugFrame {
  position: [number, number, number]
  quaternion: [number, number, number, number]
  velocity: [number, number, number]
  totalCheckpoints: number
  currentCheckpoint: number
  nextCheckpoints: [CheckpointDebug, CheckpointDebug, CheckpointDebug]
}

export interface AIFrame {
  position: [number, number, number]
  quaternion: [number, number, number, number]
  velocity: [number, number, number]
  totalCheckpoints: number
  currentCheckpoint: number
  checkpoints: Checkpoints
}

export type AICommand = "forward" | "backward" | "turn_left" | "turn_right"

// Shape of the JSON the Go server sends back each tick.
export interface AIResponse {
  commands: AICommand[]
}
