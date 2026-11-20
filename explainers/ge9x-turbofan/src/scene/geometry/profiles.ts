import { clamp, lerp } from '@core/math';
import { smooth } from './revolve';
import type { ProfilePoint, Strand } from './revolve';

const CURVE_SAMPLES = 48;

export type RadiusAt = (x: number) => number;

export function radiusCurve(points: readonly ProfilePoint[], samples = CURVE_SAMPLES): RadiusAt {
  const strand = points.length > 2 ? smooth(points, samples) : points;
  return (x: number) => {
    if (x <= strand[0][0]) return strand[0][1];
    for (let index = 1; index < strand.length; index += 1) {
      const [x1, r1] = strand[index];
      if (x <= x1) {
        const [x0, r0] = strand[index - 1];
        return lerp(r0, r1, clamp((x - x0) / (x1 - x0 || 1), 0, 1));
      }
    }
    return strand[strand.length - 1][1];
  };
}

export function sampled(at: RadiusAt, from: number, to: number, samples: number): ProfilePoint[] {
  return Array.from({ length: samples + 1 }, (_, index) => {
    const x = lerp(from, to, index / samples);
    return [x, at(x)] as const;
  });
}

export function reversed(strand: Strand): Strand {
  return [...strand].reverse();
}

export const STATION_X = {
  lip: -2.8,
  lipJoint: -2.6,
  fanCaseEnd: -1.85,
  splitter: -2.07,
  boosterEnd: -1.58,
  compressorStart: -1.42,
  compressorEnd: 0.15,
  combustorStart: 0.17,
  dome: 0.34,
  combustorEnd: 0.72,
  hptEnd: 1.03,
  lptStart: 1.08,
  lptEnd: 2.13,
  fixedNacelleEnd: 1.25,
  coldExit: 2.15,
  hotExit: 2.8,
  plugTip: 3.32,
} as const;

export const NACELLE_OUTER: readonly ProfilePoint[] = [
  [-2.6, 2.2],
  [-2.45, 2.27],
  [-2.1, 2.33],
  [-1.6, 2.35],
  [-0.9, 2.33],
  [-0.2, 2.26],
  [0.5, 2.18],
  [1.25, 2.07],
  [1.75, 1.92],
  [2.0, 1.72],
  [2.15, 1.5],
];

export const LIP_PROFILE: readonly ProfilePoint[] = [
  [-2.6, 2.2],
  [-2.68, 2.165],
  [-2.74, 2.1],
  [-2.785, 2.0],
  [-2.8, 1.88],
  [-2.79, 1.81],
  [-2.75, 1.765],
  [-2.68, 1.742],
  [-2.6, 1.732],
];

export const FAN_CASE = { inner: 1.72, outer: 1.78, linerFrom: -2.6, linerTo: -2.49 } as const;

export const DUCT_OUTER: readonly ProfilePoint[] = [
  [-1.85, 1.72],
  [-1.5, 1.7],
  [-0.5, 1.65],
  [0.5, 1.58],
  [1.25, 1.52],
  [1.75, 1.47],
  [2.15, 1.42],
];

export const CORE_COWL: readonly ProfilePoint[] = [
  [-2.07, 0.9],
  [-1.85, 0.97],
  [-1.5, 1.04],
  [-0.5, 1.1],
  [0.4, 1.12],
  [1.3, 1.08],
  [1.9, 1.02],
  [2.15, 0.97],
  [2.45, 0.84],
  [2.8, 0.64],
];

export const FLOW_HUB: readonly ProfilePoint[] = [
  [-2.3, 0.47],
  [-2.1, 0.505],
  [-1.9, 0.52],
  [-1.6, 0.54],
  [-1.5, 0.5],
  [-1.42, 0.42],
  [-0.6, 0.45],
  [0.15, 0.48],
];

export const FLOW_CASING: readonly ProfilePoint[] = [
  [-2.07, 0.85],
  [-1.95, 0.81],
  [-1.6, 0.75],
  [-1.5, 0.71],
  [-1.42, 0.665],
  [-0.6, 0.6],
  [0.15, 0.56],
];

export const TURBINE_HUB: readonly ProfilePoint[] = [
  [0.72, 0.53],
  [1.03, 0.55],
  [1.08, 0.52],
  [2.13, 0.54],
];

export const TURBINE_CASING: readonly ProfilePoint[] = [
  [0.72, 0.69],
  [1.03, 0.75],
  [1.08, 0.78],
  [2.13, 0.9],
];

export const cowlAt = radiusCurve(CORE_COWL);
export const ductOuterAt = radiusCurve(DUCT_OUTER);
export const nacelleOuterAt = radiusCurve(NACELLE_OUTER);
export const hubAt = radiusCurve(FLOW_HUB);
export const casingAt = radiusCurve(FLOW_CASING);
export const turbineHubAt = radiusCurve(TURBINE_HUB);
export const turbineCasingAt = radiusCurve(TURBINE_CASING);

export const COMBUSTOR = {
  outerCasing: 0.8,
  innerCasing: 0.36,
  linerOuterFront: 0.7,
  linerOuterBack: 0.665,
  linerInnerFront: 0.44,
  linerInnerBack: 0.53,
  linerWall: 0.012,
  nozzleRadius: 0.57,
  nozzleStemX: 0.25,
} as const;

export const HOT_NOZZLE = {
  innerFront: 0.92,
  innerExit: 0.6,
  plugFront: 0.54,
  plugExit: 0.42,
} as const;

export const SHAFTS = {
  inner: { from: -2.32, to: 2.22, inner: 0.07, outer: 0.092 },
  outer: { from: -1.45, to: 1.06, inner: 0.135, outer: 0.17 },
} as const;
