export const SINGLET = {
  armhole: {
    centreX: 0.186,
    centreY: 1.43,
    radiusX: 0.075,
    radiusY: 0.152,
    racerBackShiftM: 0.026,
    backZ: -0.03,
    blendM: 0.11,
  },
  neck: {
    centreY: 1.53,
    frontRadiusX: 0.077,
    backRadiusX: 0.092,
    frontRadiusY: 0.175,
    backRadiusY: 0.108,
    blendM: 0.15,
  },
  trimM: 0.009,
  panel: { halfAngleRad: 0.3, centreZ: -0.01 },
} as const;

export const SHORTS = {
  hemAlongM: 0.222,
  splitM: 0.062,
  splitHalfRad: 0.5,
  waistbandM: 0.032,
  pipingM: 0.006,
  maxLimbShare: 0.5,
  topLimitM: 1.2,
} as const;

export const SOCKS = { topAboveAnkleM: 0.05, cuffM: 0.013 } as const;

export const CAP = {
  frontAboveEyeM: 0.05,
  sideAboveEyeM: 0.034,
  backAboveHeadM: 0.084,
  sideAzimuthRad: 1.7,
} as const;

export const HAIR = {
  sideburnAzimuthRad: [1.32, 1.62],
  earAzimuthRad: [1.62, 2.1],
  napeAzimuthRad: 2.55,
  sideburnAboveEyeM: -0.012,
  overEarAboveEyeM: 0.028,
  napeAboveHeadM: 0.03,
  earRadiusM: 0.082,
  earBand: [1.565, 1.668],
} as const;

export const WAIST = { transitionM: 0.08 } as const;
