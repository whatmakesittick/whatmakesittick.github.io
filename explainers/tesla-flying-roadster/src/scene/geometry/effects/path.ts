import { Vector3 } from 'three';

function pointAlong(path: readonly Vector3[], lengths: readonly number[], at: number): Vector3 {
  let segment = 1;
  while (segment < lengths.length - 1 && lengths[segment] < at) segment++;
  const start = lengths[segment - 1];
  const span = lengths[segment] - start;
  const share = span > 0 ? (at - start) / span : 0;
  return new Vector3().lerpVectors(path[segment - 1], path[segment], share);
}

export function cumulativeLengths(path: readonly Vector3[]): number[] {
  const lengths = [0];
  for (let index = 1; index < path.length; index++) {
    lengths.push(lengths[index - 1] + path[index].distanceTo(path[index - 1]));
  }
  return lengths;
}

export function evenlySpaced(path: readonly Vector3[], spacing: number): Vector3[] {
  if (path.length < 2) return path.map((point) => point.clone());
  const lengths = cumulativeLengths(path);
  const total = lengths[lengths.length - 1];
  const steps = Math.max(1, Math.round(total / spacing));
  return Array.from({ length: steps + 1 }, (_, index) =>
    pointAlong(path, lengths, (total * index) / steps),
  );
}
