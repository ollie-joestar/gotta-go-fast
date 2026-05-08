import { useBox } from "@react-three/cannon"
import { useGLTF, useTexture } from "@react-three/drei"
import { useMemo } from "react"
import * as THREE from "three"

const COLOR_PATHS = [
  '/textures/container/Container_Material_BaseColor_blue.png',
  '/textures/container/Container_Material_BaseColor_cyan.png',
  '/textures/container/Container_Material_BaseColor_green.png',
  '/textures/container/Container_Material_BaseColor_grey.png',
  '/textures/container/Container_Material_BaseColor_pink.png',
  '/textures/container/Container_Material_BaseColor_purple.png',
  '/textures/container/Container_Material_BaseColor_red.png',
  '/textures/container/Container_Material_BaseColor_white.png',
  '/textures/container/Container_Material_BaseColor_yellow.png',
]

// Start loading the model before any component mounts
useGLTF.preload('/models/ContainerTextureless.glb')

interface ContainerWallProps {
  position: [number, number, number]
  wallLength: number    // dimension along running axis (containers tile here, 6 per wall)
  wallHeight: number    // Y dimension (containers stack here, 3 per wall)
  wallDepth: number     // wall thickness
  runningAxis: 'x' | 'z'  // which world axis the wall runs along
  cols?: number
  rows?: number
}

export function ContainerWall({
  position,
  wallLength,
  wallHeight,
  wallDepth,
  runningAxis,
  cols = 6,
  rows = 3,
}: ContainerWallProps) {
  // Physics collider sized to the full wall extent in world space
  const physicsArgs: [number, number, number] = runningAxis === 'x'
    ? [wallLength, wallHeight, wallDepth]
    : [wallDepth, wallHeight, wallLength]

  useBox<THREE.Mesh>(() => ({
    args: physicsArgs,
    position,
    type: 'Static',
  }))

  const { scene } = useGLTF('/models/ContainerTextureless.glb')

  // useTexture defaults to flipY=true, but GLTF geometry has V already flipped (v = 1-v),
  // so we must set flipY=false to match. Color maps are sRGB; normal/ORM are linear.
  // Wrapped in useMemo so configuration (and the GPU re-upload triggered by needsUpdate)
  // only happens once when textures first load, not on every render.
  const colorTextures = useTexture(COLOR_PATHS) as THREE.Texture[]
  useMemo(() => {
    colorTextures.forEach(t => {
      t.flipY = false
      t.colorSpace = THREE.SRGBColorSpace
      t.needsUpdate = true
    })
  }, [colorTextures])

  const normalMap = useTexture('/textures/container/Container_Material_Normal.png') as THREE.Texture
  useMemo(() => {
    normalMap.flipY = false
    normalMap.colorSpace = THREE.LinearSRGBColorSpace
    normalMap.needsUpdate = true
  }, [normalMap])

  const ormMap = useTexture('/textures/container/Container_Material_OcclusionRoughnessMetallic.png') as THREE.Texture
  useMemo(() => {
    ormMap.flipY = false
    ormMap.colorSpace = THREE.LinearSRGBColorSpace
    ormMap.needsUpdate = true
  }, [ormMap])

  // Clone the first mesh geometry, apply coordinate fix (Blender Z-up → Y-up),
  // then center so the origin sits at the bounding box centre
  const geometry = useMemo(() => {
    let found: THREE.BufferGeometry | null = null
    scene.traverse(child => {
      if (child instanceof THREE.Mesh && !found) {
        found = (child as THREE.Mesh).geometry.clone()
        found.applyMatrix4(new THREE.Matrix4().makeRotationY(Math.PI / 2))
        found.applyMatrix4(new THREE.Matrix4().makeRotationX(-Math.PI / 2))
        // found.applyMatrix4(new THREE.Matrix4().makeRotationZ(Math.PI))
        found.center()
        // aoMap needs a uv2 attribute; copy uv if a second set isn't already present
        if (!found.attributes.uv2) {
          found.setAttribute('uv2', found.attributes.uv)
        }
      }
    })
    return found
  }, [scene])

  // Native bounding box size after centering
  const nativeSize = useMemo((): [number, number, number] => {
    if (!geometry) return [1, 1, 1]
    geometry.computeBoundingBox()
    const v = new THREE.Vector3()
    geometry.boundingBox!.getSize(v)
    return [v.x, v.y, v.z]
  }, [geometry])

  // Stable random colour assignment — one per container slot
  const colorIndices = useMemo(
    () => Array.from({ length: cols * rows }, () => Math.floor(Math.random() * COLOR_PATHS.length)),
    [cols, rows]
  )

  if (!geometry) return null

  // Per-container dimensions in local space (wall always runs along local X here)
  const cLen = wallLength / cols
  const cH = wallHeight / rows
  const cD = wallDepth

  const sx = cLen / nativeSize[0]
  const sy = cH / nativeSize[1]
  const sz = cD / nativeSize[2]

  // Rotate the group so local X aligns with the wall's running axis in world space
  const rotY = runningAxis === 'z' ? Math.PI / 2 : 0

  return (
    <group position={position} rotation={[0, rotY, 0]}>
      {Array.from({ length: rows }, (_, row) =>
        Array.from({ length: cols }, (_, col) => {
          const x = (col - cols / 2 + 0.5) * cLen
          const y = (row - rows / 2 + 0.5) * cH

          return (
            <mesh
              key={`${col}-${row}`}
              position={[x, y, 0]}
              scale={[sx, sy, sz]}
              geometry={geometry}
            >
              <meshStandardMaterial
                map={colorTextures[colorIndices[row * cols + col]]}
                normalMap={normalMap}
                aoMap={ormMap}
                roughnessMap={ormMap}
                metalnessMap={ormMap}
                roughness={1}
                metalness={1}
              />
            </mesh>
          )
        })
      )}
    </group>
  )
}
