import { CORNER_NOZZLE_IDS } from '../../../ids';
import type { NozzleId, Point } from '../../../ids';
import { CAR, NOZZLES } from '../../../model/layout';

export const WHEEL = {
  radius: CAR.wheelRadius,
  centreY: CAR.wheelRadius - CAR.rideHeight,
  frontX: CAR.wheelbase / 2,
  rearX: -CAR.wheelbase / 2,
  trackHalfZ: 0.84,
  tyreWidth: 0.27,
  archClearance: 0.05,
} as const;

export const WHEEL_CENTRES: readonly Point[] = [WHEEL.frontX, WHEEL.rearX].flatMap((x) =>
  [-WHEEL.trackHalfZ, WHEEL.trackHalfZ].map((z): Point => [x, WHEEL.centreY, z]),
);

export const BODY = {
  halfLength: CAR.length / 2,
  halfWidth: CAR.width / 2,
  floorY: 0,
  roofY: CAR.height - CAR.rideHeight,
} as const;

const CORNER_NOZZLE_CLEAR_X = 1.95;

const CORNER_IDS: ReadonlySet<NozzleId> = new Set(CORNER_NOZZLE_IDS);

export function drawnNozzleAt(id: NozzleId): Point {
  const [x, y, z] = NOZZLES[id].at;
  if (!CORNER_IDS.has(id)) return [x, y, z];
  return [Math.sign(x) * CORNER_NOZZLE_CLEAR_X, y, z];
}
