import type { RoutePose } from '../../ids';

export interface TrailSample {
  x: number;
  z: number;
  heading: number;
  behind: number;
  live: boolean;
}

export function trailSpacing(count: number, length: number, power: number): number[] {
  return Array.from({ length: count }, (_, index) => length * (index / (count - 1)) ** power);
}

export function routeTrail(
  poseAt: (distance: number) => RoutePose,
  distance: number,
  offset: number,
  spacing: readonly number[],
): TrailSample[] {
  return spacing.map((behind) => {
    const along = distance - offset - behind;
    const pose = poseAt(Math.max(along, 0));
    return {
      x: pose.position[0],
      z: pose.position[2],
      heading: pose.heading,
      behind,
      live: along >= 0,
    };
  });
}

export function straightTrail(
  pose: RoutePose,
  offset: number,
  spacing: readonly number[],
): TrailSample[] {
  const dx = Math.cos(pose.heading);
  const dz = Math.sin(pose.heading);
  return spacing.map((behind) => ({
    x: pose.position[0] - dx * (offset + behind),
    z: pose.position[2] - dz * (offset + behind),
    heading: pose.heading,
    behind,
    live: true,
  }));
}

export function pathTrail(
  history: readonly RoutePose[],
  offset: number,
  spacing: readonly number[],
): TrailSample[] {
  const lengths = [0];
  for (let index = 1; index < history.length; index += 1) {
    const [a, b] = [history[index - 1].position, history[index].position];
    lengths.push(lengths[index - 1] + Math.hypot(b[0] - a[0], b[2] - a[2]));
  }
  const total = lengths[lengths.length - 1];
  return spacing.map((behind) => {
    const target = behind + offset;
    let at = 1;
    while (at < lengths.length - 1 && lengths[at] < target) at += 1;
    const span = Math.max(lengths[at] - lengths[at - 1], 1e-9);
    const share = Math.min(Math.max((target - lengths[at - 1]) / span, 0), 1);
    const [a, b] = [history[at - 1], history[at] ?? history[at - 1]];
    return {
      x: a.position[0] + (b.position[0] - a.position[0]) * share,
      z: a.position[2] + (b.position[2] - a.position[2]) * share,
      heading: a.heading + (b.heading - a.heading) * share,
      behind,
      live: target <= total,
    };
  });
}
