type Triple = readonly [number, number, number];

export const MM = 0.001;

export const SCENE_LIMITS = {
  cameraNear: 0.005,
  cameraFar: 60,
  cameraMinDistance: 0.15,
  cameraMaxDistance: 3,
  floorMargin: 0.02,
} as const;

export const SEE_THROUGH_DIM = { opacity: 0.35 } as const;

export const LIGHT_RIG = {
  distance: 40,
  key: { color: '#fff1e0', intensity: 2.6, direction: [0.45, 0.85, 0.6] as Triple },
  fill: { color: '#c4d8c4', intensity: 0.8, direction: [-0.75, 0.25, 0.4] as Triple },
  rim: { color: '#ffd9b0', intensity: 1.5, direction: [-0.3, 0.6, -0.85] as Triple },
} as const;

export const SPARK_LIGHT = {
  color: '#ffb36b',
  intensity: 0.004,
  burnShare: 0.35,
  distance: 0.12,
  decay: 2,
} as const;

export const EASE_SECONDS = 0.35;

export const CUT_PLANE_Z = 0;

export const CYLINDER = {
  bore: 0.025,
  wall: 0.0055,
  base: 0.122,
  headInner: 0.2165,
  headTop: 0.235,
  finOuter: 0.044,
  finThickness: 0.0018,
  finFrom: 0.173,
  finTo: 0.233,
  finCount: 9,
  exhaustHalfDeg: 34,
  transferHalfDeg: 28,
  intakeHalfDeg: 30,
  rimWidth: 0.0012,
  rimDepth: 0.0007,
} as const;

export const PORT_ANGLES = {
  exhaust: [0],
  transfer: [90, 270],
  intake: [180],
} as const;

export const DUCTS = {
  exhaustReach: 0.052,
  exhaustHalfWidth: 0.013,
  wall: 0.0018,
  transferOuter: 0.036,
  transferHalfWidth: 0.012,
  transferBottom: 0.128,
} as const;

export const PISTON = {
  radius: 0.0247,
  crownDome: 0.0015,
  ringHeight: 0.0012,
  ringGaps: [0.004, 0.0075],
  wristPin: 0.0055,
} as const;

export const ROD = { bigEnd: 0.0105, smallEnd: 0.0065, shank: 0.0042, thickness: 0.006 } as const;

export const CRANK = {
  shaft: 0.0075,
  pin: 0.0055,
  web: 0.029,
  webThickness: 0.0065,
  webGap: 0.0035,
  shaftFrom: -0.086,
  shaftTo: 0.076,
} as const;

export const CRANKCASE = { wall: 0.004, radius: 0.02, opening: 0.026 } as const;

export const PLUG = {
  tip: 0.0013,
  body: 0.0045,
  hex: 0.0075,
  hexTop: 0.241,
  bootTop: 0.266,
} as const;

export const SPARK = { size: 0.03, burnSize: 0.05 } as const;

export const CARB = {
  boreHalf: 0.011,
  boreY: 0.157,
  plateX: -0.068,
  chokeX: -0.102,
  plateClosedDeg: 78,
  runnerFrom: -0.06,
  runnerTo: -0.0265,
  runnerHalfHeight: 0.0085,
  runnerHalfWidth: 0.0105,
} as const;

export const TRIGGER = { pivot: [-0.148, 0.151] as const, pullDeg: 16 } as const;

export const CLUTCH = {
  hub: 0.0125,
  shoeInner: 0.013,
  shoeOuter: 0.0255,
  shoeTravel: 0.0058,
  shoeSpanDeg: 104,
  shoeCount: 3,
  shoeZ: [0.059, 0.071] as const,
  liningDepth: 0.0012,
  drumInner: 0.032,
  drumZ: [0.058, 0.078] as const,
  faceZ: [0.078, 0.0805] as const,
  sprocketTip: 0.0258,
  sprocketRoot: 0.0168,
  sprocketHalf: 0.0021,
  bandInner: 0.0356,
  bandOuter: 0.0369,
  bandZ: [0.0605, 0.0755] as const,
  bandGapDeg: [-115, -60] as const,
  bandGrip: 0.985,
} as const;

export const BAR = {
  rail: 0.003,
  rearX: 0.042,
  noseLength: 0.034,
  noseSprocket: 0.0177,
  noseToothDepth: 0.003,
  noseTeeth: 11,
  rearRound: 0.006,
} as const;

export const CHAIN_LINKS = {
  sideOffset: 0.0012,
  driveThickness: 0.0013,
  sideThickness: 0.001,
  rivetRadius: 0.0014,
  rivetLength: 0.0046,
} as const;

export const OIL = { from: 0.03, to: 0.15, drops: 14, lift: 0.0055 } as const;

export const CHIPS = {
  max: 120,
  perCutter: 3,
  size: [0.008, 0.0016, 0.006] as Triple,
  speed: 0.9,
  spread: 0.35,
  rise: 0.25,
  gravity: 9.81,
  lifeSeconds: 2.6,
  spinRate: 18,
  maxStepMm: 140,
} as const;

export const KERF = { halfWidth: 0.004, ringRadii: [0.04, 0.075, 0.105] as const } as const;

export const ZONE = { lift: 0.0046, opacity: 0.5 } as const;

export const GUARD = {
  halfWidth: 0.06,
  plateBottom: 0.025,
  armHalfWidth: 0.006,
  thickness: 0.006,
} as const;

export const FLOOR_Y = 0;
export const BOUNDS_REGION = 'saw';

export const FOREST = {
  haze: '#4b5649',
  hazeNear: 2.8,
  hazeFar: 17,
  closeHaze: '#262c27',
  closeFrom: 1.5,
  closeTo: 0.6,
  closeShare: 0.85,
  skyTop: '#1d2620',
  skyHorizon: '#56614f',
  skyGap: '#a3b18f',
  skyRadius: 45,
  groundRadius: 40,
  groundTile: 2.2,
  groundTexture: 256,
  litter: ['#3f3224', '#4a3a29', '#54422d', '#3a3022', '#46412b', '#5a4630'],
  groundBase: '#30271c',
  litterAlpha: 0.45,
  leafCount: 240,
  leafSize: [0.05, 0.032] as const,
  leafReach: [0.12, 1.5] as const,
  leafCentre: [0.1, 0.12] as const,
  bushCount: 150,
  bushReach: [3.2, 14] as const,
  bushSize: [0.45, 1.3] as const,
  fernCount: 40,
  fernReach: [1.8, 3.2] as const,
  fernSideX: 1.4,
  fernSize: [0.25, 0.55] as const,
  bushCards: 3,
  bushTexture: 256,
  bushBlobs: 260,
  bushGreens: ['#3f4a2a', '#4d5a30', '#36402a', '#5a6334', '#46502e'],
  bushTint: ['#c8d0b8', '#b4bea2', '#d6d8c0', '#a8b296'],
  bushAlphaTest: 0.5,
  stumps: [
    [-1.6, -3.4, 0.24, 0.32],
    [2.3, -3.6, 0.2, 0.24],
    [-3.4, -1.6, 0.18, 0.4],
  ] as const,
  stumpTop: '#5e4c37',
  shadowOpacity: 0.85,
  shadowScale: 1.35,
  shadowLift: 0.002,
  seed: 97,
} as const;
