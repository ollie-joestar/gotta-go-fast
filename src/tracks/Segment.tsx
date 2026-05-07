import { ColliderBox as CBox } from "../ColliderBox";
import { TriggerBox } from "../TriggerBox";

interface SegmentProps {
  position: [number, number, number]
  length: number
  width: number
  height: number

  checkpoint: string
  direction: string
  start: boolean
}

export function Segment({ position, length, width, height, checkpoint, direction, start }: SegmentProps) {
  const y = height / 2.0 as number;

  let xOffset = 0.0 as number;
  let zOffset = 0.0 as number;
  let l = 0.0 as number;
  let w = 0.0 as number;

  if (direction == "N" || direction == "S") {
    xOffset = (length - width) / 2.0 as number;
    zOffset = 0.0 as number;
    l = length as number;
    w = width as number;
  } else if (direction == "E" || direction == "W") {
    xOffset = 0.0 as number;
    zOffset = (length - width) / 2.0 as number;
    l = width as number;
    w = length as number;
  }


  return (
    <>
      <CBox position={[position[0] + xOffset, y, position[2] + zOffset]} scale={[l, height, w]} color="blue" />
      <CBox position={[position[0] - xOffset, y, position[2] - zOffset]} scale={[l, height, w]} color="red" />
      if (start == true) {
        <TriggerBox
          position={position}
          scale={[l, height, w]}
        />
      }
    </>
  )
}
