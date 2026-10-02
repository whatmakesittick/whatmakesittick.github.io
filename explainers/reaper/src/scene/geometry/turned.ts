import type { BufferGeometry } from 'three';
import { lerp } from '@core/math';
import { latheAlongX, sampleProfile } from '@core/scene/geometry/lathe';
import type { ProfilePoint } from '@core/scene/geometry/lathe';
import { airfoilSurface } from './airfoilSurface';
import type { LoopPoint, Station } from './airfoilSurface';

export interface FinSet {
  from: number;
  chord: number;
  span: number;
  tipChord: number;
}

export interface StoreShape {
  profile: readonly ProfilePoint[];
  segments: number;
  samples: number;
  finThickness: number;
}

const QUARTER_TURN = Math.PI / 2;
const FIN_COUNT = 4;
const FIN_ROLL = Math.PI / 4;
const FIN_ROOT_SINK = 0.9;

function radiusAt(profile: readonly ProfilePoint[], axial: number): number {
  const index = profile.findIndex((point) => point[0] >= axial);
  if (index <= 0) return profile[Math.max(index, 0)][1];
  const [a, b] = [profile[index - 1], profile[index]];
  return lerp(a[1], b[1], (axial - a[0]) / (b[0] - a[0]));
}

export function profileSlice(
  profile: readonly ProfilePoint[],
  from: number,
  to: number,
): ProfilePoint[] {
  const inside = profile.filter(([axial]) => axial > from && axial < to);
  return [[from, radiusAt(profile, from)], ...inside, [to, radiusAt(profile, to)]];
}

export function turnedSlice(
  shape: StoreShape,
  from: number,
  to: number,
  noseX: number,
): BufferGeometry {
  const slice = profileSlice(shape.profile, from, to).map(
    ([axial, radius]) => [noseX - axial, radius] as const,
  );
  const share = (to - from) / shape.profile[shape.profile.length - 1][0];
  const samples = Math.max(2, Math.round(shape.samples * share));
  return latheAlongX(sampleProfile(slice, samples), shape.segments);
}

export function finRing(
  shape: StoreShape,
  fins: FinSet,
  noseX: number,
  loop: readonly LoopPoint[],
): BufferGeometry[] {
  const root = radiusAt(shape.profile, fins.from + fins.chord / 2) * FIN_ROOT_SINK;
  const leadingX = noseX - fins.from;
  const station = (radius: number, chord: number, setBack: number): Station => ({
    leadingEdge: [leadingX - setBack, radius, 0],
    chordAxis: [-1, 0, 0],
    normalAxis: [0, 0, 1],
    chord,
    thickness: shape.finThickness / chord,
    camber: 0,
  });
  return Array.from({ length: FIN_COUNT }, (_, index) => {
    const fin = airfoilSurface(
      [
        station(root, fins.chord, 0),
        station(root + fins.span, fins.tipChord, fins.chord - fins.tipChord),
      ],
      loop,
    );
    fin.rotateX(FIN_ROLL + index * QUARTER_TURN);
    return fin;
  });
}
