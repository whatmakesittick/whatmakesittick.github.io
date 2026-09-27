import { toRadians } from '@core/math';
import {
  BEAM_RADIUS_MM,
  COVERSLIP_MM,
  FIELD_NUMBER_MM,
  SHOULDER,
  STATIONS,
  TUBE_TOP,
} from '../model';

export const SCENE_UNITS_PER_MM = 0.1;
export const BENCH_LEVEL = -30;
export const FLOOR_HEIGHT = 0;
export const RAY_LATERAL_TO_Z = -1;

export const CAMERA = {
  near: 0.05,
  far: 600,
  minDistance: 2,
  maxDistance: 160,
  apertureMinDistance: 0.2,
} as const;

export const SEGMENTS = { round: 48, small: 24, knob: 18 } as const;

export const BENCH_MAT = { halfWidth: 150, back: -170, front: 150, thickness: 1.5 } as const;

export const BASE = {
  halfWidth: 95,
  back: -135,
  front: 105,
  height: 24,
  cornerRadius: 18,
} as const;
export const BASE_TOP = BENCH_LEVEL + BASE.height;

export const ARM = {
  halfWidth: 17,
  outline: [
    [-128, BASE_TOP],
    [-62, BASE_TOP],
    [-54, 30],
    [-48, 84],
    [-48, 150],
    [-54, 196],
    [-58, 238],
    [-76, 247],
    [-96, 236],
    [-102, 150],
    [-108, 60],
    [-128, 30],
  ],
} as const;

export const HEAD = {
  halfWidth: 22,
  back: -60,
  front: 20,
  bottom: SHOULDER + 15,
  top: SHOULDER + 45,
  cutGap: 1.2,
} as const;

export const LAMP_HOUSING = {
  inner: 22,
  outer: 26,
  bottom: BASE_TOP,
  top: STATIONS.fieldDiaphragm,
};
export const BULB = { radius: 5, rings: 12 } as const;
export const COLLECTOR_LENS = { radius: 20, thickness: 6 } as const;
export const FIELD_DIAPHRAGM = { inner: BEAM_RADIUS_MM + 0.5, outer: 26, thickness: 2 } as const;

export const CONDENSER = {
  inner: 18.5,
  outer: 21,
  bottom: STATIONS.condenserEntry,
  top: 133,
  lensRadius: 17.5,
  lensThickness: 7,
} as const;
export const IRIS = { outer: CONDENSER.inner, thickness: 1.2, minOpening: 0.4 } as const;
export const CONDENSER_LABEL_HEIGHT = 108;
export const CONDENSER_BRACKET = { halfWidth: 9, bottom: 100, top: 108, back: -44 } as const;

export const STAGE = {
  halfWidth: 68,
  back: -44,
  front: 76,
  thickness: 16,
  holeRadius: 22,
  notchHalfWidth: 24,
} as const;
export const STAGE_TOP = STATIONS.slideBottom;
export const STAGE_CARRIER = { halfWidth: 18, back: -48, front: -44, bottom: 84, top: STAGE_TOP };
export const SLIDE = { halfWidth: 13, halfLength: 38, thickness: 1 } as const;
export const COVERSLIP = { half: 11, thickness: COVERSLIP_MM } as const;
export const STAGE_CLIP = { halfWidth: 5, length: 14, thickness: 1, offset: 30 } as const;

export const NOSEPIECE = {
  tilt: toRadians(15),
  mountRadius: 22,
  plateRadius: 36,
  plateThickness: 8,
  turnRate: 7,
  cutGap: 0.6,
} as const;

export const OBJECTIVE_SHAPE = {
  wall: 1.2,
  clearance: 0.3,
  lensRim: 0.3,
  barrelRadius: 9,
  boreRadius: 7.5,
  threadRadius: 10,
  threadLength: 4,
  bandHeight: 2.5,
  bandLift: 0.25,
  lensThickness: 3,
  lensThicknessShare: 0.6,
} as const;

export const TUBE = { inner: 13, outer: 16, bottom: HEAD.top, top: TUBE_TOP } as const;

export const EYEPIECE = {
  insertInner: 11,
  insertOuter: 12.2,
  insertDepth: 15,
  bodyInner: 13,
  bodyOuter: 15.5,
  flangeHeight: 3,
  flangeRadius: 17,
  eyecupHeight: 3,
  eyecupInner: 11,
  fieldStop: FIELD_NUMBER_MM / 2,
  fieldStopThickness: 0.8,
  lensRadius: 12.5,
  lensThickness: 5,
  labelDrop: 8,
} as const;
export const IMAGE_DISC_LIFT = 0.02;

export const EYE = {
  radius: 12.5,
  centerAboveLens: 11,
  lensRadius: 4,
  lensThickness: 3,
  retinaInset: 0.35,
} as const;

export const KNOBS = {
  height: 56,
  z: -80,
  coarse: { radius: 17, width: 11 },
  fine: { radius: 9, width: 7 },
  finePerTurnUm: 200,
} as const;

export const RAYS = {
  width: 1.8,
  blockedWidth: 1.2,
  virtualWidth: 1.3,
  litOpacity: 0.95,
  blockedOpacity: 0.5,
  virtualOpacity: 0.7,
  dash: 3,
  gap: 2.2,
} as const;

export const PULSE = {
  trail: 6,
  spacing: 2.5,
  fade: 0.62,
  sizePerDistance: 0.03,
} as const;

export const RENDER_ORDER = { glass: 1, image: 2, rays: 3, pulse: 4 } as const;

export const OIL_DROP = { radius: 1.6, overlap: 0.02 } as const;

export const FOCUS_LIFT = { exaggeration: 50, workingDistanceShare: 0.6 } as const;
