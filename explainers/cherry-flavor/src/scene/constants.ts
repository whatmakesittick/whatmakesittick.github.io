import type { Point } from '../ids';

export const SCENE_LIMITS = {
  cameraNear: 0.1,
  cameraFar: 1000,
  cameraMinDistance: 6,
  cameraMaxDistance: 160,
  maxPolarAngle: Math.PI * 0.85,
  fogNear: 260,
  fogFar: 900,
} as const;

export const LIGHT_RIG = {
  distance: 120,
  key: { color: '#fff0de', intensity: 2.3, direction: [0.45, 0.75, 0.95] },
  fill: { color: '#ffc4cf', intensity: 0.85, direction: [-0.7, 0.15, 0.8] },
  rim: { color: '#9cc4ff', intensity: 1.9, direction: [-0.35, 0.55, -1] },
} as const;

export const CROSSFADE = {
  seconds: 0.55,
  swapAt: 0.5,
  incomingScale: 0.9,
  veilPeak: 0.92,
} as const;

export const DETAIL = {
  outlineStep: 0.18,
  domeRings: 24,
  domePower: 2.2,
  domeRounding: 0.1,
  domeSegments: 360,
  sphere: [24, 16],
  smallSphere: [14, 10],
  atom: [12, 9],
  bond: 8,
  tube: 8,
  blob: 5,
  papilla: [10, 6],
} as const;

export const LOOK = {
  cutFace: '#efc4ae',
  cutEdge: '#e2a993',
  innerWall: '#c45f6f',
  cavityBack: '#b9566a',
  lid: '#7a4a3c',
  brow: '#a0705a',
  blush: '#f08f8f',
  ear: '#e4ae95',
  steel: '#c9ced6',
  steelDark: '#9aa1ab',
  clip: '#4fb0e8',
  clipSpring: '#f2f4f7',
  bulb: '#f3d58a',
  nerveFibre: '#d8c6b4',
  tongueBody: '#c7616f',
  tongueTop: '#e48a96',
  tongueCut: '#f0b0b2',
  puddle: '#eaa9bb',
  budCell: '#f6d6d2',
  receptorOff: '#7d6a86',
  neuron: '#e8d6b0',
  mucus: '#9fd8d0',
} as const;

export const SKIN_DEPTH = {
  slab: 1.2,
  head: 7,
  nose: 4.2,
  noseFromX: 8.2,
  noseToX: 10.4,
} as const;

export const CAVITY_BACK_Z = -1.15;

export const HEAD_CENTRE: Point = [0.8, 1, 0];
