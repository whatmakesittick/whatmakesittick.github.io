import { DISC_OUTER_RADIUS, PHOTON_SPHERE_RADIUS, RELEASE_RADIUS, SHIP_RADIUS } from '../model';
import { PROBE_SIZE, SHIP_SIZE } from './layout';

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
  exposure: 1.4,
  maxSteps: 240,
  maxPixels: 1_000_000,
  bent: 1,
  straight: 0,
} as const;

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

export const SHIP = {
  hullRadius: SHIP_SIZE * 0.13,
  hullLength: SHIP_SIZE * 0.74,
  wing: { width: SHIP_SIZE * 0.18, thickness: SHIP_SIZE * 0.05, span: SHIP_SIZE * 0.8 },
  lightRadius: SHIP_SIZE * 0.05,
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

export const ANCHOR_POINTS = {
  horizon: [-1, 0, 0.4],
  photonSphere: [
    PHOTON_SPHERE_RADIUS * Math.cos(Math.PI / 3),
    PHOTON_SPHERE_RADIUS * Math.sin(Math.PI / 3),
    0,
  ],
  disc: [8, 0, 0],
} as const satisfies Record<string, readonly [number, number, number]>;
export const BEACON_ANCHOR_SHARE = 1 / 3;
