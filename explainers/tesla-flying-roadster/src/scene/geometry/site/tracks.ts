import { smoothstep } from '@core/math';
import { CatmullRomCurve3, Vector3 } from 'three';
import type { BufferGeometry, DataTexture } from 'three';
import { SITE } from '../../../model/layout';
import { THEME } from '../../../theme';
import { arrayGeometry, upNormals } from './arrays';
import { GROUND } from './groundGrid';
import { hash2, tileNoise } from './noise';
import { band, mixRgb, paintTexture, srgb } from './textures';
import type { Rgba } from './textures';

type PathPoint = readonly [x: number, z: number];

const DIRT_TRACKS = {
  width: 3.2,
  lift: 0.012,
  step: 3,
  metres: 9,
  service: { gap: 10, before: 110, after: 140 },
  branches: [
    {
      from: 'start',
      offsets: [
        [6, 0],
        [-4, -44],
        [-36, -134],
        [-52, -244],
        [-48, -404],
      ],
    },
    {
      from: 'end',
      offsets: [
        [28, 0],
        [38, 56],
        [60, 146],
        [96, 276],
        [136, 436],
      ],
    },
  ],
  ruts: { offset: 0.27, width: 0.07, depth: 0.7 },
  pebbles: { chance: 0.9, light: 0.12, grain: 0.2 },
  wear: 0.25,
  crown: { width: 0.09, grass: 0.5 },
  edge: { from: 0.72, to: 1 },
  size: { width: 64, height: 256 },
  seed: 113,
} as const;

const XYZ = 3;
const DIRT = srgb('#6a5a46');
const RUT = srgb('#4a3e31');
const GRASS = srgb(THEME.scrub);
const NOISE = {
  wear: tileNoise({ u: 4, v: 16 }, 3, DIRT_TRACKS.seed),
  pebbles: tileNoise({ u: 32, v: 128 }, 2, DIRT_TRACKS.seed + 1),
} as const;

export function trackPaths(): PathPoint[][] {
  const { service, branches } = DIRT_TRACKS;
  const z = SITE.run.z[0] - service.gap;
  const along: PathPoint[] = [
    [SITE.run.x[0] - service.before, z - 2],
    [SITE.run.x[0] + 20, z],
    [(SITE.run.x[0] + SITE.run.x[1]) / 2, z - 3],
    [SITE.run.x[1] + 50, z],
    [SITE.run.x[1] + service.after, z - 11],
  ];
  const roots = { start: SITE.run.x[0], end: SITE.run.x[1] };
  const spurs = branches.map(({ from, offsets }) =>
    offsets.map(([dx, dz]): PathPoint => [roots[from] + dx, z + dz]),
  );
  return [along, ...spurs];
}

export function trackPoints(path: readonly PathPoint[]): Vector3[] {
  const curve = new CatmullRomCurve3(path.map(([x, z]) => new Vector3(x, 0, z)));
  const samples = Math.ceil(curve.getLength() / DIRT_TRACKS.step);
  return curve.getSpacedPoints(samples);
}

let sampled: Vector3[][] | undefined;

function allTrackPoints(): Vector3[][] {
  sampled ??= trackPaths().map(trackPoints);
  return sampled;
}

export function onTrack(x: number, z: number, margin = 0): boolean {
  const reach = DIRT_TRACKS.width / 2 + margin;
  return allTrackPoints().some((points) =>
    points.some((point) => Math.hypot(point.x - x, point.z - z) < reach),
  );
}

function ribbon(
  points: readonly Vector3[],
  positions: number[],
  uvs: number[],
  indices: number[],
): void {
  const half = DIRT_TRACKS.width / 2;
  const side = new Vector3();
  let along = 0;
  points.forEach((point, index) => {
    const next = points[Math.min(index + 1, points.length - 1)];
    const previous = points[Math.max(index - 1, 0)];
    side
      .set(-(next.z - previous.z), 0, next.x - previous.x)
      .normalize()
      .multiplyScalar(half);
    if (index > 0) along += point.distanceTo(points[index - 1]);
    const base = positions.length / XYZ;
    const y = GROUND.level + DIRT_TRACKS.lift;
    positions.push(point.x - side.x, y, point.z - side.z, point.x + side.x, y, point.z + side.z);
    uvs.push(0, along / DIRT_TRACKS.metres, 1, along / DIRT_TRACKS.metres);
    if (index > 0) indices.push(base - 2, base - 1, base, base - 1, base + 1, base);
  });
}

export function tracksGeometry(): BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  allTrackPoints().forEach((points) => ribbon(points, positions, uvs, indices));
  return arrayGeometry({ position: positions, normal: upNormals(positions), uv: uvs }, indices);
}

function trackShade(u: number, v: number): Rgba {
  const { ruts, crown, edge, pebbles, wear, seed, size } = DIRT_TRACKS;
  const across = Math.abs(u - 0.5) * 2;
  const rut = Math.max(
    band(u, 0.5 - ruts.offset, ruts.width),
    band(u, 0.5 + ruts.offset, ruts.width),
  );
  const grassy = band(u, 0.5, crown.width) * crown.grass * NOISE.wear(u, v);
  const speck = hash2(Math.floor(u * size.width), Math.floor(v * size.height), seed);
  const dirt = mixRgb(mixRgb(DIRT, RUT, rut * ruts.depth), GRASS, grassy);
  const level =
    (1 + (speck > pebbles.chance ? pebbles.light : 0)) *
    (1 + pebbles.grain * (NOISE.pebbles(u, v) - 0.5));
  const alpha = (1 - smoothstep(across, edge.from, edge.to)) * (1 - wear * NOISE.wear(u, v));
  return [dirt[0] * level, dirt[1] * level, dirt[2] * level, alpha];
}

export function trackMap(): DataTexture {
  return paintTexture(DIRT_TRACKS.size, trackShade);
}
