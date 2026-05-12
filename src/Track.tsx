import { useState, useEffect, useRef } from "react"
import type { MutableRefObject } from "react"
import { Segment } from "./Segment"
import { TriggerBox } from "./TriggerBox"
import type { CheckpointDef } from "./tracks/track01"

interface TrackProps {
  onTrigger?: () => void
  cooldownRef?: MutableRefObject<number>
  onLoad?: (carStartPos: [number, number, number], checkpoints: CheckpointDef[], laps: number) => void
}

interface TrackData {
  length: number
  width: number
  height: number
  laps: number
  startRow: number
  startCol: number
  grid: number[][]
}

function parseTrack(text: string): TrackData {
  const lines = text.split('\n').map(l => l.trim())
  let length = 64, width = 4, height = 10, laps = 1
  let startRow = 0, startCol = 0
  const gridLines: string[] = []

  for (const line of lines) {
    if (line.startsWith('length =')) length = parseInt(line.split('=')[1].trim())
    else if (line.startsWith('width =')) width = parseInt(line.split('=')[1].trim())
    else if (line.startsWith('height =')) height = parseInt(line.split('=')[1].trim())
    else if (line.startsWith('laps =')) laps = parseInt(line.split('=')[1].trim())
    else if (line.startsWith('start =')) {
      const m = line.match(/\[(\d+),\s*(\d+)\]/)
      if (m) { startRow = parseInt(m[1]); startCol = parseInt(m[2]) }
    } else if (/^[0-9]+$/.test(line)) {
      gridLines.push(line)
    }
  }

  const grid = gridLines.map(l => l.split('').map(Number))
  return { length, width, height, laps, startRow, startCol, grid }
}

// ─── path-tracing helpers ────────────────────────────────────────────────────

type Dir = 'N' | 'S' | 'E' | 'W'

function initialDir(cellDir: number): Dir {
  switch (cellDir) {
    case 8: return 'N'
    case 2: return 'S'
    case 6: return 'E'
    case 4: return 'W'
    default: return 'N'
  }
}

// Given a cell type and the direction the car is travelling INTO it, return the exit direction.
function exitDir(cellDir: number, travel: Dir): Dir {
  // Straights pass through unchanged
  if (cellDir === 8 || cellDir === 2 || cellDir === 4 || cellDir === 6) return travel
  switch (cellDir) {
    case 7: return travel === 'N' ? 'E' : 'S'   // NW: N→E, W→S
    case 9: return travel === 'N' ? 'W' : 'S'   // NE: N→W, E→S
    case 1: return travel === 'S' ? 'E' : 'N'   // SW: S→E, W→N
    case 3: return travel === 'S' ? 'W' : 'N'   // SE: S→W, E→N
  }
  return travel
}

function stepCell(row: number, col: number, dir: Dir): [number, number] {
  switch (dir) {
    case 'N': return [row - 1, col]
    case 'S': return [row + 1, col]
    case 'E': return [row, col + 1]
    case 'W': return [row, col - 1]
  }
}

const CP_COLORS = [
  'red', 'yellow', 'green', 'blue', 'violet', 'magenta',
  'cyan', 'orange', 'coral', 'salmon', 'steelblue', 'seagreen',
  'pink', 'goldenrod',
]

function buildCheckpoints(data: TrackData): CheckpointDef[] {
  const { grid, startRow, startCol, length: L, width: W, height: H } = data
  const roadW = L - W  // drivable gap between walls
  const thin = W           // checkpoint slab thickness (same as wall width)

  const checkpoints: CheckpointDef[] = []
  let row = startRow, col = startCol
  let travel: Dir = initialDir(grid[startRow][startCol])

  do {
    const cellDir = grid[row][col]
    const cx = (col - startCol) * L
    const cz = (row - startRow) * L
    const isNS = travel === 'N' || travel === 'S'
    const color = CP_COLORS[checkpoints.length % CP_COLORS.length]

    let cp: CheckpointDef
    if (cellDir === 8 || cellDir === 2 || cellDir === 4 || cellDir === 6) {
      // Straight: thin perpendicular slab
      cp = {
        position: [cx, H / 2, cz],
        size: isNS ? [roadW, H, thin] : [thin, H, roadW],
        color,
      }
    } else {
      // Corner: \ diagonal for 7+3, / diagonal for 9+1
      // The AABB covers the full road square; visual is a rotated thin slab.
      const rotY = (cellDir === 7 || cellDir === 3) ? -Math.PI / 4 : Math.PI / 4
      cp = {
        position: [cx, H / 2, cz],
        size: [roadW, H, roadW],               // AABB for car detection
        visualSize: [roadW * Math.SQRT2, H, thin],   // diagonal slab for debug view
        rotation: [0, rotY, 0],
        color,
      }
    }

    checkpoints.push(cp)

    const exit = exitDir(cellDir, travel)
      ;[row, col] = stepCell(row, col, exit)
    travel = exit
  } while (row !== startRow || col !== startCol)

  return checkpoints
}

// ─── car start position ──────────────────────────────────────────────────────

function carStartFromData(data: TrackData): [number, number, number] {
  const dir = data.grid[data.startRow]?.[data.startCol] ?? 8
  const half = data.length / 2
  switch (dir) {
    case 8: return [0, 1, half]   // going N → spawn south (+Z)
    case 2: return [0, 1, -half]   // going S → spawn north (-Z)
    case 6: return [-half, 1, 0]   // going E → spawn west  (-X)
    case 4: return [half, 1, 0]   // going W → spawn east  (+X)
    default: return [0, 1, half]
  }
}

// ─── component ───────────────────────────────────────────────────────────────

const COOLDOWN_MS = 3000

export function Track({ onTrigger, cooldownRef, onLoad }: TrackProps) {
  const [data, setData] = useState<TrackData | null>(null)
  const internalCooldown = useRef<number>(0)
  const lastTriggerTime = cooldownRef ?? internalCooldown

  useEffect(() => {
    fetch('/tracks/track01')
      .then(r => r.text())
      .then(text => {
        const parsed = parseTrack(text)
        setData(parsed)
        onLoad?.(carStartFromData(parsed), buildCheckpoints(parsed), parsed.laps)
      })
  }, [])

  if (!data) return null

  const { length, width, height, startRow, startCol, grid } = data

  const startDir = grid[startRow]?.[startCol] ?? 8
  const isNS = startDir === 8 || startDir === 2
  const triggerScale: [number, number, number] = isNS ? [length, height, 2] : [2, height, length]

  return (
    <>
      {grid.flatMap((row, r) =>
        row.map((dir, c) => {
          if (dir === 0) return null
          return (
            <Segment
              key={`${r}-${c}`}
              position={[(c - startCol) * length, 0, (r - startRow) * length]}
              length={length}
              width={width}
              height={height}
              direction={dir}
            />
          )
        })
      )}

      {onTrigger && (
        <TriggerBox
          position={[0, height / 2, 0]}
          scale={triggerScale}
          onCollide={() => {
            const now = Date.now()
            if (now - lastTriggerTime.current < COOLDOWN_MS) return
            lastTriggerTime.current = now
            onTrigger()
          }}
        />
      )}
    </>
  )
}
