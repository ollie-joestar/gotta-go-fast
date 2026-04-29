// App.tsx
import { Canvas } from "@react-three/fiber"
import { Physics } from "@react-three/cannon"
import { Scene } from "./Scene"
import { useState, useCallback } from "react"

export default function App() {
  const [debugSpeed, setDebugSpeed] = useState(0)

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh" }}>

      <Canvas frameloop="demand">
        <Physics
          gravity={[0, -9.81, 0]}
          defaultContactMaterial={{ friction: 0.8, restitution: 0 }}
          broadphase="SAP"
        >
          <Scene onDebugSpeed={setDebugSpeed} />
        </Physics>
      </Canvas>

      {/* Overlay — lives outside Canvas, no drei Html needed */}
      <div style={{
        position: "absolute",
        top: 8,
        left: 8,
        color: "white",
        fontFamily: "monospace",
        fontSize: 12,
        background: "rgba(0,0,0,0.55)",
        padding: "3px 5px",
        borderRadius: 6,
        pointerEvents: "none",
      }}>
        fSpeed: {debugSpeed.toFixed(2)}
      </div>
    </div>
  )
}
