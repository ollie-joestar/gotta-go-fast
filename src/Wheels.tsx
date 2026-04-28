// Wheels.tsx
import { useCompoundBody } from "@react-three/cannon";
import { useRef } from "react";
import type { RefObject } from "react";
import { Object3D } from "three";

interface WheelInfo {
  radius: number;
  directionLocal: [number, number, number];
  axleLocal: [number, number, number];
  suspensionStiffness: number;
  suspensionRestLength: number;
  frictionSlip: number;
  dampingRelaxation: number;
  dampingCompression: number;
  maxSuspensionForce: number;
  rollInfluence: number;
  maxSuspensionTravel: number;
  customSlidingRotationalSpeed: number;
  useCustomSlidingRotationalSpeed: boolean;
  chassisConnectionPointLocal?: [number, number, number];
}

type UseWheelsReturn = [RefObject<Object3D | null>[], WheelInfo[]];

export const useWheels = (
  width: number,
  height: number,
  front: number,
  radius: number
): UseWheelsReturn => {
  const wheel0 = useRef<Object3D | null>(null);
  const wheel1 = useRef<Object3D | null>(null);
  const wheel2 = useRef<Object3D | null>(null);
  const wheel3 = useRef<Object3D | null>(null);

  const wheelInfo: WheelInfo = {
    radius,
    directionLocal: [0, -1, 0],
    axleLocal: [1, 0, 0],
    suspensionStiffness: 55,
    suspensionRestLength: 0.1,
    frictionSlip: 0,
    dampingRelaxation: 1.7,
    dampingCompression: 4.4,
    maxSuspensionForce: 100000,
    rollInfluence: 0.01,
    maxSuspensionTravel: 0.1,
    customSlidingRotationalSpeed: -30,
    useCustomSlidingRotationalSpeed: false,
  };

  const wheelHeightOffset = -height * 0.265;
  const wheelWidthOffset = width * 0.45;
  const wheelFOffset = front * 0.68;
  const wheelROffset = -front * 0.73;

  const wheelInfos: WheelInfo[] = [
    // back wheels
    {
      ...wheelInfo,
      chassisConnectionPointLocal: [-wheelWidthOffset, wheelHeightOffset, wheelFOffset],
      frictionSlip: 4.5,
    },
    {
      ...wheelInfo,
      chassisConnectionPointLocal: [wheelWidthOffset, wheelHeightOffset, wheelFOffset],
      frictionSlip: 4.5,
    },
    // front wheels
    {
      ...wheelInfo,
      chassisConnectionPointLocal: [-wheelWidthOffset * 1.05, wheelHeightOffset, wheelROffset],
      frictionSlip: 5.5,
    },
    {
      ...wheelInfo,
      chassisConnectionPointLocal: [wheelWidthOffset * 1.05, wheelHeightOffset, wheelROffset],
      frictionSlip: 5.5,
    },
  ];

  const propsFunc = () => ({
    collisionFilterGroup: 0,
    mass: 1,
    shapes: [
      {
        args: [wheelInfo.radius, wheelInfo.radius, 0.37, 16] as [number, number, number, number],
        rotation: [0, 0, -Math.PI / 2] as [number, number, number],
        type: "Cylinder" as const,
      },
    ],
    type: "Kinematic" as const,
  });

  useCompoundBody(propsFunc, wheel0);
  useCompoundBody(propsFunc, wheel1);
  useCompoundBody(propsFunc, wheel2);
  useCompoundBody(propsFunc, wheel3);

  return [[wheel0, wheel1, wheel2, wheel3], wheelInfos];
};
