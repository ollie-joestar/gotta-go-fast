import { useState, useEffect, useRef } from "react"
import type { MutableRefObject } from "react"
import { Segment } from "./Segment"
import { TriggerBox } from "./TriggerBox"

interface TrackProps {
  onTrigger?: () => void
  cooldownRef?: MutableRefObject<number>
  onLoad?: (carStartPos: [number, number, number]) => void
}

interface TrackData {
  length: number
  width: number
  height: number
  startRow: number
  startCol: number
  grid: number[][]
}

function parseTrack(text: string): TrackData {
  const lines = text.split('\n').map(l => l.trim())
  let length = 64, width = 4, height = 10
  let startRow = 0, startCol = 0
  const gridLines: string[] = []

  for (const line of lines) {
    if      (line.startsWith('length =')) length = parseInt(line.split('=')[1].trim())
    else if (line.startsWith('width ='))  width  = parseInt(line.split('=')[1].trim())
    else if (line.startsWith('height =')) height = parseInt(line.split('=')[1].trim())
    else if (line.startsWith('start =')) {
      const m = line.match(/\[(\d+),\s*(\d+)\]/)
      if (m) { startRow = parseInt(m[1]); startCol = parseInt(m[2]) }
    } else if (/^[0-9]+$/.test(line)) {
      gridLines.push(line)
    }
  }

  const grid = gridLines.map(l => l.split('').map(Number))
  return { length, width, height, startRow, startCol, grid }
}

const COOLDOWN_MS = 3000

function carStartFromData(data: TrackData): [number, number, number] {
  const dir = data.grid[data.startRow]?.[data.startCol] ?? 8
  const half = data.length / 2
  switch (dir) {
    case 8: return [0, 1,  half]   // going N → spawn south (+Z)
    case 2: return [0, 1, -half]   // going S → spawn north (-Z)
    case 6: return [-half, 1, 0]   // going E → spawn west  (-X)
    case 4: return [ half, 1, 0]   // going W → spawn east  (+X)
    default: return [0, 1, half]
  }
}

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
        onLoad?.(carStartFromData(parsed))
      })
  }, [])

  if (!data) return null

  const { length, width, height, startRow, startCol, grid } = data

  // Start tile is always at world origin (0, 0, 0) — everything else is offset from it.
  // Trigger orientation follows start direction: N/S spans X, E/W spans Z.
  const startDir = grid[startRow]?.[startCol] ?? 8
  const isNS = startDir === 8 || startDir === 2
  const triggerScale: [number, number, number] = isNS
    ? [length, height, 2]
    : [2, height, length]

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
