// Wheels.tsx
import { useCompoundBody } from "@react-three/cannon";
import { useRef } from "react";
import type { RefObject } from "react";
import { Object3D } from "three";
import { CAR_OPTIONS } from "./options";

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UseWheelsReturn = [RefObject<Object3D | null>[], WheelInfo[], any[]];

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
    suspensionStiffness: CAR_OPTIONS.suspensionStiffness,
    suspensionRestLength: CAR_OPTIONS.suspensionRestLength,
    frictionSlip: 10,
    dampingRelaxation: CAR_OPTIONS.dampingRelaxation,
    dampingCompression: CAR_OPTIONS.dampingCompression,
    maxSuspensionForce: CAR_OPTIONS.maxSuspensionForce,
    rollInfluence: CAR_OPTIONS.rollInfluence,
    maxSuspensionTravel: CAR_OPTIONS.maxSuspensionTravel,
    customSlidingRotationalSpeed: CAR_OPTIONS.customSlidingRotationalSpeed,
    useCustomSlidingRotationalSpeed: CAR_OPTIONS.useCustomSlidingRotationalSpeed,
  };

  const wheelHeightOffset = -height * CAR_OPTIONS.wheelHeightFactor;
  const wheelWidthOffset = width * CAR_OPTIONS.wheelWidthFactor;
  const wheelFOffset = front * CAR_OPTIONS.wheelFrontOffsetFactor;
  const wheelROffset = -front * CAR_OPTIONS.wheelRearOffsetFactor;

  const wheelInfos: WheelInfo[] = [
    // back wheels
    {
      ...wheelInfo,
      chassisConnectionPointLocal: [-wheelWidthOffset, wheelHeightOffset, wheelFOffset],
      frictionSlip: CAR_OPTIONS.rearFrictionSlip,
    },
    {
      ...wheelInfo,
      chassisConnectionPointLocal: [wheelWidthOffset, wheelHeightOffset, wheelFOffset],
      frictionSlip: CAR_OPTIONS.rearFrictionSlip,
    },
    // front wheels
    {
      ...wheelInfo,
      chassisConnectionPointLocal: [-wheelWidthOffset * CAR_OPTIONS.frontWheelWidthMultiplier, wheelHeightOffset, wheelROffset],
      frictionSlip: CAR_OPTIONS.frontFrictionSlip,
    },
    {
      ...wheelInfo,
      chassisConnectionPointLocal: [wheelWidthOffset * CAR_OPTIONS.frontWheelWidthMultiplier, wheelHeightOffset, wheelROffset],
      frictionSlip: CAR_OPTIONS.frontFrictionSlip,
    },
  ];

  const propsFunc = () => ({
    collisionFilterGroup: 0,
    mass: CAR_OPTIONS.wheelMass,
    shapes: [
      {
        args: [wheelInfo.radius, wheelInfo.radius, CAR_OPTIONS.wheelCylinderThickness, CAR_OPTIONS.wheelCylinderSegments] as [number, number, number, number],
        rotation: [0, 0, -Math.PI / 2] as [number, number, number],
        type: "Cylinder" as const,
      },
    ],
    type: "Kinematic" as const,
  });

  const [, w0Api] = useCompoundBody(propsFunc, wheel0);
  const [, w1Api] = useCompoundBody(propsFunc, wheel1);
  const [, w2Api] = useCompoundBody(propsFunc, wheel2);
  const [, w3Api] = useCompoundBody(propsFunc, wheel3);

  return [[wheel0, wheel1, wheel2, wheel3], wheelInfos, [w0Api, w1Api, w2Api, w3Api]];
};
