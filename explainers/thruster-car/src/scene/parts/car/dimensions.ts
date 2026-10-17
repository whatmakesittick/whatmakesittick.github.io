import type { Point } from '../../../ids';
import { CAR } from '../../../model/layout';

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
