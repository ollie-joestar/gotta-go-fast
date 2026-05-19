import { useState, useEffect, useRef, useMemo } from "react"
import type { MutableRefObject } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { Segment } from "./Segment"
import { TriggerBox } from "./TriggerBox"
import type { CheckpointDef } from "./tracks/track01"
import { useQuality } from "./QualityContext"

interface TrackProps {
  onTrigger?: () => void
  cooldownRef?: MutableRefObject<number>
  onLoad?: (
    carStartPos: [number, number, number],
    checkpoints: CheckpointDef[],
    laps: number,
    triggerPos: [number, number, number],
    triggerSize: [number, number, number],
  ) => void
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

function exitDir(cellDir: number, travel: Dir): Dir {
  if (cellDir === 8 || cellDir === 2 || cellDir === 4 || cellDir === 6) return travel
  switch (cellDir) {
    case 7: return travel === 'N' ? 'E' : 'S'
    case 9: return travel === 'N' ? 'W' : 'S'
    case 1: return travel === 'S' ? 'E' : 'N'
    case 3: return travel === 'S' ? 'W' : 'N'
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
  const roadW = L - W
  const thin = W

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
      cp = {
        position: [cx, H / 2, cz],
        size: isNS ? [roadW, H, thin] : [thin, H, roadW],
        color,
      }
    } else {
      const rotY = (cellDir === 7 || cellDir === 3) ? -Math.PI / 4 : Math.PI / 4
      cp = {
        position: [cx, H / 2, cz],
        size: [roadW, H, roadW],
        visualSize: [roadW * Math.SQRT2, H, thin],
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
    case 8: return [0, 1, half]
    case 2: return [0, 1, -half]
    case 6: return [-half, 1, 0]
    case 4: return [half, 1, 0]
    default: return [0, 1, half]
  }
}

// ─── component ───────────────────────────────────────────────────────────────

const COOLDOWN_MS = 3000

// World-unit radius within which segments are rendered on Low quality (~4-5 tiles)
const CULL_DISTANCE = 300
const CULL_DIST_SQ = CULL_DISTANCE * CULL_DISTANCE

export function Track({ onTrigger, cooldownRef, onLoad }: TrackProps) {
  const [data, setData] = useState<TrackData | null>(null)
  const internalCooldown = useRef<number>(0)
  const lastTriggerTime = cooldownRef ?? internalCooldown
  const quality = useQuality()

  // Flat list of non-empty segments with their world positions
  const segments = useMemo(() => {
    if (!data) return []
    const { length, startRow, startCol, grid } = data
    const result: { r: number; c: number; dir: number; pos: [number, number, number] }[] = []
    grid.forEach((row, r) => {
      row.forEach((dir, c) => {
        if (dir !== 0) result.push({ r, c, dir, pos: [(c - startCol) * length, 0, (r - startRow) * length] })
      })
    })
    return result
  }, [data])

  const segmentGroupRefs = useRef<(THREE.Group | null)[]>([])

  // When switching away from Low, make all segments visible again
  useEffect(() => {
    if (quality !== 'low') {
      segmentGroupRefs.current.forEach(ref => { if (ref) ref.visible = true })
    }
  }, [quality])

  // Per-frame distance cull — only runs on Low quality
  useFrame(({ camera }) => {
    if (quality !== 'low') return
    const cx = camera.position.x
    const cz = camera.position.z
    segments.forEach((seg, i) => {
      const ref = segmentGroupRefs.current[i]
      if (!ref) return
      const dx = seg.pos[0] - cx
      const dz = seg.pos[2] - cz
      ref.visible = dx * dx + dz * dz < CULL_DIST_SQ
    })
  })

  useEffect(() => {
    fetch('/tracks/track01')
      .then(r => r.text())
      .then(text => {
        const parsed = parseTrack(text)
        setData(parsed)
        const startDir = parsed.grid[parsed.startRow]?.[parsed.startCol] ?? 8
        const isNS = startDir === 8 || startDir === 2
        const trigPos: [number, number, number] = [0, parsed.height / 2, 0]
        const trigSize: [number, number, number] = isNS
          ? [parsed.length, parsed.height, 2]
          : [2, parsed.height, parsed.length]
        onLoad?.(carStartFromData(parsed), buildCheckpoints(parsed), parsed.laps, trigPos, trigSize)
      })
  }, [])

  if (!data) return null

  const { length, width, height, startRow, startCol } = data
  const startDir = data.grid[startRow]?.[startCol] ?? 8
  const isNS = startDir === 8 || startDir === 2
  const triggerScale: [number, number, number] = isNS ? [length, height, 2] : [2, height, length]

  return (
    <>
      {segments.map((seg, i) => (
        <group
          key={`${seg.r}-${seg.c}`}
          ref={el => { segmentGroupRefs.current[i] = el }}
        >
          <Segment
            position={seg.pos}
            length={length}
            width={width}
            height={height}
            direction={seg.dir}
          />
        </group>
      ))}
      {onTrigger && (
        <TriggerBox
          position={[0, height / 2, 0]}
          scale={triggerScale}
          collisionFilterMask={1}
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
