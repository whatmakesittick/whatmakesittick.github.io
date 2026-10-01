import {
  BODY_LENGTH_M,
  GRAVITATIONAL_CONSTANT,
  SGR_A_MASS_KG,
  STANDARD_GRAVITY,
  schwarzschildRadiusM,
} from './constants';

export function tidalStretch(radiusRs: number, massKg: number, lengthM = BODY_LENGTH_M): number {
  const radiusM = Math.max(radiusRs, Number.EPSILON) * schwarzschildRadiusM(massKg);
  return (2 * GRAVITATIONAL_CONSTANT * massKg * lengthM) / radiusM ** 3;
}

export function tidalStretchG(radiusRs: number, massKg: number, lengthM = BODY_LENGTH_M): number {
  return tidalStretch(radiusRs, massKg, lengthM) / STANDARD_GRAVITY;
}

export function radiusOfStretchG(stretchG: number, massKg: number): number {
  const radiusM = Math.cbrt(
    (2 * GRAVITATIONAL_CONSTANT * massKg * BODY_LENGTH_M) / (stretchG * STANDARD_GRAVITY),
  );
  return radiusM / schwarzschildRadiusM(massKg);
}

export const ONE_G_RADIUS = radiusOfStretchG(1, SGR_A_MASS_KG);
