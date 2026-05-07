// Track.tsx
import { useGLTF } from "@react-three/drei"
import { useEffect } from "react"
import * as THREE from "three"

export function Track() {

  // parse the track from /public/tracks/track01.txt.
  // the track file is a text file with the following format:
  // 8 north, 2 south, 4 west, 6 east
  // in the file are also the values for the map sixing (length, width, height).
  // use the parsed values in the 2D array to create the track segments using the Segment component.
  // Each segment should be created with the correct position, length, width, height, checkpoint, direction and if needed with the start trigger box.
  // the checkpoint created should be added to the array of checkpoints that will be used the same way as they are used in the old codebase.
  // 
  // the track should be created in the 3D space using the correct position and scale for each segment.

  // return all the segments


}
