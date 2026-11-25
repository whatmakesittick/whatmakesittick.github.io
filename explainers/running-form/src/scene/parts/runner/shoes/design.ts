import { clamp, smoothstep } from '@core/math';
import { DROP_RAD, profileSamples } from '../../../rig/shoe';
import type { Point2 } from '../../../rig/shoe';

export type Curve = readonly (readonly [x: number, value: number])[];

const PROFILE_STEP_M = 0.002;
const BARE_SOLE_M = -0.0704;

export const SOLE = {
  wrapM: [
    [-0.08, 0.013],
    [0.0, 0.011],
    [0.07, 0.008],
    [0.17, 0.007],
    [0.22, 0.011],
  ],
  minToeM: 0.007,
  flareM: [
    [-0.08, 0.004],
    [0.04, 0.0015],
    [0.12, 0.003],
    [0.22, 0.002],
  ],
  lateralM: [
    [-0.035, 0.042],
    [0.0, 0.041],
    [0.03, 0.042],
    [0.06, 0.046],
    [0.09, 0.054],
    [0.12, 0.061],
    [0.15, 0.058],
    [0.18, 0.044],
  ],
  medialM: [
    [-0.035, 0.04],
    [0.0, 0.036],
    [0.03, 0.041],
    [0.06, 0.043],
    [0.09, 0.043],
    [0.12, 0.048],
    [0.15, 0.051],
    [0.18, 0.052],
  ],
  heelCapM: 0.043,
  toeCapM: 0.04,
  rubberM: 0.003,
  heelPadEndM: 0.035,
  forePadStartM: 0.085,
} as const;

export const UPPER = {
  insetM: 0.003,
  sinkM: 0.004,
  backInsetM: 0.006,
  toeInsetM: 0.006,
  heelCapM: 0.04,
  toeCapM: 0.036,
  openFrontM: 0.05,
  topM: [
    [0.05, 0.038],
    [0.064, 0.016],
    [0.08, -0.002],
    [0.1, -0.013],
    [0.13, -0.029],
    [0.16, -0.041],
    [0.185, -0.046],
    [0.198, -0.05],
  ],
  noseRiseM: 0.013,
  collarM: [
    [-0.075, 0.012],
    [-0.055, 0.005],
    [-0.035, -0.011],
    [-0.012, -0.02],
    [0.012, -0.018],
    [0.032, 0.008],
    [0.05, 0.038],
  ],
  collarRatio: [
    [-0.075, 0.68],
    [-0.04, 0.78],
    [0.0, 0.82],
    [0.025, 0.8],
    [0.05, 0],
  ],
  ridgeM: [
    [0.08, 0],
    [0.14, -0.006],
    [0.2, -0.014],
  ],
  sideExponent: 3.6,
  heightExponent: 2.3,
} as const;

function profilePoints(): Point2[] {
  const { rear, fore } = profileSamples(PROFILE_STEP_M);
  return [...rear, ...fore]
    .sort((a, b) => a.x - b.x)
    .filter((point, at, all) => at === 0 || point.x - all[at - 1].x > 1e-6);
}

const PROFILE_POINTS = profilePoints();

export const SOLE_BACK_M = PROFILE_POINTS[0].x;
export const SOLE_TIP_M = PROFILE_POINTS[PROFILE_POINTS.length - 1].x;
export const UPPER_BACK_M = SOLE_BACK_M + UPPER.backInsetM;
export const UPPER_TIP_M = SOLE_TIP_M - UPPER.toeInsetM;

export function sample(curve: Curve, x: number): number {
  if (x <= curve[0][0]) return curve[0][1];
  const last = curve[curve.length - 1];
  if (x >= last[0]) return last[1];
  const at = curve.findIndex(([cx]) => cx > x);
  const [x0, y0] = curve[at - 1];
  const [x1, y1] = curve[at];
  const t = (x - x0) / (x1 - x0);
  const before = curve[Math.max(at - 2, 0)];
  const after = curve[Math.min(at + 1, curve.length - 1)];
  const m0 = (y1 - before[1]) / Math.max(x1 - before[0], 1e-6);
  const m1 = (after[1] - y0) / Math.max(after[0] - x0, 1e-6);
  const span = x1 - x0;
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    (2 * t3 - 3 * t2 + 1) * y0 +
    (t3 - 2 * t2 + t) * span * m0 +
    (-2 * t3 + 3 * t2) * y1 +
    (t3 - t2) * span * m1
  );
}

export function soleBottom(x: number): number {
  const points = PROFILE_POINTS;
  if (x <= points[0].x) return points[0].y;
  const at = points.findIndex((point) => point.x >= x);
  if (at < 0) return points[points.length - 1].y;
  const a = points[at - 1];
  const b = points[at];
  return a.y + ((b.y - a.y) * (x - a.x)) / (b.x - a.x);
}

function footbed(x: number): number {
  return -x * Math.sin(DROP_RAD) + BARE_SOLE_M * Math.cos(DROP_RAD);
}

export function soleTop(x: number): number {
  return Math.max(footbed(x) + sample(SOLE.wrapM, x), soleBottom(x) + SOLE.minToeM);
}

function capShare(x: number, back: number, tip: number, backCap: number, tipCap: number): number {
  const fromBack = clamp((back + backCap - x) / backCap, 0, 1);
  const fromTip = clamp((x - (tip - tipCap)) / tipCap, 0, 1);
  const u = Math.max(fromBack, fromTip);
  return Math.sqrt(Math.max(1 - u * u, 0));
}

export interface Span {
  readonly lateral: number;
  readonly medial: number;
}

function capped(lateral: number, medial: number, share: number): Span {
  const centre = (lateral - medial) / 2;
  const half = ((lateral + medial) / 2) * share;
  return { lateral: centre + half, medial: half - centre };
}

export function soleTopSpan(x: number): Span {
  const share = capShare(x, SOLE_BACK_M, SOLE_TIP_M, SOLE.heelCapM, SOLE.toeCapM);
  return capped(sample(SOLE.lateralM, x), sample(SOLE.medialM, x), share);
}

export function soleBottomSpan(x: number): Span {
  const share = capShare(x, SOLE_BACK_M, SOLE_TIP_M, SOLE.heelCapM, SOLE.toeCapM);
  const flare = sample(SOLE.flareM, x);
  return capped(sample(SOLE.lateralM, x) + flare, sample(SOLE.medialM, x) + flare, share);
}

export function upperBase(x: number): number {
  return soleTop(x) - UPPER.sinkM;
}

function upperSpan(x: number): Span {
  const share = capShare(x, UPPER_BACK_M, UPPER_TIP_M, UPPER.heelCapM, UPPER.toeCapM);
  const lateral = sample(SOLE.lateralM, x) - UPPER.insetM;
  const medial = sample(SOLE.medialM, x) - UPPER.insetM;
  return capped(lateral, medial, share);
}

export function upperTop(x: number): number {
  if (x < UPPER.openFrontM) return sample(UPPER.collarM, x);
  const nose = smoothstep(x, UPPER_TIP_M - UPPER.toeCapM / 2, UPPER_TIP_M);
  const top = sample(UPPER.topM, x);
  const noseTop = upperBase(x) + UPPER.noseRiseM;
  return top + (noseTop - top) * nose;
}

function collarRatio(x: number): number {
  return x < UPPER.openFrontM ? clamp(sample(UPPER.collarRatio, x), 0, 0.98) : 0;
}

function ridgeOffset(x: number): number {
  return sample(UPPER.ridgeM, x);
}

export interface Arch {
  readonly base: number;
  readonly height: number;
  readonly span: Span;
  readonly collarAngle: number;
  readonly ridge: number;
}

export function archAt(x: number): Arch {
  const base = upperBase(x);
  const span = upperSpan(x);
  const ratio = collarRatio(x);
  const { sideExponent: n, heightExponent: m } = UPPER;
  const rise = Math.max(upperTop(x) - base, 0.004);
  const height = rise / Math.pow(Math.max(1 - Math.pow(ratio, n), 1e-4), 1 / m);
  const collarAngle = Math.asin(Math.pow(ratio, n / 2));
  return { base, height, span, collarAngle, ridge: ridgeOffset(x) };
}

export function archPoint(arch: Arch, angle: number, side: 1 | -1): Point2 & { z: number } {
  const { sideExponent: n, heightExponent: m } = UPPER;
  const sin = Math.max(Math.sin(angle), 0);
  const cos = Math.max(Math.cos(angle), 0);
  const width = side > 0 ? arch.span.lateral : -arch.span.medial;
  const across = Math.pow(sin, 2 / n);
  const z = width * across + arch.ridge * (1 - across);
  return { x: 0, y: arch.base + arch.height * Math.pow(cos, 2 / m), z };
}
