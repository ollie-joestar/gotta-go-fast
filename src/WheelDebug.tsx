// WheelDebug.tsx
import * as THREE from 'three';
import type { RefObject } from 'react';

const debug = false;

interface WheelDebugProps {
  radius: number;
  wheelRef: RefObject<THREE.Object3D> | null;
}

export const WheelDebug = ({ radius, wheelRef }: WheelDebugProps) => {
  if (!debug) return null;
  const wheelWidth = 0.33 as const; // wheel width
  return (
    <group ref={wheelRef}>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[radius, radius, wheelWidth, 16]} />
        <meshBasicMaterial transparent opacity={0.2} color="white" />
      </mesh>
    </group>
  );
};
