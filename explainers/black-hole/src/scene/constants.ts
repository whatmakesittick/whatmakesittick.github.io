import { DISC_OUTER_RADIUS, PHOTON_SPHERE_RADIUS, RELEASE_RADIUS, SHIP_RADIUS } from '../model';
import { FALL_ANGLE, PROBE_SIZE, SHIP_SIZE } from './layout';

export const SKY = {
  radius: 900,
  widthSegments: 24,
  heightSegments: 12,
  renderOrder: -10,
} as const;

export const HERO_CAMERA = { position: [0, 3.6, 34], target: [0, 0, 0] } as const;
export const SCENE_EXTENT = DISC_OUTER_RADIUS * 2;
export const NO_FLOOR = -1e6;

export const LENS = {
  exposure: 0.6,
  maxSteps: 240,
  maxPixels: 1_000_000,
  bent: 1,
  straight: 0,
} as const;

export const BLOOM = { strength: 0.3, radius: 0.15, threshold: 1.6 } as const;
export const DISC_DRIFT_SPEED = 4;

export const SEGMENTS = { capsule: 8, radial: 16, sphere: 12 } as const;

export const PROBE = {
  radius: PROBE_SIZE * 0.28,
  length: PROBE_SIZE * 0.44,
  domeRadius: PROBE_SIZE * 0.18,
  domeSink: 0.3,
  pulseFloor: 0.35,
  pulsePeak: 3.2,
  pulseDecay: 6,
} as const;

export type Outline = readonly (readonly [x: number, y: number])[];

const HULL_PROFILE: Outline = [
  [0.07, -0.5],
  [0.1, -0.4],
  [0.1, 0.18],
  [0.06, 0.36],
  [0, 0.5],
];
const WING_OUTLINE: Outline = [
  [0.18, 0],
  [-0.3, 0.42],
  [-0.42, 0.42],
  [-0.42, -0.42],
  [-0.3, -0.42],
];
const FIN_OUTLINE: Outline = [
  [-0.1, 0],
  [-0.36, -0.26],
  [-0.46, -0.26],
  [-0.42, 0],
];

export const SHIP = {
  hullProfile: HULL_PROFILE,
  wingOutline: WING_OUTLINE,
  finOutline: FIN_OUTLINE,
  plateThickness: SHIP_SIZE * 0.03,
  engine: { radius: SHIP_SIZE * 0.07, x: -SHIP_SIZE * 0.5 },
  light: { radius: SHIP_SIZE * 0.04, x: -SHIP_SIZE * 0.36, z: SHIP_SIZE * 0.42 },
  quarterTurn: Math.PI / 2,
} as const;

export const BEACON = {
  maxPulses: 24,
  pointSize: 0.7,
  maxPath: RELEASE_RADIUS + SHIP_RADIUS,
  redRatio: 8,
  goneRatio: 60,
  arrivalFadeStart: 0.8,
} as const;

export const FALL_LINE = { dash: 0.16, gap: 0.12, opacity: 0.7 } as const;

export const SHEET_LOOK = {
  spokes: 24,
  glowReach: 2.5,
  gridOpacity: 0.85,
  markerRadius: 0.35,
  rimMarkerRadius: 0.28,
  markerGlow: 1.6,
  glowEaseSeconds: 0.5,
} as const;

const PHOTON_SPHERE_ANCHOR_ANGLE = FALL_ANGLE + Math.PI / 7;

export const ANCHOR_POINTS = {
  horizon: [-1, 0, 0.4],
  photonSphere: [
    PHOTON_SPHERE_RADIUS * Math.cos(PHOTON_SPHERE_ANCHOR_ANGLE),
    PHOTON_SPHERE_RADIUS * Math.sin(PHOTON_SPHERE_ANCHOR_ANGLE),
    0,
  ],
  disc: [8, 0, 0],
} as const satisfies Record<string, readonly [number, number, number]>;
export const BEACON_ANCHOR_SHARE = 1 / 3;
