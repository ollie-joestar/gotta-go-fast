import { ContainerWall } from "./ContainerWall"

// Direction legend (numpad layout):
//   7 8 9
//   4   6
//   1 2 3
//
// Straights: 8/2 = N/S (walls on E+W), 4/6 = E/W (walls on N+S)
// Corners:   7=NW(N+W), 9=NE(N+E), 1=SW(S+W), 3=SE(S+E)
// Each corner label names the CLOSED sides; open sides connect to adjacent tiles.

interface SegmentProps {
  position: [number, number, number]  // tile centre (x, 0, z)
  length: number                      // tile size (world units)
  width: number                       // wall thickness (world units)
  height: number
  direction: number
}

export function Segment({ position, length, width, height, direction }: SegmentProps) {
  const cx = position[0]
  const cz = position[2]
  const y = height / 2
  // Wall centres sit half a wall-width inward from the tile edge
  const half = length / 2 - width / 2
  const wallLength = length - (2 * width) // wall length is tile length minus 2 wall thicknesses, so walls don't overlap at corners

  // N/S walls run along X axis; E/W walls run along Z axis
  const wallN = <ContainerWall position={[cx, y, cz - half]} wallLength={length} wallHeight={height} wallDepth={width} runningAxis="x" />
  const wallS = <ContainerWall position={[cx, y, cz + half]} wallLength={length} wallHeight={height} wallDepth={width} runningAxis="x" />
  const wallE = <ContainerWall position={[cx + half, y, cz]} wallLength={length} wallHeight={height} wallDepth={width} runningAxis="z" />
  const wallW = <ContainerWall position={[cx - half, y, cz]} wallLength={length} wallHeight={height} wallDepth={width} runningAxis="z" />

  switch (direction) {
    case 8: case 2: return <>{wallE}{wallW}</>  // N/S straight
    case 6: case 4: return <>{wallN}{wallS}</>  // E/W straight
    case 7: return <>{wallN}{wallW}</>  // NW corner
    case 9: return <>{wallN}{wallE}</>  // NE corner
    case 1: return <>{wallS}{wallW}</>  // SW corner
    case 3: return <>{wallS}{wallE}</>  // SE corner
    default: return null
  }
}
