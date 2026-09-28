import { toRadians } from '@core/math';
import type { WheelId } from '../ids';
import { MOTION_WORKS, WINDING, wheelSpec } from './train';

export interface Point {
  readonly x: number;
  readonly y: number;
}

export const DIRECTIONS_DEG = {
  barrelFromCentre: 60,
  thirdFromCentre: 300,
  escapeFromFourth: 130,
  leverLine: 150,
  minuteWheelFromCentre: 200,
} as const;

export const LEVER = {
  palletStaffFromEscapeMm: 2.83,
  balanceFromEscapeMm: 5.66,
  bankingPinsFromStaffMm: 1.6,
  bankingPinsHalfGapMm: 0.75,
  forkLengthMm: 2.2,
} as const;

export const BALANCE = {
  radiusMm: 5.3,
  rimWidthMm: 0.8,
  rimHeightMm: 0.48,
  armThicknessMm: 0.22,
  staffRadiusMm: 0.25,
  rollerRadiusMm: 1.0,
  impulseJewelRadiusMm: 0.68,
  inertiaMgCm2: 16,
} as const;

export const HAIRSPRING = {
  innerRadiusMm: 0.6,
  outerRadiusMm: 4.4,
  coils: 12,
  studRadiusMm: 4.65,
} as const;

export const REGULATOR = {
  armLengthMm: 4.75,
  indexRangeDeg: 8,
} as const;

export const MAINSPRING = {
  arborRadiusMm: 1.2,
  wallRadiusMm: 5.55,
} as const;

export const CLICK_CENTRE: Point = { x: 8.0, y: 6.4 };
export const CROWN_WHEEL_FROM_BARREL_DEG = -29;

function polar(from: Point, distance: number, degrees: number): Point {
  const angle = toRadians(degrees);
  return { x: from.x + distance * Math.cos(angle), y: from.y + distance * Math.sin(angle) };
}

function meshDistance(driver: WheelId, driven: WheelId): number {
  return wheelSpec(driver).radiusMm + wheelSpec(driven).pinionRadiusMm;
}

function sixOClockBelow(from: Point, distance: number): Point {
  return { x: 0, y: from.y - Math.sqrt(distance * distance - from.x * from.x) };
}

const CENTRE: Point = { x: 0, y: 0 };
const THIRD = polar(
  CENTRE,
  meshDistance('centreWheel', 'thirdWheel'),
  DIRECTIONS_DEG.thirdFromCentre,
);
const FOURTH = sixOClockBelow(THIRD, meshDistance('thirdWheel', 'fourthWheel'));
const ESCAPE = polar(
  FOURTH,
  meshDistance('fourthWheel', 'escapeWheel'),
  DIRECTIONS_DEG.escapeFromFourth,
);

export const WHEEL_CENTRES: Readonly<Record<WheelId, Point>> = {
  barrel: polar(CENTRE, meshDistance('barrel', 'centreWheel'), DIRECTIONS_DEG.barrelFromCentre),
  centreWheel: CENTRE,
  thirdWheel: THIRD,
  fourthWheel: FOURTH,
  escapeWheel: ESCAPE,
};

export const PALLET_STAFF: Point = polar(
  ESCAPE,
  LEVER.palletStaffFromEscapeMm,
  DIRECTIONS_DEG.leverLine,
);
export const BALANCE_CENTRE: Point = polar(
  ESCAPE,
  LEVER.balanceFromEscapeMm,
  DIRECTIONS_DEG.leverLine,
);

const BANKING_MIDPOINT = polar(
  PALLET_STAFF,
  LEVER.bankingPinsFromStaffMm,
  DIRECTIONS_DEG.leverLine,
);

export const BANKING_PINS: readonly [Point, Point] = [
  polar(BANKING_MIDPOINT, LEVER.bankingPinsHalfGapMm, DIRECTIONS_DEG.leverLine + 90),
  polar(BANKING_MIDPOINT, LEVER.bankingPinsHalfGapMm, DIRECTIONS_DEG.leverLine - 90),
];

export function ratchetMeshDistance(): number {
  return WINDING.ratchetRadiusMm + WINDING.crownWheelRadiusMm;
}

export const CROWN_WHEEL_CENTRE: Point = polar(
  WHEEL_CENTRES.barrel,
  ratchetMeshDistance(),
  CROWN_WHEEL_FROM_BARREL_DEG,
);
export const WINDING_PINION_CENTRE: Point = { x: CROWN_WHEEL_CENTRE.x, y: 0 };

export const MINUTE_WHEEL_CENTRE: Point = polar(
  CENTRE,
  MOTION_WORKS.cannonPinion.radiusMm + MOTION_WORKS.minuteWheel.radiusMm,
  DIRECTIONS_DEG.minuteWheelFromCentre,
);

export function distanceBetween(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function wheelCentre(id: WheelId): Point {
  return WHEEL_CENTRES[id];
}

export function wheelOuterReach(id: WheelId): number {
  const centre = WHEEL_CENTRES[id];
  return Math.hypot(centre.x, centre.y) + wheelSpec(id).radiusMm;
}
