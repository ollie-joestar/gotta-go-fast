import { usePlane } from "@react-three/cannon";
import { useTexture } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";

export function Ground() {
  const [ref] = usePlane(() => ({
    type: "Static",
    rotation: [-Math.PI / 2, 0, 0],
    position: [0, 0, 0],
  }));

  const textures = useTexture({
    map: "/textures/ground/concrete_floor_worn_001_diff_1k.jpg",
    normalMap: "/textures/ground/concrete_floor_worn_001_nor_gl_1k.jpg",
    roughnessMap: "/textures/ground/concrete_floor_worn_001_rough_1k.jpg",
    displacementMap: "/textures/ground/concrete_floor_worn_001_disp_1k.png",
  });

  useMemo(() => {
    textures.map.colorSpace = THREE.SRGBColorSpace;

    Object.values(textures).forEach((texture) => {
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;

      texture.repeat.set(128, 128);
      // texture.repeat.set(256, 256);

      // texture.anisotropy = 16;
    });
  }, [textures]);

  return (
    <mesh ref={ref} receiveShadow>
      <planeGeometry args={[2000, 2000, 128, 128]} />

      <meshStandardMaterial
        {...textures}
        displacementScale={0.03}
        normalScale={new THREE.Vector2(1, 1)}
        color={new THREE.Color(0.2, 0.2, 0.2)}

        roughness={0.7}
        metalness={0.3}
      // roughness={0}
      // metalness={1}
      />
    </mesh>
  );
}
