export interface CheckpointDef {
  position: [number, number, number]
  size: [number, number, number]
  color?: string
}

const x = 20.0 as number;
const y = 2.0 as number;
const z = x as number;

const w = 35.0 as number;
const h = 5 as number;
const d = 2.0 as number;

// Add checkpoints in the order the car should pass through them.
// position: [x, y, z] — centre of the trigger box
// size:     [width, height, depth] — stretch to cover the full track width
export const CHECKPOINTS: CheckpointDef[] = [
  { position: [x * +0.0, y, z * -1.0], size: [w, h, d], color: "red" },
  // { position: [x * +0.0, y, z * -2.0], size: [w, h, d], color: "orange" },
  { position: [x * +0.0, y, z * -3.0], size: [w, h, d], color: "yellow" },
  { position: [x * -1.0, y, z * -4.0], size: [d, h, w], color: "green" },
  { position: [x * -2.0, y, z * -3.0], size: [w, h, d], color: "blue" },
  // { position: [x * -2.0, y, z * -2.0], size: [w, h, d], color: "indigo" },
  { position: [x * -2.0, y, z * -1.0], size: [w, h, d], color: "violet" },
  { position: [x * -3.0, y, z * -0.0], size: [d, h, w], color: "magenta" },
  // { position: [x * -4.0, y, z * +0.0], size: [d, h, w], color: "pink" },
  { position: [x * -5.0, y, z * +0.0], size: [d, h, w], color: "green" },
  // { position: [x * -6.0, y, z * +0.0], size: [d, h, w], color: "blue" },
  { position: [x * -7.0, y, z * +0.0], size: [d, h, w], color: "yellow" },
  { position: [x * -8.0, y, z * -1.0], size: [w, h, d], color: "magenta" },
  // { position: [x * -8.0, y, z * -2.0], size: [w, h, d], color: "pink" },
  { position: [x * -8.0, y, z * -3.0], size: [w, h, d], color: "gray" },
  { position: [x * -7.0, y, z * -4.0], size: [d, h, w], color: "coral" },
  { position: [x * -6.0, y, z * -3.0], size: [w, h, d], color: "seagreen" },
  { position: [x * -5.0, y, z * -2.0], size: [d, h, w], color: "salmon" },
  { position: [x * -4.0, y, z * -3.0], size: [w, h, d], color: "steelblue" },
  // { position: [x * -4.0, y, z * -4.0], size: [w, h, d], color: "goldenrodyellow" },
  { position: [x * -4.0, y, z * -5.0], size: [w, h, d], color: "pink" },
  { position: [x * -3.0, y, z * -6.0], size: [d, h, w], color: "cyan" },
  // { position: [x * -2.0, y, z * -6.0], size: [d, h, w], color: "blue" },
  // { position: [x * -1.0, y, z * -6.0], size: [d, h, w], color: "green" },
  { position: [x * +0.0, y, z * -6.0], size: [d, h, w], color: "yellow" },
  // { position: [x * +1.0, y, z * -6.0], size: [d, h, w], color: "coral" },
  // { position: [x * +2.0, y, z * -6.0], size: [d, h, w], color: "seagreen" },
  { position: [x * +3.0, y, z * -6.0], size: [d, h, w], color: "salmon" },
  { position: [x * +4.0, y, z * -5.0], size: [w, h, d], color: "steelblue" },
  { position: [x * +3.0, y, z * -4.0], size: [d, h, w], color: "goldenrodyellow" },
  { position: [x * +2.0, y, z * -3.0], size: [w, h, d], color: "pink" },
  { position: [x * +3.0, y, z * -2.0], size: [d, h, w], color: "cyan" },
  { position: [x * +4.0, y, z * -1.0], size: [w, h, d], color: "blue" },
  { position: [x * +3.0, y, z * -0.0], size: [d, h, w], color: "green" },
  { position: [x * +2.0, y, z * +1.0], size: [w, h, d], color: "yellow" },
  { position: [x * +3.0, y, z * +2.0], size: [d, h, w], color: "coral" },
  // { position: [x * +4.0, y, z * +2.0], size: [d, h, w], color: "seagreen" },
  { position: [x * +5.0, y, z * +2.0], size: [d, h, w], color: "salmon" },
  { position: [x * +6.0, y, z * +3.0], size: [w, h, d], color: "steelblue" },
  { position: [x * +5.0, y, z * +4.0], size: [d, h, w], color: "goldenrodyellow" },
  // { position: [x * +4.0, y, z * +4.0], size: [d, h, w], color: "pink" },
  { position: [x * +3.0, y, z * +4.0], size: [d, h, w], color: "cyan" },
  // { position: [x * +2.0, y, z * +4.0], size: [d, h, w], color: "blue" },
  { position: [x * +1.0, y, z * +4.0], size: [d, h, w], color: "green" },
  { position: [x * +0.0, y, z * +3.0], size: [w, h, d], color: "yellow" },
  // { position: [x * -0.0, y, z * +2.0], size: [w, h, d], color: "coral" },
  { position: [x * -0.0, y, z * +1.0], size: [w, h, d], color: "seagreen" },
  // { position: [x * -0.0, y, z * +0.0], size: [w, h, d], color: "salmon" },
]
