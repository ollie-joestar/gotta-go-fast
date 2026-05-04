// options.ts — single source of truth for all vehicle tuning

export const CAR_OPTIONS = {
  // --- Chassis ---
  mass: 1000,
  size: [2.4, 1.3, 6] as [number, number, number],
  wheelRadius: 0.43,

  // --- Engine / Drivetrain ---
  force: 8001,
  differential: 0.5,       // fraction of force sent to rear (0 = FWD, 1 = RWD, 0.5 = AWD)
  revForceRatio: 0.5,      // reverse force as a fraction of total force
  brakeForce: 100,
  coastBrakeForce: 20,     // passive deceleration applied when no throttle/brake input
  frontBrakeBias: 0.05,    // front brake fraction when turning (reduces understeer)
  reverseThreshold: 0.4,   // forward speed (m/s) below which braking switches to reverse

  // --- Steering ---
  maxSteer: 0.6,          // max steering angle in radians (~35 degrees)
  minSteer: 0.05,
  steerSpeedMax: 40,       // speed (m/s) at which steering is clamped to minSteer
  steerStep: 0.05,        // how much to change steer angle per frame of input

  // --- Suspension ---
  suspensionStiffness: 45,
  suspensionRestLength: 0.2,
  dampingRelaxation: 2.7,
  dampingCompression: 4.4,
  maxSuspensionForce: 100000,
  rollInfluence: 0.01,
  maxSuspensionTravel: 0.2,

  // --- Wheels ---
  rearFrictionSlip: 10.0,
  frontFrictionSlip: 10.0,
  customSlidingRotationalSpeed: -30,
  useCustomSlidingRotationalSpeed: false,
  wheelCylinderThickness: 0.42,
  wheelCylinderSegments: 16,
  wheelMass: 100,

  // --- Wheel geometry factors (multiplied against chassis dimensions) ---
  wheelHeightFactor: 0.265,
  wheelWidthFactor: 0.50,
  wheelFrontOffsetFactor: 0.68,
  wheelRearOffsetFactor: 0.73,
  frontWheelWidthMultiplier: 1.05,

  // --- Camera ---
  cameraDistance: 10,
  cameraHeight: 5,
  cameraLookAhead: 4,      // how far ahead of the car the camera looks (m)
  cameraLerpFactor: 0.16,  // smoothing: lower = more lag, higher = snappier
  cameraFovBase: 40,
  cameraFovMax: 65,
  cameraFovSpeedMax: 50,   // speed (m/s) at which FOV reaches max
  cameraFovLerp: 0.24,     // FOV transition smoothness

  // --- Visual smoothing ---
  // Fast lerp applied to car body and wheel visuals each frame.
  // Removes 1-frame timing jitter between physics worker updates and render without
  // adding any perceptible visual lag (0.85 = ~96% there within 2 frames at 60fps).
  visualLerpFactor: 0.30,
} as const

// Derived drivetrain values — computed once from CAR_OPTIONS
export const FFORCE = CAR_OPTIONS.force * (1 - CAR_OPTIONS.differential)
export const RFORCE = CAR_OPTIONS.force * CAR_OPTIONS.differential
export const REV_FORCE = -CAR_OPTIONS.force * CAR_OPTIONS.revForceRatio
