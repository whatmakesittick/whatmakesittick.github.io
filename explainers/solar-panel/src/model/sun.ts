import { clamp, toDegrees, toRadians } from '@core/math';
import { SOLAR_NOON_MIN } from './day';

export type Direction3 = readonly [x: number, y: number, z: number];

export const LATITUDE_DEG = 40;
export const DECLINATION_DEG = 0;
export const MINUTES_PER_HOUR_ANGLE_DEG = 4;
export const SOLAR_CONSTANT_W_M2 = 1353;
export const DIFFUSE_SHARE = 0.1;

const RIGHT_ANGLE_DEG = 90;
const FULL_TURN_DEG = 360;
const KASTEN_YOUNG = { a: 0.50572, b: 96.07995, c: -1.6364 } as const;
const MEINEL = { base: 0.7, exponent: 0.678 } as const;

const latitude = toRadians(LATITUDE_DEG);
const declination = toRadians(DECLINATION_DEG);

export function hourAngleDeg(minute: number): number {
  return (minute - SOLAR_NOON_MIN) / MINUTES_PER_HOUR_ANGLE_DEG;
}

export function sunDirection(minute: number): Direction3 {
  const hourAngle = toRadians(hourAngleDeg(minute));
  const east = -Math.cos(declination) * Math.sin(hourAngle);
  const north =
    Math.cos(latitude) * Math.sin(declination) -
    Math.sin(latitude) * Math.cos(declination) * Math.cos(hourAngle);
  const up =
    Math.sin(latitude) * Math.sin(declination) +
    Math.cos(latitude) * Math.cos(declination) * Math.cos(hourAngle);
  return [east, up, -north];
}

export function sunElevationDeg(minute: number): number {
  const [, up] = sunDirection(minute);
  return toDegrees(Math.asin(clamp(up, -1, 1)));
}

export function sunAzimuthDeg(minute: number): number {
  const [east, , south] = sunDirection(minute);
  const azimuth = toDegrees(Math.atan2(east, -south));
  return (azimuth + FULL_TURN_DEG) % FULL_TURN_DEG;
}

export function panelNormal(tiltDeg: number): Direction3 {
  const tilt = toRadians(tiltDeg);
  return [0, Math.cos(tilt), Math.sin(tilt)];
}

export function incidenceCosine(minute: number, tiltDeg: number): number {
  const sun = sunDirection(minute);
  const normal = panelNormal(tiltDeg);
  const dot = sun[0] * normal[0] + sun[1] * normal[1] + sun[2] * normal[2];
  return Math.max(0, dot);
}

export function incidenceAngleDeg(minute: number, tiltDeg: number): number {
  return toDegrees(Math.acos(clamp(incidenceCosine(minute, tiltDeg), -1, 1)));
}

export function airMass(elevationDeg: number): number {
  const zenith = clamp(RIGHT_ANGLE_DEG - elevationDeg, 0, RIGHT_ANGLE_DEG);
  const cosine = Math.cos(toRadians(zenith));
  const correction = KASTEN_YOUNG.a * (KASTEN_YOUNG.b - zenith) ** KASTEN_YOUNG.c;
  return 1 / (cosine + correction);
}

export function directNormalIrradiance(elevationDeg: number): number {
  if (elevationDeg <= 0) return 0;
  return SOLAR_CONSTANT_W_M2 * MEINEL.base ** (airMass(elevationDeg) ** MEINEL.exponent);
}

export interface IrradianceParts {
  direct: number;
  diffuse: number;
  total: number;
}

export function irradianceParts(minute: number, tiltDeg: number): IrradianceParts {
  const elevation = sunElevationDeg(minute);
  const normal = directNormalIrradiance(elevation);
  const skyView = (1 + Math.cos(toRadians(tiltDeg))) / 2;
  const direct = normal * incidenceCosine(minute, tiltDeg);
  const diffuse = DIFFUSE_SHARE * normal * Math.sin(toRadians(Math.max(0, elevation))) * skyView;
  return { direct, diffuse, total: direct + diffuse };
}

export function planeOfArrayIrradiance(minute: number, tiltDeg: number): number {
  return irradianceParts(minute, tiltDeg).total;
}

export function isSunUp(minute: number): boolean {
  return sunElevationDeg(minute) > 0;
}
