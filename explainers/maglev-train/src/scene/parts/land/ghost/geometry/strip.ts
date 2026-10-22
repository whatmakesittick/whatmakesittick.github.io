import { Color } from 'three';
import type { BufferGeometry } from 'three';
import { QuadSink } from './quads';

export interface ProfilePoint {
  readonly z: number;
  readonly y: number;
  readonly tone: string;
}

export interface Span {
  readonly from: number;
  readonly to: number;
}

export function mirrored(half: readonly ProfilePoint[]): ProfilePoint[] {
  const left = [...half].reverse().map((point) => ({ ...point, z: -point.z }));
  return [...left, ...half.filter((point) => point.z !== 0)];
}

export function shifted(profile: readonly ProfilePoint[], z: number, y: number): ProfilePoint[] {
  return profile.map((point) => ({ ...point, z: point.z + z, y: point.y + y }));
}

function profileDistances(profile: readonly ProfilePoint[]): number[] {
  let total = 0;
  return profile.map((point, index) => {
    const previous = profile[Math.max(0, index - 1)];
    total += Math.hypot(point.z - previous.z, point.y - previous.y);
    return total;
  });
}

export function profileStrip(
  profile: readonly ProfilePoint[],
  span: Span,
  mapped = false,
): BufferGeometry {
  const sink = new QuadSink();
  const tones = profile.map((point) => new Color(point.tone));
  const along = profileDistances(profile);
  profile.slice(1).forEach((end, index) => {
    const start = profile[index];
    const [v0, v1] = [along[index], along[index + 1]];
    sink.add(
      [
        [span.from, start.y, start.z],
        [span.from, end.y, end.z],
        [span.to, end.y, end.z],
        [span.to, start.y, start.z],
      ],
      [tones[index], tones[index + 1], tones[index + 1], tones[index]],
      mapped
        ? [
            [span.from, v0],
            [span.from, v1],
            [span.to, v1],
            [span.to, v0],
          ]
        : undefined,
    );
  });
  return sink.geometry();
}
