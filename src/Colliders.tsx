// Colliders.tsx
import { ColliderBox as CBox } from "./ColliderBox";
import { TriggerBox } from "./TriggerBox";
import { useRef } from "react";

interface CollidersProps {
  onTrigger: () => void
}
export function Colliders({ onTrigger }: CollidersProps) {
  const x = 40.0 as number;
  const hx = x / 2.0 as number;
  const h = 10.0 as number;
  const y = h / 2.0 as number;
  const w = 10.0 as number;

  const lastTriggerTime = useRef<number>(0);
  const COOLDOWN_MS = 3000; // 3 second cooldown to prevent multiple triggers

  return (
    <>
      <TriggerBox
        position={[0, y, -hx]}
        scale={[x - 2, h, 1]}
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
      <CBox position={[-hx * 7, y, x * -1]} scale={[w, h, x]} color="cyan" />
      <CBox position={[-hx * 3, y, x * -1.5]} scale={[w, h, x * 2]} color="cyan" />
      <CBox position={[hx * 1, y, x * -0.5]} scale={[w, h, x * 4]} color="cyan" />
      <CBox position={[hx * 7, y, x * 1.5]} scale={[w, h, x * 2]} color="cyan" />

      {/* *****************************/}
      {/* ******** Pink Walls *********/}
      {/* *****************************/}
      <CBox position={[-hx * 9, y, x * -1]} scale={[w, h, x * 3]} color="pink" />
      <CBox position={[-hx * 5, y, x * -2.5]} scale={[w, h, x * 2]} color="pink" />
      <CBox position={[-hx * 1, y, x * 0.5]} scale={[w, h, x * 4]} color="pink" />
      <CBox position={[hx * 5, y, x * -1.5]} scale={[w, h, x * 4]} color="pink" />

      {/* ********************************/}
      {/* ********* Green Walls **********/}
      {/* ********************************/}
      <CBox position={[x * 0.0, y, hx * -7]} scale={[x * 5, h, w]} color="lightgreen" />
      <CBox position={[x * 2.0, y, hx * -3]} scale={[x, h, w]} color="lightgreen" />
      <CBox position={[x * -2.5, y, hx]} scale={[x * 4, h, w]} color="lightgreen" />
      <CBox position={[x * 2.5, y, hx]} scale={[x * 2, h, w]} color="lightgreen" />
      <CBox position={[x * 1.5, y, hx * 5]} scale={[x * 4, h, w]} color="lightgreen" />

      {/* ********************************/}
      {/* ********* Orange Walls *********/}
      {/* ********************************/}
      <CBox position={[x * -3.5, y, hx * -5]} scale={[x * 2, h, w]} color="orange" />
      <CBox position={[x * 0.0, y, hx * -5]} scale={[x * 3, h, w]} color="orange" />
      <CBox position={[x * -2.5, y, hx * -1]} scale={[x * 2, h, w]} color="orange" />
      <CBox position={[x * 1.0, y, hx * -1]} scale={[x, h, w]} color="orange" />
      <CBox position={[x * 1.5, y, hx * 3]} scale={[x * 2, h, w]} color="orange" />
    </>
  );
}
