export const HEIGHT_M = 1.77;
export const MASS_KG = 63;
export const THIGH_M = 0.4537;
export const SHANK_M = 0.4394;
export const LEG_CHECK_M = 0.89;
export const ANKLE_HEIGHT_M = 0.08;
export const HIP_HEIGHT_M = THIGH_M + SHANK_M + ANKLE_HEIGHT_M;
export const HIP_HALF_WIDTH_M = 0.0868;
export const SHOULDER_HALF_WIDTH_M = 0.1845;
export const NECK_ABOVE_PELVIS_M = 0.55;
export const SHOULDER_BELOW_NECK_M = 0.05;
export const HEAD_CENTRE_ABOVE_NECK_M = 0.14;
export const HEAD_TOP_ABOVE_CENTRE_M = 0.12;
export const UPPER_ARM_M = 0.2625;
export const FOREARM_M = 0.275;
export const FOOT_HEEL_BEHIND_ANKLE_M = 0.065;
export const FOOT_BALL_AHEAD_OF_ANKLE_M = 0.13;
export const FOOT_TOE_AHEAD_OF_ANKLE_M = 0.2;
export const PELVIS_TILT_DEG = 10;
export const GRAVITY_MS2 = 9.81;

export const BODY_TARGET_CM = {
  stature: 177,
  sitting: 88,
  chest: 90.5,
  waist: 75.7,
  hip: 89.1,
  midThigh: 50.7,
  calf: 34.3,
  upperArm: 26.4,
  forearm: 25.2,
  biacromial: 41.7,
  biiliocristal: 27.5,
  foot: 26.7,
} as const;
