import type { RegionSpec } from '@core/scene/regions';
import type { AnchorId, Point, RegionId } from '../ids';
import { ANCHOR_SCALE, REGION_SCALE } from '../ids';
import type { ScaleId } from '../ids';
import { VOLUME_ML } from './recipe';
import { HELIX_HEIGHT_A } from './scale';

export const BENCH_TOP_Y = 0;

export const STIRRER = { x: [-8, 8], y: [0, 4], z: [-8, 8] } as const satisfies RegionSpec;

export const MIXING_BEAKER = {
  base: [0, STIRRER.y[1], 0],
  innerRadius: 4.5,
  height: 12.5,
  glass: 0.25,
} as const;

export const LIQUID_AREA_CM2 = Math.PI * MIXING_BEAKER.innerRadius ** 2;

export const SOLUTION_A_ML = 250;
export const SOLUTION_B_ML = VOLUME_ML - SOLUTION_A_ML;

export const MIXING_FLOOR_Y = MIXING_BEAKER.base[1] + MIXING_BEAKER.glass;
export const MIXING_RIM_Y = MIXING_BEAKER.base[1] + MIXING_BEAKER.height;

export const STIR_BAR = { length: 5, width: 0.8, height: 0.8 } as const;
export const STIR_BAR_Y = MIXING_FLOOR_Y + STIR_BAR.height / 2;
export const STIR_RPM = 240;
const DEGREES_PER_TURN = 360;
const SECONDS_PER_MINUTE = 60;
export const STIR_DEG_PER_S = (STIR_RPM * DEGREES_PER_TURN) / SECONDS_PER_MINUTE;

export const POUR_BEAKER = {
  rest: [13, BENCH_TOP_Y, 0],
  innerRadius: 3.5,
  height: 9.5,
  glass: 0.25,
  lip: [3, 19, 0],
  lipReachedAt: 0.5,
} as const;

export const POUR_BEAKER_AREA_CM2 = Math.PI * POUR_BEAKER.innerRadius ** 2;

export const THERMOMETER = {
  bulb: [-2.5, 5, -1.5],
  top: [-4.5, 24, -2],
  scaleC: { min: 0, max: 50 },
} as const;

export const STOPWATCH = {
  centre: [-14, 3.5, 3],
  size: [6, 7, 2],
  degPerSecond: 6,
} as const;

export function levelForVolume(volumeMl: number, areaCm2: number): number {
  return volumeMl / areaCm2;
}

export function mixtureLevelCm(pour: number): number {
  return levelForVolume(SOLUTION_A_ML + SOLUTION_B_ML * pour, LIQUID_AREA_CM2);
}

export function pourBeakerLevelCm(pour: number): number {
  return levelForVolume(SOLUTION_B_ML * (1 - pour), POUR_BEAKER_AREA_CM2);
}

export const MOLECULE_ORIGIN: Point = [0, 7, 0];

export const SOLUTION_BOX = {
  x: [-24, 24],
  y: [-20, 20],
  z: [-16, 16],
} as const satisfies RegionSpec;

export const EVENT_CENTRE: Point = [4, 0, 0];

const HALF = 0.5;

export const HELIX_AXIS = {
  x: -17,
  z: 0,
  y: [-HELIX_HEIGHT_A * HALF, HELIX_HEIGHT_A * HALF],
} as const;

export const REGION_SPECS: Readonly<Record<RegionId, RegionSpec>> = {
  bench: { x: [-18, 18], y: [0, 24], z: [-8, 8] },
  beaker: { x: [-6, 6], y: [3, 18], z: [-5, 5] },
  tuning: { x: [-18, 7], y: [0, 24], z: [-6, 6] },
  solution: SOLUTION_BOX,
  event: { x: [-4, 12], y: [-6, 6], z: [-6, 6] },
  helix: { x: [-25, -9], y: [-22, 22], z: [-8, 8] },
};

function offset([x, y, z]: Point, [dx, dy, dz]: Point): Point {
  return [x + dx, y + dy, z + dz];
}

function shiftSpec({ x, y, z }: RegionSpec, [dx, dy, dz]: Point): RegionSpec {
  return {
    x: [x[0] + dx, x[1] + dx],
    y: [y[0] + dy, y[1] + dy],
    z: [z[0] + dz, z[1] + dz],
  };
}

const BEAKER_ORIGIN: Point = [0, 0, 0];

export const SCALE_ORIGIN: Readonly<Record<ScaleId, Point>> = {
  beaker: BEAKER_ORIGIN,
  molecules: MOLECULE_ORIGIN,
};

export function worldRegionSpec(id: RegionId): RegionSpec {
  return shiftSpec(REGION_SPECS[id], SCALE_ORIGIN[REGION_SCALE[id]]);
}

export const ANCHOR_POINTS: Readonly<Record<AnchorId, Point>> = {
  liquidCentre: [0, MIXING_FLOOR_Y + mixtureLevelCm(1) * HALF, 0],
  eventCentre: EVENT_CENTRE,
  helixCentre: [HELIX_AXIS.x, 0, HELIX_AXIS.z],
};

export function worldAnchorPoint(id: AnchorId): Point {
  return offset(ANCHOR_POINTS[id], SCALE_ORIGIN[ANCHOR_SCALE[id]]);
}
