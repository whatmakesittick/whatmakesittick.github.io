import { CylinderGeometry, Vector3 } from 'three';
import type { BufferGeometry, DataTexture } from 'three';
import { FULL_TURN, clamp, lerp } from '@core/math';
import { mergeParts } from '../../parts/context';
import { tinted } from './attributes';
import { QUARTER_TURN, latheAround } from './lathe';
import type { Profile } from './lathe';
import { loftFaceted } from './loft';
import type { Section, Station } from './loft';
import { grey, hash, paintTexture, ridge } from './maps';
import { WHEEL_SEGMENTS } from './tyre';

const LIP_PROFILE: Profile = [
  [0.249, 0.104],
  [0.2525, 0.113],
  [0.2495, 0.1205],
  [0.241, 0.1235],
  [0.2305, 0.121],
  [0.2265, 0.112],
];

const BARREL_PROFILE: Profile = [
  [0.2265, 0.112],
  [0.226, -0.104],
  [0.236, -0.118],
];

const HUB_PROFILE: Profile = [
  [0.085, 0.048],
  [0.085, 0.074],
  [0.079, 0.083],
  [0.034, 0.083],
  [0.026, 0.091],
  [0, 0.093],
];

const HUB_SEGMENTS = 18;

export const HUB_FACE_Z = 0.083;

const NUTS = {
  count: 5,
  pitchRadius: 0.057,
  radius: 0.0095,
  height: 0.013,
  sides: 6,
  blurCore: 0.8,
  blurSoft: 0.4,
} as const;

export const SPOKES = {
  pairs: 5,
  hubRadius: 0.07,
  rimRadius: 0.231,
  hubSpread: 0.12,
  rimSpread: 0.125,
  hubTop: 0.072,
  rimTop: 0.117,
  dishPower: 1.6,
  hubWidth: 0.044,
  rimWidth: 0.031,
  hubDepth: 0.03,
  rimDepth: 0.016,
  stations: 4,
} as const;

const SPOKE_SECTION: Section = [
  [-0.5, -1],
  [0.5, -1],
  [0.5, -0.35],
  [0.3, 0],
  [-0.3, 0],
  [-0.5, -0.35],
];

const OUTBOARD = new Vector3(0, 0, 1);

const BLUR = {
  inner: 0.03,
  outer: 0.226,
  lift: 0.003,
  hubTop: 0.0975,
  hubEdge: 0.084,
  dishStart: 0.09,
  maxCover: 0.9,
  floor: 0.42,
  gain: 1.6,
  streak: 0.18,
} as const;

const BLUR_MAP = { width: 4, height: 128 } as const;

export interface RimTones {
  lip: string;
  inner: string;
}

export function rimHubGeometry(tones: RimTones): BufferGeometry {
  const lip = latheAround(LIP_PROFILE, { axis: 'z', segments: WHEEL_SEGMENTS });
  const barrel = latheAround(BARREL_PROFILE, { axis: 'z', segments: WHEEL_SEGMENTS });
  const hub = latheAround(HUB_PROFILE, { axis: 'z', segments: HUB_SEGMENTS });
  return mergeParts([
    tinted(lip, tones.lip),
    tinted(barrel, tones.inner),
    tinted(hub, tones.inner),
  ]);
}

function spokeTop(share: number): number {
  return lerp(SPOKES.hubTop, SPOKES.rimTop, share ** SPOKES.dishPower);
}

function spokeStation(hubAngle: number, rimAngle: number, share: number): Station {
  const angle = lerp(hubAngle, rimAngle, share);
  const radius = lerp(SPOKES.hubRadius, SPOKES.rimRadius, share);
  const hub = new Vector3(Math.cos(hubAngle), Math.sin(hubAngle), 0).multiplyScalar(
    SPOKES.hubRadius,
  );
  const rim = new Vector3(Math.cos(rimAngle), Math.sin(rimAngle), 0).multiplyScalar(
    SPOKES.rimRadius,
  );
  const along = rim.sub(hub).normalize();
  return {
    centre: new Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, spokeTop(share)),
    side: new Vector3().crossVectors(OUTBOARD, along).normalize(),
    up: OUTBOARD.clone(),
    width: lerp(SPOKES.hubWidth, SPOKES.rimWidth, share),
    depth: lerp(SPOKES.hubDepth, SPOKES.rimDepth, share),
  };
}

function spokeGeometry(centre: number, sign: number): BufferGeometry {
  const hubAngle = centre + sign * SPOKES.hubSpread;
  const rimAngle = centre + sign * SPOKES.rimSpread;
  const stations = Array.from({ length: SPOKES.stations }, (_, index) =>
    spokeStation(hubAngle, rimAngle, index / (SPOKES.stations - 1)),
  );
  return loftFaceted(stations, SPOKE_SECTION);
}

function nutGeometry(angle: number): BufferGeometry {
  const nut = new CylinderGeometry(NUTS.radius, NUTS.radius, NUTS.height, NUTS.sides);
  nut.rotateX(QUARTER_TURN);
  nut.translate(
    Math.cos(angle) * NUTS.pitchRadius,
    Math.sin(angle) * NUTS.pitchRadius,
    HUB_FACE_Z + NUTS.height / 2,
  );
  return nut;
}

function pairAngle(index: number): number {
  return QUARTER_TURN + (index * FULL_TURN) / SPOKES.pairs;
}

export function spokesGeometry(): BufferGeometry {
  const pairs = Array.from({ length: SPOKES.pairs }, (_, index) => pairAngle(index));
  const spokes = pairs.flatMap((centre) => [spokeGeometry(centre, -1), spokeGeometry(centre, 1)]);
  const nuts = Array.from({ length: NUTS.count }, (_, index) =>
    nutGeometry(pairAngle(index) + FULL_TURN / SPOKES.pairs / 2),
  );
  return mergeParts([...spokes, ...nuts]);
}

function radialShare(radius: number): number {
  return (radius - SPOKES.hubRadius) / (SPOKES.rimRadius - SPOKES.hubRadius);
}

function blurProfile(): Profile {
  const dish = (radius: number) => spokeTop(clamp(radialShare(radius), 0, 1)) + BLUR.lift;
  return [
    [BLUR.outer, dish(BLUR.outer)],
    [BLUR.dishStart, dish(BLUR.dishStart)],
    [BLUR.hubEdge, BLUR.hubTop],
    [BLUR.inner, BLUR.hubTop],
  ];
}

function radialUv(geometry: BufferGeometry): BufferGeometry {
  const position = geometry.getAttribute('position');
  const uv = geometry.getAttribute('uv');
  for (let index = 0; index < position.count; index += 1) {
    const radius = Math.hypot(position.getX(index), position.getY(index));
    uv.setY(index, (radius - BLUR.inner) / (BLUR.outer - BLUR.inner));
  }
  uv.needsUpdate = true;
  return geometry;
}

export function blurGeometry(): BufferGeometry {
  return radialUv(latheAround(blurProfile(), { axis: 'z', segments: WHEEL_SEGMENTS }));
}

function nutCover(radius: number): number {
  const band = ridge(
    radius,
    NUTS.pitchRadius,
    NUTS.radius * NUTS.blurCore,
    NUTS.radius * NUTS.blurSoft,
  );
  return band * ((NUTS.count * 2 * NUTS.radius) / (FULL_TURN * NUTS.pitchRadius));
}

function spokeCover(radius: number): number {
  const share = radialShare(radius);
  if (share < 0) return 0;
  const width = lerp(SPOKES.hubWidth, SPOKES.rimWidth, clamp(share, 0, 1));
  return (SPOKES.pairs * 2 * width) / (FULL_TURN * radius);
}

export function blurAlpha(radius: number): number {
  const spokes = spokeCover(radius);
  const cover = spokes > 0 ? Math.max(BLUR.floor, spokes * BLUR.gain) : nutCover(radius);
  return Math.min(BLUR.maxCover, cover);
}

export function blurTexture(): DataTexture {
  return paintTexture(BLUR_MAP, (_, v) => {
    const radius = lerp(BLUR.inner, BLUR.outer, v);
    const streak = 1 - BLUR.streak * hash(Math.floor(v * BLUR_MAP.height), 0);
    return grey(streak, blurAlpha(radius) * streak);
  });
}
