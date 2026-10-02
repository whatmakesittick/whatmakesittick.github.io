import { toRadians } from '@core/math';
import type { PartId } from '../ids';
import {
  CROSSROADS,
  DRONE,
  DRONE_LAYOUT,
  PAD,
  ROAD,
  SCENE_BOUNDS,
  TREELINE,
} from '../model/layout';
import { droneUnits } from '../model/scale';

type Triple = readonly [number, number, number];
type Extent = readonly [number, number];

export const PLATE = {
  thickness: 0.0025,
  x: [-0.15, 0.12] as Extent,
  halfWidth: DRONE.plateWidth / 2,
  corner: 0.01,
  gap: DRONE.plateGap,
  holes: [
    { x: -0.11, z: 0, radius: 0.006 },
    { x: 0.07, z: 0, radius: 0.005 },
  ],
  weave: { size: 128, tows: 8, towMetres: 0.0032, contrast: 0.42, grain: 0.08, seed: 9 },
} as const;

export const ARMS = {
  width: DRONE.armWidth,
  thickness: DRONE.armThickness,
  roots: {
    motorFrontRight: [0.05, 0.02] as Extent,
    motorFrontLeft: [0.05, -0.02] as Extent,
    motorRearRight: [-0.08, 0.02] as Extent,
    motorRearLeft: [-0.08, -0.02] as Extent,
  },
  overhang: 0.02,
  foot: { radius: 0.007, tip: 0.0055, height: 0.018, inboard: 0.03, segments: 10 },
} as const;

export const PAD_TOP_METRES = 0.005;

export const BODY_DROP = DRONE.restHeight - PLATE.thickness - ARMS.foot.height - PAD_TOP_METRES;

export const STANDOFFS = {
  radius: 0.0028,
  segments: 8,
  spots: [
    [0.09, 0.018],
    [0.09, -0.018],
    [-0.03, 0.019],
    [-0.03, -0.019],
    [-0.125, 0.018],
    [-0.125, -0.018],
  ] as readonly Extent[],
} as const;

export const MOTOR = {
  radius: DRONE.motorDiameter / 2,
  base: ARMS.thickness,
  heights: { foot: 0.004, stator: 0.003, bell: DRONE.motorHeight - 0.007, dome: 0.002 },
  statorRadius: 0.0165,
  ring: { inner: 0.012, thickness: 0.0012 },
  shaft: { radius: 0.0035, height: 0.006 },
  segments: 28,
  slots: { size: 64, count: 9, width: 0.45, from: 0.15, to: 0.72 },
  mount: { radius: 0.0165, thickness: 0.002 },
} as const;

export const PROP = {
  radius: DRONE.propDiameter / 2,
  blades: DRONE.blades,
  hub: { radius: 0.009, height: 0.005, segments: 16 },
  pitchMetres: 0.094,
  incidence: toRadians(3),
  pitchAxisShare: 0.3,
  samples: 10,
  stations: [
    { radius: 0.01, chord: 0.012, thickness: 0.2 },
    { radius: 0.022, chord: 0.02, thickness: 0.12 },
    { radius: 0.04, chord: 0.023, thickness: 0.08 },
    { radius: 0.06, chord: 0.021, thickness: 0.06 },
    { radius: 0.08, chord: 0.016, thickness: 0.05 },
    { radius: 0.092, chord: 0.009, thickness: 0.045 },
    { radius: DRONE.propDiameter / 2, chord: 0.003, thickness: 0.04 },
  ],
  camber: 0.035,
  spinRate: 26,
  blurFrom: 0.6,
  blurOpacity: 0.36,
  disc: { size: 128, hub: 0.1, tipRing: 0.95, ringWidth: 0.04, ringBoost: 0.9, edgeSoftness: 0.05 },
  discSegments: 40,
  lift: 0.0005,
} as const;

export const PROP_BLUR_FROM = PROP.blurFrom;

export const BATTERY = {
  centre: DRONE_LAYOUT.battery,
  size: [DRONE.batteryLength, DRONE.batteryHeight, DRONE.batteryWidth] as Triple,
  corner: 0.005,
  strap: { x: -0.02, width: 0.02, thickness: 0.002, buckle: [0.012, 0.004, 0.014] as Triple },
  lead: { radius: 0.0015, offsets: [0.004, -0.004] as Extent, segments: 6 },
  plug: { at: [0.07, 0.04, 0.012] as Triple, size: [0.016, 0.008, 0.012] as Triple },
  balance: { at: [-0.082, 0.062, 0.01] as Triple, size: [0.012, 0.005, 0.006] as Triple },
} as const;

export const STACK = {
  centre: DRONE_LAYOUT.stack,
  board: { size: 0.036, thickness: 0.0015, levels: [-0.003, 0.009] as Extent },
  standoff: { radius: 0.0015, inset: 0.015, segments: 6 },
  capacitor: { radius: 0.004, length: 0.012, at: [-0.03, 0.004, 0] as Triple },
  chips: [
    { at: [0.004, 0, 0.004] as Triple, size: [0.008, 0.0015, 0.008] as Triple },
    { at: [-0.006, 0, -0.008] as Triple, size: [0.005, 0.001, 0.005] as Triple },
    { at: [0.009, 0, -0.009] as Triple, size: [0.004, 0.001, 0.004] as Triple },
  ],
} as const;

export const CAMERA_MODULE = {
  centre: DRONE_LAYOUT.camera,
  tilt: DRONE.cameraTilt,
  cheek: { size: [0.014, 0.03, 0.003] as Triple, z: 0.0125, y: 0.019 },
  analogue: { body: DRONE.cameraSize, lensRadius: 0.0065, barrel: 0.009 },
  digital: { body: 0.022, lensRadius: 0.0085, barrel: 0.011 },
  ring: 0.0015,
  segments: 20,
} as const;

export const VIDEO_ANTENNA = {
  centre: DRONE_LAYOUT.videoAntenna,
  mount: { size: [0.012, 0.008, 0.012] as Triple },
  analogue: { stub: 0.0025, length: 0.03, cap: 0.009, squash: 0.55, segments: 14 },
  digital: { patch: [0.003, 0.018, 0.024] as Triple, stalk: 0.006, lift: 0.004 },
  top: 0.085,
} as const;

export const RECEIVER_ANTENNAS = {
  bases: DRONE_LAYOUT.receiverAntennas,
  holder: { size: [0.01, 0.012, 0.008] as Triple },
  whip: { radius: 0.001, length: 0.07, direction: [-0.5, 0.6, 0.62] as Triple, segments: 6 },
  tip: { radius: 0.0018, share: 0.35 },
} as const;

export const GPS = {
  centre: DRONE_LAYOUT.gpsModule,
  mast: { radius: 0.002, segments: 8 },
  puck: { radius: 0.0125, height: 0.007, segments: 20 },
  patch: { size: 0.012, thickness: 0.0015 },
} as const;

export const DRONE_BOX = {
  x: [-0.14 - PROP.radius, 0.11 + PROP.radius] as Extent,
  y: [-PLATE.thickness - ARMS.foot.height, 0.095] as Extent,
  z: [-0.13 - PROP.radius, 0.13 + PROP.radius] as Extent,
} as const;

export const SPIN_ARROWS = {
  size: DRONE.propDiameter * 1.05,
  lift: 0.048,
  texture: { size: 128, radius: 44, stroke: 9, sweep: toRadians(265), head: 15, font: 46 },
  brightness: { base: 0.72, gain: 5, min: 0.3 },
} as const;

export const SCALED_LABELS = {
  propellerTop: 0.012,
} as const;

export const SKY = {
  radius: 6000,
  widthSegments: 32,
  heightSegments: 16,
  renderOrder: -10,
  cloud: { scale: 2.4, cover: 0.42, softness: 0.3, lift: 0.08, from: 0.02, to: 0.6 },
  blend: 0.55,
} as const;

export const HAZE = { near: 500, far: 2600 } as const;

export const FIELD = {
  extent: { x: [-260, 700] as Extent, z: [-420, 360] as Extent },
  cell: 6,
  outer: 9000,
  outerSink: 0.08,
  texture: { size: 256, metres: 24, stripes: 4, stripeDepth: 0.1, mottle: 0.18, seed: 17 },
  patches: { scale: 46, from: 0.48, to: 0.68, seed: 23 },
  tufts: { scale: 15, from: 0.55, to: 0.75, seed: 31, share: 0.45 },
  tracks: { scale: 180, from: 0.56, to: 0.62, seed: 29, share: 0.35 },
  bare: { scale: 11, from: 0.7, to: 0.76, seed: 37, share: 0.75 },
  mown: { width: 12, depth: 0.05 },
} as const;

export const ROADS = {
  halfWidth: ROAD.halfWidth,
  lift: 0.03,
  along: { z: CROSSROADS[2], x: [-80, 520] as Extent },
  across: { x: CROSSROADS[0], z: [-300, 200] as Extent },
  texture: {
    size: 64,
    base: 0.84,
    rut: 0.24,
    rutWidth: 0.07,
    rutDepth: 0.24,
    dust: 0.14,
    dustWidth: 0.12,
    wear: 0.12,
    metres: 8,
    seed: 41,
  },
} as const;

export const CROSSING = {
  centre: CROSSROADS,
  anchorLift: 2.5,
  shed: {
    at: [-10, 0, -9] as Triple,
    size: [6, 2.6, 4.5] as Triple,
    roof: { rise: 1.4, overhang: 0.4 },
    heading: toRadians(12),
    door: { width: 1.1, height: 2, depth: 0.05 },
  },
  car: {
    at: [8, 0, 7] as Triple,
    heading: toRadians(-40),
    body: [4.2, 0.6, 1.8] as Triple,
    cabin: [2, 0.55, 1.6] as Triple,
    cabinShift: -0.2,
    clearance: 0.25,
    wheel: { radius: 0.32, width: 0.22, axle: 1.4, segments: 12 },
    sag: toRadians(4),
  },
} as const;

export const TREES = {
  line: TREELINE,
  rows: [
    { z: 0, spacing: 7.5, offset: 0, jitter: 3 },
    { z: -9, spacing: 9, offset: 4, jitter: 4 },
  ],
  seed: 53,
  poplarShare: 0.35,
  conifer: {
    height: [9, 15] as Extent,
    tiers: 3,
    radius: 0.32,
    overlap: 0.42,
    segments: 8,
    trunk: { radius: 0.25, share: 0.12 },
  },
  poplar: {
    height: [12, 19] as Extent,
    trunk: { radius: [0.14, 0.32] as Extent, segments: 7 },
    branches: { count: 7, from: 0.3, length: 0.3, spread: toRadians(18), radius: 0.06 },
  },
} as const;

export const SHRUBS = {
  count: 900,
  size: 1.6,
  lift: 0.45,
  seed: 61,
  area: { x: [-200, 620] as Extent, z: [-380, 320] as Extent },
  keepOut: { station: 14, road: 4 },
  colours: ['#4c5a32', '#5d6639', '#6a6a3e', '#3f4a2b'],
  opacity: 0.85,
} as const;

export const STATION_SET = {
  dugout: {
    corner: [-4, 0, -3] as Triple,
    alongX: 5.5,
    alongZ: 5.5,
    log: { radius: 0.13, rows: 4, segments: 10, jitter: 0.05 },
    sandbags: { perMetre: 1.6, size: [0.5, 0.22, 0.34] as Triple, segments: 8 },
  },
  tripod: {
    at: [-1.4, 0, 1.4] as Triple,
    apex: 1.6,
    spread: 0.7,
    legRadius: 0.018,
    mast: { height: 0.3, radius: 0.015 },
    patch: { size: [0.04, 0.22, 0.22] as Triple, tilt: toRadians(8) },
    segments: 8,
  },
  hardCase: {
    at: [-1.3, 0, -0.9] as Triple,
    size: [0.62, 0.26, 0.46] as Triple,
    lid: 0.03,
    goggles: {
      offset: [0.08, 0, 0.1] as Triple,
      size: [0.11, 0.08, 0.17] as Triple,
      lens: { radius: 0.03, spacing: 0.065, depth: 0.012, segments: 12 },
    },
    radio: {
      offset: [-0.12, 0, -0.08] as Triple,
      size: [0.19, 0.045, 0.28] as Triple,
      stick: { radius: 0.006, height: 0.05, spacing: 0.17 },
      antenna: { radius: 0.006, height: 0.18 },
    },
  },
  labelLift: 1.9,
} as const;

export const LAUNCH_PAD = {
  at: PAD,
  size: droneUnits(0.45),
  thickness: droneUnits(PAD_TOP_METRES),
  border: 0.25,
  markLift: 0.012,
  labelInset: 0.4,
} as const;

export interface BeamLook {
  startRadius: number;
  endRadius: number;
  opacity: number;
  core: number;
  glow: boolean;
  dash: { period: number; duty: number; speed: number; logScale: number; floor: number };
  fade: readonly [start: number, end: number];
  segments: number;
}

export const BEAMS = {
  control: {
    startRadius: 0.05,
    endRadius: 0.12,
    opacity: 0.55,
    core: 1.4,
    glow: false,
    dash: { period: 3, duty: 0.5, speed: 2.4, logScale: 30, floor: 0.3 },
    fade: [0.25, 0.02],
    segments: 8,
  },
  video: {
    startRadius: 0.14,
    endRadius: 0.06,
    opacity: 0.32,
    core: 1.2,
    glow: false,
    dash: { period: 6, duty: 0.6, speed: -1.6, logScale: 40, floor: 0.35 },
    fade: [0.02, 0.25],
    segments: 8,
  },
} as const satisfies Record<string, BeamLook>;

export const LINKS = {
  signalFloor: 0.2,
  labelShare: { control: 0.45, video: 0.6 },
} as const;

export const TRACK = {
  step: 0.25,
  capacity: 1024,
  maxGap: 8,
  width: 1.1,
  drop: 0.5,
  opacity: 0.38,
  fadeSeconds: 24,
  floor: 0.08,
} as const;

export const SCENE_LIMITS = {
  cameraNear: 0.2,
  cameraFar: 14000,
  cameraMinDistance: 2,
  cameraMaxDistance: SCENE_BOUNDS.x[1] - SCENE_BOUNDS.x[0] + 400,
  maxPolarAngle: Math.PI * 0.84,
} as const;

export const HIGHLIGHT_DIM = { saturation: 0.5, brightness: 0.6, emissive: 0.45 } as const;

export const UNDIMMED_PARTS: readonly PartId[] = ['controlLink', 'videoLink', 'spinArrows'];
