import { useBox } from "@react-three/cannon"
import { useGLTF, useTexture } from "@react-three/drei"
import { useMemo, useEffect } from "react"
import * as THREE from "three"
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

const COLOR_PATHS = [
  '/textures/container/Container_Material_BaseColor_blue_very_smol.png',
  '/textures/container/Container_Material_BaseColor_cyan_very_smol.png',
  '/textures/container/Container_Material_BaseColor_green_very_smol.png',
  '/textures/container/Container_Material_BaseColor_grey_very_smol.png',
  '/textures/container/Container_Material_BaseColor_pink_very_smol.png',
  '/textures/container/Container_Material_BaseColor_purple_very_smol.png',
  '/textures/container/Container_Material_BaseColor_red_very_smol.png',
  '/textures/container/Container_Material_BaseColor_white_very_smol.png',
  '/textures/container/Container_Material_BaseColor_yellow_very_smol.png',
]

useGLTF.preload('/models/ContainerTextureless2.glb')

interface ContainerWallProps {
  position: [number, number, number]
  wallLength: number
  wallHeight: number
  wallDepth: number
  runningAxis: 'x' | 'z'
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
  const physicsArgs: [number, number, number] = runningAxis === 'x'
    ? [wallLength, wallHeight, wallDepth]
    : [wallDepth, wallHeight, wallLength]

  useBox<THREE.Mesh>(() => ({
    args: physicsArgs,
    position,
    type: 'Static',
  }))

  const { scene } = useGLTF('/models/ContainerTextureless2.glb')

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

  const ormMap = useTexture('/textures/container/Container_Material_OcclusionRoughnessMetallic_very_smol.png') as THREE.Texture
  useMemo(() => {
    ormMap.flipY = false
    ormMap.colorSpace = THREE.LinearSRGBColorSpace
    ormMap.needsUpdate = true
  }, [ormMap])

  const geometry = useMemo(() => {
    let found: THREE.BufferGeometry | null = null
    scene.traverse(child => {
      if (child instanceof THREE.Mesh && !found) {
        found = (child as THREE.Mesh).geometry.clone()
        found.applyMatrix4(new THREE.Matrix4().makeRotationY(Math.PI / 2))
        found.applyMatrix4(new THREE.Matrix4().makeRotationX(-Math.PI / 2))
        found.center()
        if (!found.attributes.uv2) {
          found.setAttribute('uv2', found.attributes.uv)
        }
      }
    })
    return found
  }, [scene])

  const nativeSize = useMemo((): [number, number, number] => {
    if (!geometry) return [1, 1, 1]
    geometry.computeBoundingBox()
    const v = new THREE.Vector3()
    geometry.boundingBox!.getSize(v)
    return [v.x, v.y, v.z]
  }, [geometry])

  // One random color for the entire wall, picked once on mount
  const colorIdx = useMemo(() => Math.floor(Math.random() * COLOR_PATHS.length), [])

  const iCols = Math.floor(cols)
  const iRows = Math.floor(rows)
  const cLen = wallLength / iCols
  const cH = wallHeight / iRows
  const sx = cLen / nativeSize[0]
  const sy = cH / nativeSize[1]
  const sz = wallDepth / nativeSize[2]

  const rotY = runningAxis === 'z' ? Math.PI / 2 : 0

  // All containers share one color — merge everything into a single BufferGeometry
  const mergedGeo = useMemo(() => {
    if (!geometry) return null

    const clones: THREE.BufferGeometry[] = []
    for (let row = 0; row < iRows; row++) {
      for (let col = 0; col < iCols; col++) {
        const x = (col - iCols / 2 + 0.5) * cLen
        const y = (row - iRows / 2 + 0.5) * cH
        const mat = new THREE.Matrix4().compose(
          new THREE.Vector3(x, y, 0),
          new THREE.Quaternion(),
          new THREE.Vector3(sx, sy, sz)
        )
        const g = geometry.clone()
        g.applyMatrix4(mat)
        clones.push(g)
      }
    }

    const merged = mergeGeometries(clones, false)
    clones.forEach(g => g.dispose())
    if (merged && !merged.attributes.uv2) merged.setAttribute('uv2', merged.attributes.uv)
    return merged
  }, [geometry, iCols, iRows, cLen, cH, sx, sy, sz])

  useEffect(() => {
    return () => { mergedGeo?.dispose() }
  }, [mergedGeo])

  if (!mergedGeo) return null

  return (
    <group position={position} rotation={[0, rotY, 0]}>
      {/* Single shadow caster for the whole wall */}
      <mesh castShadow>
        <boxGeometry args={[wallLength, wallHeight, wallDepth]} />
        <meshBasicMaterial colorWrite={false} depthWrite={false} />
      </mesh>
      <mesh geometry={mergedGeo}>
        <meshStandardMaterial
          map={colorTextures[colorIdx]}
          normalMap={normalMap}
          aoMap={ormMap}
          roughnessMap={ormMap}
          metalnessMap={ormMap}
          roughness={1}
          metalness={1}
          side={THREE.FrontSide}
        />
      </mesh>
    </group>
  )
}
