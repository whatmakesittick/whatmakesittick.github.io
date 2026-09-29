import { SplineCurve, Vector2 } from 'three';
import { wallRadius } from '../../model';
import type { ProfilePoint, Strand } from './revolve';

export function smoothStrand(controls: readonly ProfilePoint[], samples: number): ProfilePoint[] {
  const curve = new SplineCurve(controls.map(([radius, y]) => new Vector2(radius, y)));
  return curve.getPoints(samples).map((point) => [Math.max(0, point.x), point.y] as const);
}

export function lineStrand(from: ProfilePoint, to: ProfilePoint, samples = 1): ProfilePoint[] {
  return Array.from({ length: samples + 1 }, (_, index) => {
    const share = index / samples;
    return [from[0] + (to[0] - from[0]) * share, from[1] + (to[1] - from[1]) * share] as const;
  });
}

export function arcStrand(
  centre: ProfilePoint,
  radius: number,
  fromAngle: number,
  toAngle: number,
  steps: number,
): ProfilePoint[] {
  return Array.from({ length: steps + 1 }, (_, index) => {
    const angle = fromAngle + ((toAngle - fromAngle) * index) / steps;
    return [
      Math.max(0, centre[0] + radius * Math.cos(angle)),
      centre[1] + radius * Math.sin(angle),
    ] as const;
  });
}

export function circleStrand(centre: ProfilePoint, radius: number, steps: number): ProfilePoint[] {
  return arcStrand(centre, radius, Math.PI * 2, 0, steps);
}

export function wallStrand(offset: number, from: number, to: number, samples: number): Strand {
  return Array.from({ length: samples + 1 }, (_, index) => {
    const y = from + ((to - from) * index) / samples;
    return [wallRadius(y) + offset, y] as const;
  });
}

export function reversed(strand: Strand): Strand {
  return [...strand].reverse();
}
