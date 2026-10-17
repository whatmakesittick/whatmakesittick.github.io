import { LatheGeometry, Vector2 } from 'three';
import type { BufferGeometry } from 'three';
import { FULL_TURN } from '@core/math';

export type Axis = 'x' | 'y' | 'z';

export type Profile = readonly (readonly [radius: number, axial: number])[];

export interface Sweep {
  start: number;
  length: number;
}

export interface LatheOptions {
  axis: Axis;
  segments: number;
  sweep?: Sweep;
  span?: readonly [first: number, last: number];
}

const FULL_SWEEP: Sweep = { start: 0, length: FULL_TURN };
export const QUARTER_TURN = FULL_TURN / 4;
export const HALF_TURN = FULL_TURN / 2;

export function arcShares(profile: Profile): number[] {
  const lengths = profile.map((point, index) =>
    index === 0
      ? 0
      : Math.hypot(point[0] - profile[index - 1][0], point[1] - profile[index - 1][1]),
  );
  const cumulative = lengths.map((_, index) =>
    lengths.slice(0, index + 1).reduce((sum, value) => sum + value, 0),
  );
  const total = cumulative[cumulative.length - 1] || 1;
  return cumulative.map((value) => value / total);
}

function orient(geometry: BufferGeometry, axis: Axis): BufferGeometry {
  if (axis === 'x') geometry.rotateZ(-QUARTER_TURN);
  if (axis === 'z') geometry.rotateX(QUARTER_TURN);
  return geometry;
}

function remapUv(geometry: BufferGeometry, shares: readonly number[], sweep: Sweep): void {
  const uv = geometry.getAttribute('uv');
  const rows = shares.length;
  for (let index = 0; index < uv.count; index += 1) {
    const around = Math.floor(index / rows) / (uv.count / rows - 1);
    const u = (sweep.start + around * sweep.length) / FULL_TURN;
    uv.setXY(index, u, shares[index % rows]);
  }
  uv.needsUpdate = true;
}

export function latheAround(profile: Profile, options: LatheOptions): BufferGeometry {
  const sweep = options.sweep ?? FULL_SWEEP;
  const [first, last] = options.span ?? [0, profile.length - 1];
  const shares = arcShares(profile).slice(first, last + 1);
  const points = profile
    .slice(first, last + 1)
    .map(([radius, axial]) => new Vector2(radius, axial));
  const geometry = new LatheGeometry(points, options.segments, sweep.start, sweep.length);
  remapUv(geometry, shares, sweep);
  return orient(geometry, options.axis);
}
