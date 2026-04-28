// Controller.tsx
import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";

const FORCE = 9000 as number;
const DIFFERENTIAL = 0.5 as number;
const FFORCE = FORCE * (1 - DIFFERENTIAL) as number;
const RFORCE = FORCE * DIFFERENTIAL as number;
const REV_FORCE = -FORCE * 0.5 as number;
const BRAKE_FORCE = 85 as number;
const FBRAKE_BIAS = 0.15 as number;
const REVERSE_THRESHOLD = 0.4 as number;

const MAX_STEER = 0.5;
const MIN_STEER = 0.15;
const STEER_SPEED_MAX = 35; // speed (m/s) at which steering reaches minimum angle

export const useControls = (vehicleApi: any, chassisApi: any, enabled = true) => {
  const controls = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false,
    reset: false,
    handbrake: false,
  });

  const velocity = useRef<[number, number, number]>([0, 0, 0]);
  const quaternion = useRef<[number, number, number, number]>([0, 0, 0, 1]);
  const shouldBrake = useRef(false);
  const [debugSpeed, setDebugSpeed] = useState(0);

  // Subscribe to physics values
  useEffect(() => {
    const unsubVel = chassisApi.velocity.subscribe(
      (v: [number, number, number]) => { velocity.current = v; }
    );
    const unsubRot = chassisApi.quaternion.subscribe(
      (q: [number, number, number, number]) => { quaternion.current = q; }
    );
    return () => {
      unsubVel();
      unsubRot();
    };
  }, [chassisApi]);

  // Keyboard listeners
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      switch (e.key) {
        case "w": controls.current.forward = true; break;
        case "s": controls.current.backward = true; break;
        case "a": controls.current.left = true; break;
        case "d": controls.current.right = true; break;
        case "r": controls.current.reset = true; break;
        case " ": controls.current.handbrake = true; break;
      }
    };
    const up = (e: KeyboardEvent) => {
      switch (e.key) {
        case "w": controls.current.forward = false; break;
        case "s": controls.current.backward = false; break;
        case "a": controls.current.left = false; break;
        case "d": controls.current.right = false; break;
        case "r": controls.current.reset = false; break;
        case " ": controls.current.handbrake = false; break;
      }
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  // Physics loop — runs every frame, always has fresh velocity/quaternion
  useFrame(() => {
    if (!enabled) return;
    const { forward, backward, left, right, reset, handbrake } = controls.current;

    // --- Compute forward speed along car's local axis ---
    const [qx, qy, qz, qw] = quaternion.current;
    const [vx, vy, vz] = velocity.current;

    const forwardX = -2 * (qx * qz + qw * qy);
    const forwardY = -2 * (qy * qz - qw * qx);
    const forwardZ = -(1 - 2 * (qx * qx + qy * qy));

    const fSpeed = vx * forwardX + vy * forwardY + vz * forwardZ;
    if (Math.round(fSpeed * 10) !== Math.round(debugSpeed * 10)) {
      setDebugSpeed(fSpeed);
    }

    // Brake bias: when turning, unload front wheels (2,3) so they keep lateral grip.
    // Rears (0,1) absorb the braking load; fronts stay near-free to steer.
    const isTurning = left || right;
    const frontBrake = isTurning ? BRAKE_FORCE * FBRAKE_BIAS : BRAKE_FORCE;
    const rearBrake = BRAKE_FORCE;


    // --- Drive ---
    if (forward && !handbrake) {
      vehicleApi.setBrake(0, 0);
      vehicleApi.setBrake(0, 1);
      vehicleApi.setBrake(0, 2);
      vehicleApi.setBrake(0, 3);
      vehicleApi.applyEngineForce(RFORCE, 0);
      vehicleApi.applyEngineForce(RFORCE, 1);
      vehicleApi.applyEngineForce(FFORCE, 2);
      vehicleApi.applyEngineForce(FFORCE, 3);
      // }
    } else if (backward && !handbrake) {
      if (fSpeed > REVERSE_THRESHOLD) {
        shouldBrake.current = true;
      } else if (fSpeed < 0.2) {
        shouldBrake.current = false;
      }
      if (shouldBrake.current) {
        vehicleApi.applyEngineForce(0, 0);
        vehicleApi.applyEngineForce(0, 1);
        vehicleApi.applyEngineForce(0, 2);
        vehicleApi.applyEngineForce(0, 3);
        vehicleApi.setBrake(rearBrake, 0);
        vehicleApi.setBrake(rearBrake, 1);
        vehicleApi.setBrake(frontBrake, 2);
        vehicleApi.setBrake(frontBrake, 3);
      } else {
        // Stopped or reversing → reverse
        vehicleApi.setBrake(0, 0);
        vehicleApi.setBrake(0, 1);
        vehicleApi.setBrake(0, 2);
        vehicleApi.setBrake(0, 3);
        vehicleApi.applyEngineForce(REV_FORCE, 0);
        vehicleApi.applyEngineForce(REV_FORCE, 1);
        vehicleApi.applyEngineForce(REV_FORCE * 0.5, 2);
        vehicleApi.applyEngineForce(REV_FORCE * 0.5, 3);
      }
    } else if (handbrake) {
      vehicleApi.setBrake(BRAKE_FORCE * 3, 0);
      vehicleApi.setBrake(BRAKE_FORCE * 3, 1);
      vehicleApi.setBrake(0, 2);
      vehicleApi.setBrake(0, 3);
      if (forward) {
        vehicleApi.applyEngineForce(RFORCE, 0);
        vehicleApi.applyEngineForce(RFORCE, 1);
        vehicleApi.applyEngineForce(0, 2);
        vehicleApi.applyEngineForce(0, 3);
      } else {
        vehicleApi.applyEngineForce(0, 0);
        vehicleApi.applyEngineForce(0, 1);
        vehicleApi.applyEngineForce(0, 2);
        vehicleApi.applyEngineForce(0, 3);
      }
    } else {
      vehicleApi.setBrake(0, 0);
      vehicleApi.setBrake(0, 1);
      vehicleApi.setBrake(0, 2);
      vehicleApi.setBrake(0, 3);
      vehicleApi.applyEngineForce(0, 0);
      vehicleApi.applyEngineForce(0, 1);
      vehicleApi.applyEngineForce(0, 2);
      vehicleApi.applyEngineForce(0, 3);
    }

    // --- Steer (speed-sensitive: less angle at high speed) ---
    const steerAngle = MAX_STEER - (MAX_STEER - MIN_STEER) * Math.min(Math.abs(fSpeed) / STEER_SPEED_MAX, 1);
    if (left) {
      vehicleApi.setSteeringValue(steerAngle, 2);
      vehicleApi.setSteeringValue(steerAngle, 3);
    } else if (right) {
      vehicleApi.setSteeringValue(-steerAngle, 2);
      vehicleApi.setSteeringValue(-steerAngle, 3);
    } else {
      vehicleApi.setSteeringValue(0, 0);
      vehicleApi.setSteeringValue(0, 1);
      vehicleApi.setSteeringValue(0, 2);
      vehicleApi.setSteeringValue(0, 3);
    }

    // --- Reset ---
    if (reset) {
      chassisApi.position.set(0, 1, 0);
      chassisApi.velocity.set(0, 0, 0);
      chassisApi.angularVelocity.set(0, 0, 0);
      chassisApi.rotation.set(0, 0, 0);
    }
  });

  return { controls, debugSpeed };
};

