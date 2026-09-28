import { toRadians } from '@core/math';

export const UNITS_PER_NM = 10;

export function nm(nanometres: number): number {
  return nanometres * UNITS_PER_NM;
}

export function toNanometres(units: number): number {
  return units / UNITS_PER_NM;
}

export type Span = readonly [bottom: number, top: number];

export interface PlanPoint {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export function azimuthPoint(azimuthDeg: number, radius: number, y: number): PlanPoint {
  const azimuth = toRadians(azimuthDeg);
  return { x: radius * Math.cos(azimuth), y, z: -radius * Math.sin(azimuth) };
}

export function spanLength(span: Span): number {
  return span[1] - span[0];
}

export function spanMiddle(span: Span): number {
  return (span[0] + span[1]) / 2;
}

export const MEMBRANE = {
  core: [-1.35, 1.35],
  bilayer: [-2.25, 2.25],
  patchX: [-52, 18],
  patchZ: [-136, 18],
} as const satisfies Record<string, Span>;

export const C_RING = {
  outerRadius: 2.75,
  innerRadius: 0.7,
  glutamateRadius: 1.9,
  height: [-3.35, 3.35],
} as const;

export const AXLE = {
  foot: [3.35, 5.5],
  footRadius: 2.0,
  gamma: [3.2, 14.7],
  gammaRadius: 0.8,
  bulgeOffset: 0.6,
} as const;

export const HEAD = {
  span: [7.35, 17.65],
  radius: 5.5,
  lobeRing: 3.0,
  lobeRadius: 2.6,
} as const;

export const SITE = {
  radius: 2.4,
  y: 11.5,
} as const;

export const OSCP = {
  span: [17.65, 20.1],
  radius: 1.6,
} as const;

export const STATOR_AZIMUTH_DEG = 60;

export const PERIPHERAL_STALK = {
  azimuthDeg: STATOR_AZIMUTH_DEG,
  radius: 6.2,
  span: [-2.2, 19.6],
  width: 1.2,
} as const;

export const GATE = {
  azimuthDeg: STATOR_AZIMUTH_DEG,
  innerRadius: 2.8,
  outerRadius: 5.4,
  span: [-2.4, 2.4],
} as const;

export const PUMP_IDS = ['complexOne', 'complexThree', 'complexFour'] as const;

export type PumpId = (typeof PUMP_IDS)[number];

export interface PumpPlan {
  readonly x: number;
  readonly radius: number;
  readonly span: Span;
}

export const PUMPS: Readonly<Record<PumpId, PumpPlan>> = {
  complexOne: { x: -40, radius: 4.5, span: [-3.5, 11] },
  complexThree: { x: -28, radius: 3.5, span: [-3.5, 5] },
  complexFour: { x: -18.5, radius: 3, span: [-3.5, 4] },
};

export const SPACE_LABELS = {
  matrix: { x: -10, y: 9, z: 6 },
  intermembraneSpace: { x: -10, y: -6, z: 6 },
} as const satisfies Record<string, PlanPoint>;

export const ROW_SPACING_NM = 14;

export function rowOffsetZ(index: number): number {
  return -index * ROW_SPACING_NM;
}

export const MOTOR_HEIGHT: Span = [C_RING.height[0], OSCP.span[1]];
