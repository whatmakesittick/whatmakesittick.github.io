import type { Point } from '../ids';
import { EVENT_CENTRE, HELIX_AXIS, MIXING_FLOOR_Y, mixtureLevelCm } from '../model';

const HALF = 0.5;

export const SCENE_LIMITS = {
  cameraNear: 0.1,
  cameraFar: 2000,
  cameraMinDistance: 8,
  cameraMaxDistance: 300,
  maxPolarAngle: Math.PI * 0.85,
  fogNear: 220,
  fogFar: 900,
} as const;

export const LIGHT_RIG = {
  distance: 120,
  key: { color: '#fff1e2', intensity: 2.5, direction: [-0.62, 0.82, 0.48] },
  fill: { color: '#9fbcff', intensity: 0.42, direction: [0.75, 0.25, 0.62] },
  rim: { color: '#8fb6ff', intensity: 2.1, direction: [0.35, 0.55, -1] },
} as const;

export const DETAIL = {
  lathe: 64,
  profile: 6,
  knob: 32,
  atom: [18, 12],
  bond: 10,
  ring: [6, 8],
  tube: 12,
  streamSegments: 40,
} as const;

export const CROSSFADE = {
  seconds: 0.6,
  swapAt: 0.5,
  beakerZoom: 2.6,
  moleculeStart: 0.32,
  veilPeak: 0.94,
  focus: [0, MIXING_FLOOR_Y + mixtureLevelCm(1) * HALF, 0] as Point,
} as const;

export const BENCH = {
  top: '#3b2e25',
  wall: '#3c4756',
  grout: '#1a2029',
  halfWidth: 90,
  front: 40,
  back: -42,
  thickness: 3,
  wallHeight: 90,
  wallTile: 7.5,
  poolCentre: [-1, 0, 1] as Point,
  poolRadius: 34,
  shadowLift: 0.02,
} as const;

export const HAZE = {
  radius: 600,
  top: '#16305a',
  middle: '#0b1a36',
  bottom: '#050b18',
  ray: '#2c5a8f',
} as const;

export const GLASS = {
  tint: '#e9f3f8',
  opacity: 0.08,
  fresnelAlpha: 0.62,
  rim: '#d6ecff',
  rimStrength: 0.55,
  streak: 0.32,
  innerOpacity: 0.05,
} as const;

export const BEAKER_LOOK = {
  rimBead: 0.11,
  baseFillet: 0.45,
  spoutReach: 0.55,
  spoutDepth: 1.1,
  spoutRise: 0.18,
  spoutSharpness: 22,
  mixingSpoutDeg: 135,
  pourSpoutDeg: -90,
  liquidInset: 0.02,
  vortexDip: 0.07,
  vortexRings: 10,
  printArcDeg: 58,
  printCentreDeg: 28,
  printLift: 0.012,
} as const;

export const LIQUID_LOOK = {
  darkOpacity: 0.97,
  thinTint: '#24318a',
  edgeMix: 0.32,
  deepen: 0.55,
  frontWidth: 0.3,
  frontRadial: 0.35,
  shadeTint: '#24318a',
  shadeOpacity: 0.8,
  shadeSpread: 1.65,
  shadeOffset: [0.6, 0, -0.4] as Point,
  schlierenSeconds: 2.5,
  schlierenStrength: 0.22,
} as const;

export const STIRRER_LOOK = {
  bodyInset: 0.25,
  bodyCorner: 1.6,
  plateInset: 0.7,
  plateThickness: 0.35,
  plateCorner: 1.2,
  footHeight: 0.25,
  knobRadius: 0.95,
  knobDepth: 0.8,
  knobY: 1.7,
  knobX: 4.6,
  ledRadius: 0.16,
  trailDeg: 75,
  trailOpacity: 0.32,
} as const;

export const POUR_LOOK = {
  arcLift: 6,
  tiltStartShare: 0.25,
  flowStart: 0.38,
  extraTiltDeg: 12,
  jetSpeedCmS: 9,
  gravityCmS2: 981,
  jetRadius: 0.42,
  minJetRadius: 0.08,
  streakSpeed: 40,
  splashRadius: 1.8,
  bubbles: 36,
  emptyVolume: 0.5,
  settleDelay: 0.2,
  settleEnd: 1.5,
} as const;

export const THERMOMETER_LOOK = {
  tubeRadius: 0.3,
  bulbRadius: 0.36,
  capillaryRadius: 0.07,
  scaleStart: 0.66,
  scaleEnd: 0.94,
  stripWidth: 0.42,
  alcohol: '#d6412f',
} as const;

export const STOPWATCH_LOOK = {
  caseRadius: 2.75,
  caseDepth: 1.5,
  bezel: 0.28,
  stemLength: 0.35,
  crownRadius: 0.42,
  crownHeight: 0.4,
  handLength: 2.25,
  handTail: 0.6,
  handWidth: 0.07,
  subdialOffset: 1.05,
  subdialHand: 0.55,
  dialTexture: 512,
} as const;

export const ATOM_LOOK = {
  bond: '#b9c1cc',
  roughness: 0.3,
  hydrogenHalo: 3.4,
  flashSize: 9,
  sparkleSize: 4.5,
  spotSize: 22,
  spotAlpha: 0.22,
  spot: '#3d6fb8',
  flash: '#f3dcff',
} as const;

export const SHAPE_ANGLES = {
  firstLeg: Math.PI / 2,
  sulfitePyramidDeg: 106,
  hydroxylDeg: 107,
} as const;

export const CROWD = {
  seed: 1886,
  drift: 1.7,
  speedMin: 0.32,
  speedMax: 0.85,
  spinMin: 0.25,
  spinMax: 0.8,
  margin: 3,
  eventClear: 2,
  eventFront: 16,
  frontClear: { x: [-12, 20], y: [-17, 17], z: [3, 16] },
  helixClear: 9,
  growFloor: 0.2,
} as const;

export const LANDOLT_SPOT: Point = [EVENT_CENTRE[0] + 3.6, EVENT_CENTRE[1] - 0.8, EVENT_CENTRE[2]];
export const IODINE_SPOT: Point = [
  EVENT_CENTRE[0] - 5,
  EVENT_CENTRE[1] + 2.6,
  EVENT_CENTRE[2] - 1.5,
];

export const EVENT_LOOK = {
  bisulfiteDistance: 4.6,
  clusterTilt: [0.3, 0.6, 0.75] as Point,
  hopArc: 0.9,
  fadeIn: 0.12,
  fadeOut: 0.14,
  meetFrom: 7.5,
  meetTo: 3.4,
  partDistance: 6,
  grabFrom: 7,
  protonReach: 4.5,
} as const;

export const HELIX_LOOK = {
  ringCentreRadius: 4.4,
  ringRadius: 1.5,
  ringTube: 0.24,
  knobRadius: 0.33,
  ringTilt: 0.5,
  linkRadius: 0.24,
  bridgeRadius: 0.44,
  ribbonWidth: 3,
  ribbonSamplesPerTurn: 48,
  glow: '#6a5ee8',
  glowCore: '#b7a6ff',
  glowRadius: 2.1,
  glowStrength: 0.22,
  feeders: 4,
  feederWindow: 0.42,
  mouthGap: 3,
  centre: [HELIX_AXIS.x, 0, HELIX_AXIS.z] as Point,
} as const;

export const THEME_GLOW = {
  proton: '#cfe6ff',
  flash: '#f1dcff',
  chain: '#8f7cff',
} as const;

export const WATER_LOOK = {
  colour: '#9cc7ff',
  alpha: 0.32,
  size: 0.9,
  drift: 1.2,
} as const;

export const VEIL = {
  clear: '#2a5d7c',
  deep: '#0d1440',
  navy: '#0b1a36',
} as const;

export const ACCENT = {
  led: '#6dff95',
  hand: '#d9342b',
  print: '#f4f6f8',
} as const;
