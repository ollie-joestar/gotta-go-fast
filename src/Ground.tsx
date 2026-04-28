// Ground.tsx
import { usePlane } from "@react-three/cannon";

export function Ground() {
  const [ref] = usePlane(() => ({
    type: "Static",
    rotation: [-Math.PI / 2, 0, 0],
    position: [0, 0, 0],
    material: "ground"
  }));

  return (
    <mesh ref={ref}>
      <planeGeometry args={[2000, 2000, 1000, 1000]} />
      <meshStandardMaterial color="black" />
      {/* <meshStandardMaterial wireframe color="green" /> */}
    </mesh>
  );
}
