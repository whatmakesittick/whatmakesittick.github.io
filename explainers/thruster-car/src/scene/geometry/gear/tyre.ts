import type { BufferGeometry, DataTexture } from 'three';
import { lerp } from '@core/math';
import { WHEEL } from '../../parts/car/dimensions';
import { arcShares, latheAround } from './lathe';
import type { Profile } from './lathe';
import { grey, hash, paintTexture, ridge, seamDistance } from './maps';

export const WHEEL_SEGMENTS = 32;
export const SIDEWALL_TEXEL = [0.5, 0.02] as const;

const HALF_WIDTH = WHEEL.tyreWidth / 2;
const BEAD_RADIUS = 0.243;
const SHOULDER_TUCK = 0.0005;
const CROWN_BULGE = 0.0012;

const HALF_PROFILE: Profile = [
  [BEAD_RADIUS, 0.113],
  [0.262, 0.129],
  [0.295, HALF_WIDTH],
  [0.322, 0.13],
  [0.335, 0.117],
  [WHEEL.radius - SHOULDER_TUCK, 0.09],
];

const CROWN: Profile = [[WHEEL.radius + CROWN_BULGE, 0]];

export const TYRE_PROFILE: Profile = [
  ...HALF_PROFILE.map(([radius, axial]): Profile[number] => [radius, -axial]),
  ...CROWN,
  ...[...HALF_PROFILE].reverse(),
];

const TREAD_EDGE_INDEX = HALF_PROFILE.length - 1;

const TREAD = {
  base: 0.82,
  sidewall: 0.96,
  groove: 0.3,
  grooves: [0.2, 0.4, 0.6, 0.8],
  grooveHalfWidth: 0.026,
  grooveSoftness: 0.012,
  sipes: 72,
  sipeHalfWidth: 0.06,
  sipeSlant: 0.6,
  sipeShade: 0.5,
  outerBlock: 0.2,
  ribShare: 0.06,
  ribHalfWidth: 0.012,
  ribShade: 0.86,
  grain: 0.05,
} as const;

const TREAD_MAP = { width: 512, height: 128, repeat: true } as const;

export function tyreGeometry(): BufferGeometry {
  return latheAround(TYRE_PROFILE, { axis: 'z', segments: WHEEL_SEGMENTS });
}

export function treadBand(): readonly [start: number, end: number] {
  const shares = arcShares(TYRE_PROFILE);
  return [shares[TREAD_EDGE_INDEX], shares[TYRE_PROFILE.length - 1 - TREAD_EDGE_INDEX]];
}

function sidewallShade(v: number): number {
  const fromBead = Math.min(v, 1 - v);
  const rib = ridge(fromBead, TREAD.ribShare, TREAD.ribHalfWidth, TREAD.ribHalfWidth);
  return lerp(TREAD.sidewall, TREAD.ribShade, rib);
}

function treadShade(u: number, across: number): number {
  const groove = Math.max(
    ...TREAD.grooves.map((centre) =>
      ridge(across, centre, TREAD.grooveHalfWidth, TREAD.grooveSoftness),
    ),
  );
  const outer = Math.min(across, 1 - across) < TREAD.outerBlock;
  const slant = u * TREAD.sipes + across * TREAD.sipeSlant;
  const sipe = outer ? ridge(seamDistance(slant), 0, TREAD.sipeHalfWidth, TREAD.sipeHalfWidth) : 0;
  const shade = lerp(TREAD.base, TREAD.sipeShade, sipe);
  return lerp(shade, TREAD.groove, groove);
}

export function treadTexture(): DataTexture {
  const [start, end] = treadBand();
  return paintTexture(TREAD_MAP, (u, v) => {
    const grain =
      TREAD.grain * (hash(Math.floor(u * TREAD_MAP.width), Math.floor(v * TREAD_MAP.height)) - 0.5);
    if (v < start || v > end) return grey(sidewallShade(v) + grain);
    return grey(treadShade(u, (v - start) / (end - start)) + grain);
  });
}
