import { ColliderBox as CBox } from "../ColliderBox";
import { TriggerBox } from "../TriggerBox";
import { useRef } from "react";

export const CAR_START_POSITION: [number, number, number] = [0, 1, 0];
export const TRACK_ID = "track_01" as string
export const VERSION = 1.0 as number

export interface CheckpointDef {
  position: [number, number, number]
  size: [number, number, number]
  color?: string
}

const x = 20.0 as number;
const l = x * 2 as number;
const h = 10.0 as number;
const y = h / 2.0 as number;
const d = 2.0 as number;
const w = 10.0 as number;

// Add checkpoints in the order the car should pass through them.
// position: [x, y, z] — centre of the trigger box
// size:     [width, height, depth] — stretch to cover the full track width
export const CHECKPOINTS: CheckpointDef[] = [
  { position: [x * +0.0, y, x * -1.0], size: [l, h, d], color: "red" },
  { position: [x * +0.0, y, x * -3.0], size: [l, h, d], color: "yellow" },
  { position: [x * -1.0, y, x * -4.0], size: [d, h, l], color: "green" },
  { position: [x * -2.0, y, x * -3.0], size: [l, h, d], color: "blue" },
  { position: [x * -2.0, y, x * -1.0], size: [l, h, d], color: "violet" },
  { position: [x * -3.0, y, x * -0.0], size: [d, h, l], color: "magenta" },
  { position: [x * -5.0, y, x * +0.0], size: [d, h, l], color: "green" },
  { position: [x * -7.0, y, x * +0.0], size: [d, h, l], color: "yellow" },
  { position: [x * -8.0, y, x * -1.0], size: [l, h, d], color: "magenta" },
  { position: [x * -8.0, y, x * -3.0], size: [l, h, d], color: "gray" },
  { position: [x * -7.0, y, x * -4.0], size: [d, h, l], color: "coral" },
  { position: [x * -6.0, y, x * -3.0], size: [l, h, d], color: "seagreen" },
  { position: [x * -5.0, y, x * -2.0], size: [d, h, l], color: "salmon" },
  { position: [x * -4.0, y, x * -3.0], size: [l, h, d], color: "steelblue" },
  { position: [x * -4.0, y, x * -5.0], size: [l, h, d], color: "pink" },
  { position: [x * -3.0, y, x * -6.0], size: [d, h, l], color: "cyan" },
  { position: [x * +0.0, y, x * -6.0], size: [d, h, l], color: "yellow" },
  { position: [x * +3.0, y, x * -6.0], size: [d, h, l], color: "salmon" },
  { position: [x * +4.0, y, x * -5.0], size: [l, h, d], color: "steelblue" },
  { position: [x * +3.0, y, x * -4.0], size: [d, h, l], color: "goldenrodyellow" },
  { position: [x * +2.0, y, x * -3.0], size: [l, h, d], color: "pink" },
  { position: [x * +3.0, y, x * -2.0], size: [d, h, l], color: "cyan" },
  { position: [x * +4.0, y, x * -1.0], size: [l, h, d], color: "blue" },
  { position: [x * +3.0, y, x * -0.0], size: [d, h, l], color: "green" },
  { position: [x * +2.0, y, x * +1.0], size: [l, h, d], color: "yellow" },
  { position: [x * +3.0, y, x * +2.0], size: [d, h, l], color: "coral" },
  { position: [x * +5.0, y, x * +2.0], size: [d, h, l], color: "salmon" },
  { position: [x * +6.0, y, x * +3.0], size: [l, h, d], color: "steelblue" },
  { position: [x * +5.0, y, x * +4.0], size: [d, h, l], color: "goldenrodyellow" },
  { position: [x * +3.0, y, x * +4.0], size: [d, h, l], color: "cyan" },
  { position: [x * +1.0, y, x * +4.0], size: [d, h, l], color: "green" },
  { position: [x * +0.0, y, x * +3.0], size: [l, h, d], color: "yellow" },
  { position: [x * -0.0, y, x * +1.0], size: [l, h, d], color: "seagreen" },
];

interface CollidersProps {
  onTrigger: () => void
}

export function Colliders({ onTrigger }: CollidersProps) {
  const lastTriggerTime = useRef<number>(0);
  const COOLDOWN_MS = 3000;

  return (
    <>
      {/* start/finish trigger — stretch across entire track width, but very thin depth */}
      <TriggerBox
        position={[0, y, -x]}
        scale={[x * 2 - 2, h, 1]}
        onCollide={() => {
          const now = Date.now()
          if (now - lastTriggerTime.current < COOLDOWN_MS) return
          lastTriggerTime.current = now
          console.log("Trigger fired!")
          onTrigger()
        }}
      />
      {/* *****************************/}
      {/* ******** Zero Pos  **********/}
      {/* *****************************/}
      <CBox position={[0, 15, 0]} scale={[1.0, 1.0, 1.0]} color="white" />
      <CBox position={[1, 15, 0]} scale={[1.0, 1.0, 1.0]} color="red" />
      <CBox position={[0, 15, 1]} scale={[1.0, 1.0, 1.0]} color="green" />

      {/* *****************************/}
      {/* ******** Cyan Walls *********/}
      {/* *****************************/}
      <CBox position={[x * -7.0, y, x * -2.0]} scale={[w, h, x * 2]} color="cyan" />
      <CBox position={[x * -3.0, y, x * -3.0]} scale={[w, h, x * 4]} color="cyan" />
      <CBox position={[x * +1.0, y, x * -1.0]} scale={[w, h, x * 8]} color="cyan" />
      <CBox position={[x * +7.0, y, x * +3.0]} scale={[w, h, x * 4]} color="cyan" />

      {/* *****************************/}
      {/* ******** Pink Walls *********/}
      {/* *****************************/}
      <CBox position={[x * -9.0, y, x * -2.0]} scale={[w, h, x * 6]} color="pink" />
      <CBox position={[x * -5.0, y, x * -5.0]} scale={[w, h, x * 4]} color="pink" />
      <CBox position={[x * -1.0, y, x * +1.0]} scale={[w, h, x * 8]} color="pink" />
      <CBox position={[x * +5.0, y, x * -3.0]} scale={[w, h, x * 8]} color="pink" />

      {/* ********************************/}
      {/* ********* Green Walls **********/}
      {/* ********************************/}
      <CBox position={[x * +0.0, y, x * -7.0]} scale={[x * 10, h, w]} color="lightgreen" />
      <CBox position={[x * +4.0, y, x * -3.0]} scale={[x * 2, h, w]} color="lightgreen" />
      <CBox position={[x * -5.0, y, x * +1.0]} scale={[x * 8, h, w]} color="lightgreen" />
      <CBox position={[x * +5.0, y, x * +1.0]} scale={[x * 4, h, w]} color="lightgreen" />
      <CBox position={[x * +3.0, y, x * +5.0]} scale={[x * 8, h, w]} color="lightgreen" />

      {/* ********************************/}
      {/* ********* Orange Walls *********/}
      {/* ********************************/}
      <CBox position={[x * -7.0, y, x * -5.0]} scale={[x * 4, h, w]} color="orange" />
      <CBox position={[x * +0.0, y, x * -5.0]} scale={[x * 6, h, w]} color="orange" />
      <CBox position={[x * -5.0, y, x * -1.0]} scale={[x * 4, h, w]} color="orange" />
      <CBox position={[x * +2.0, y, x * -1.0]} scale={[x * 2, h, w]} color="orange" />
      <CBox position={[x * +3.0, y, x * +3.0]} scale={[x * 4, h, w]} color="orange" />
    </>
  );
}
