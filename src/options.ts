// options.ts — single source of truth for all vehicle tuning

export const CAR_OPTIONS = {
  // --- Chassis ---
  mass: 1000,
  size: [2.4, 1.3, 6] as [number, number, number],
  wheelRadius: 0.43,

  // --- Engine / Drivetrain ---
  force: 9000,
  differential: 0.5,       // fraction of force sent to rear (0 = FWD, 1 = RWD, 0.5 = AWD)
  revForceRatio: 0.5,      // reverse force as a fraction of total force
  brakeForce: 85,
  frontBrakeBias: 0.15,    // front brake fraction when turning (reduces understeer)
  reverseThreshold: 0.4,   // forward speed (m/s) below which braking switches to reverse

  // --- Steering ---
  maxSteer: 0.5,
  minSteer: 0.15,
  steerSpeedMax: 35,       // speed (m/s) at which steering is clamped to minSteer

  // --- Suspension ---
  suspensionStiffness: 45,
  suspensionRestLength: 0.2,
  dampingRelaxation: 2.7,
  dampingCompression: 4.4,
  maxSuspensionForce: 100000,
  rollInfluence: 0.01,
  maxSuspensionTravel: 0.2,

  // --- Wheels ---
  rearFrictionSlip: 5.5,
  frontFrictionSlip: 6.5,
  customSlidingRotationalSpeed: -30,
  useCustomSlidingRotationalSpeed: false,
  wheelCylinderThickness: 0.37,
  wheelCylinderSegments: 16,
  wheelMass: 1,

  // --- Wheel geometry factors (multiplied against chassis dimensions) ---
  wheelHeightFactor: 0.265,
  wheelWidthFactor: 0.45,
  wheelFrontOffsetFactor: 0.68,
  wheelRearOffsetFactor: 0.73,
  frontWheelWidthMultiplier: 1.05,

  // --- Camera ---
  cameraDistance: 10,
  cameraHeight: 5,
  cameraLookAhead: 4,      // how far ahead of the car the camera looks (m)
  cameraLerpFactor: 0.06,  // smoothing: lower = more lag, higher = snappier
  cameraFovBase: 40,
  cameraFovMax: 65,
  cameraFovSpeedMax: 50,   // speed (m/s) at which FOV reaches max
  cameraFovLerp: 0.04,     // FOV transition smoothness
} as const

// Derived drivetrain values — computed once from CAR_OPTIONS
export const FFORCE = CAR_OPTIONS.force * (1 - CAR_OPTIONS.differential)
export const RFORCE = CAR_OPTIONS.force * CAR_OPTIONS.differential
export const REV_FORCE = -CAR_OPTIONS.force * CAR_OPTIONS.revForceRatio
