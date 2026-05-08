import { usePlane } from "@react-three/cannon";
import { useTexture } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";

const GROUND_NORMAL_SCALE = 0.3   // bump intensity — lower = flatter, 0 = completely flat
const GROUND_ROUGHNESS    = 1.0   // 0 = mirror, 1 = fully matte
const GROUND_METALNESS    = 0.0   // 0 = dielectric, 1 = metallic

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
        normalScale={new THREE.Vector2(GROUND_NORMAL_SCALE, GROUND_NORMAL_SCALE)}
        roughnessMap={null}
        color={new THREE.Color(0.1, 0.1, 0.1)}

        roughness={GROUND_ROUGHNESS}
        metalness={GROUND_METALNESS}
        envMapIntensity={0}
      // roughness={0}
      // metalness={1}
      />
    </mesh>
  );
}
