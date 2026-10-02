import { Color } from 'three';
import { clamp, lerp, smoothstep } from '@core/math';
import { GROUND } from '../constants';
import { fractalNoise } from './noise';

type Range = readonly [number, number];

interface Flat {
  centre: Range;
  radius: Range;
  soft: number;
  level: number;
  gravel: number;
}

const NOISE_OCTAVES = 4;
const EPSILON = 1e-6;
const DUNE_SEED = 31;
const SWELL_SEED = 43;
const PATCH_SEED = 57;
const CREST_SHARPNESS = 1.6;
const PLAINS_SEED = 67;
const BEND_REACH = 4;
const PATCH_EDGES = [0.3, 0.7] as const;
const SWELL_BASE = 0.35;

export function gridLines(extent: Range, fine: Range, cell: number, growth: number): number[] {
  const inner: number[] = [];
  for (let value = fine[0]; value <= fine[1] + EPSILON; value += cell) inner.push(value);
  const before: number[] = [];
  for (
    let step = cell * growth, value = fine[0] - step;
    value > extent[0];
    step *= growth, value -= step
  ) {
    before.unshift(value);
  }
  const after: number[] = [];
  const last = inner[inner.length - 1];
  for (
    let step = cell * growth, value = last + step;
    value < extent[1];
    step *= growth, value += step
  ) {
    after.push(value);
  }
  return [extent[0], ...before, ...inner, ...after, extent[1]];
}

function ellipseReach(x: number, z: number, flat: Flat): number {
  const dx = (x - flat.centre[0]) / flat.radius[0];
  const dz = (z - flat.centre[1]) / flat.radius[1];
  const scale = Math.min(flat.radius[0], flat.radius[1]);
  return Math.max(0, Math.hypot(dx, dz) - 1) * scale;
}

export function flatness(x: number, z: number): number {
  const flats: readonly Flat[] = [...GROUND.flats, GROUND.lake];
  return flats.reduce(
    (most, flat) => Math.max(most, 1 - smoothstep(ellipseReach(x, z, flat), 0, flat.soft)),
    0,
  );
}

function flatShare(x: number, z: number, flat: Flat): number {
  return 1 - smoothstep(ellipseReach(x, z, flat), 0, flat.soft);
}

export function gravelShare(x: number, z: number): number {
  return GROUND.flats.reduce(
    (most, flat) => Math.max(most, flatShare(x, z, flat) * flat.gravel),
    0,
  );
}

export function lakeShare(x: number, z: number): number {
  return 1 - smoothstep(ellipseReach(x, z, GROUND.lake), 0, GROUND.lake.soft);
}

function duneField(x: number, z: number): number {
  const { height, wavelength, direction, wander, swell, swellScale, patchScale } = GROUND.dunes;
  const along = x * Math.cos(direction) + z * Math.sin(direction);
  const across = -x * Math.sin(direction) + z * Math.cos(direction);
  const bend = fractalNoise(
    across / (wavelength * 4),
    along / (wavelength * 6),
    NOISE_OCTAVES,
    DUNE_SEED,
  );
  const phase = (along / wavelength + wander * bend * BEND_REACH) * Math.PI * 2;
  const crest = Math.pow(0.5 + 0.5 * Math.sin(phase), CREST_SHARPNESS);
  const patch = fractalNoise(x / patchScale, z / patchScale, NOISE_OCTAVES, PATCH_SEED);
  const rolling = fractalNoise(x / swellScale, z / swellScale, NOISE_OCTAVES, SWELL_SEED);
  return height * crest * smoothstep(patch, ...PATCH_EDGES) + swell * (rolling - SWELL_BASE);
}

export function terrainHeight(x: number, z: number): number {
  const lake = lakeShare(x, z);
  const flat = flatness(x, z);
  const natural = Math.max(duneField(x, z), 0);
  return lerp(natural, 0, flat) + GROUND.lake.level * lake;
}

const COLOURS = Object.fromEntries(
  Object.entries(GROUND.colours).map(([name, value]) => [name, new Color(value)]),
) as Record<keyof typeof GROUND.colours, Color>;
const PLAINS = new Color(GROUND.plains.colour);

export function groundColour(x: number, z: number, height: number, target: Color): Color {
  const { tint, dunes } = GROUND;
  const relief = clamp(height / dunes.height, 0, 1);
  const patch = fractalNoise(x / tint.rustScale, z / tint.rustScale, NOISE_OCTAVES, PATCH_SEED + 1);
  const lake = lakeShare(x, z);
  target.copy(COLOURS.trough).lerp(COLOURS.sand, smoothstep(relief, 0, tint.troughUntil));
  target.lerp(COLOURS.crest, smoothstep(relief, tint.crestFrom, 1));
  target.lerp(COLOURS.rust, smoothstep(patch, tint.rustFrom, tint.rustTo) * tint.rustShare);
  const plains = fractalNoise(
    x / GROUND.plains.scale,
    z / GROUND.plains.scale,
    NOISE_OCTAVES,
    PLAINS_SEED,
  );
  target.lerp(
    PLAINS,
    smoothstep(plains, GROUND.plains.from, GROUND.plains.to) * GROUND.plains.share,
  );
  target.lerp(COLOURS.gravel, gravelShare(x, z) * (1 - lake));
  target.lerp(COLOURS.lakeEdge, smoothstep(lake, 0, tint.lakeEdge) * tint.lakeEdgeShare);
  return target.lerp(COLOURS.lake, smoothstep(lake, tint.lakeEdge, 1));
}
