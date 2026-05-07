export const CAR_START_POSITION: [number, number, number] = [0, 1, 0]
export const TRACK_ID = "track_01"
export const VERSION = 1.0

export interface CheckpointDef {
  position: [number, number, number]
  size: [number, number, number]
  color?: string
}

// Checkpoints will be re-added once the dynamic track system is in place
export const CHECKPOINTS: CheckpointDef[] = []
