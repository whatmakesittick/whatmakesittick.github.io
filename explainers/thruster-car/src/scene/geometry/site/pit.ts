import type { Vector3 } from 'three';
import type { Extent } from '@core/scene/regions';
import { framePoint, rampFrame } from './rampFrame';
import { CLEARANCE, DECK, RAIL_TOP, SPINE, ribBack } from './rampSpec';
import type { CrossPoint } from './sweep';

export interface Pit {
  x: Extent;
  z: Extent;
  floor: number;
}

export type GroundLevel = (x: number, z: number) => number;

export const PIT = {
  samples: 240,
  surface: 0.02,
  margin: 0.35,
  floorMargin: 0.3,
} as const;

const RUNWAY_TOP = 0;

function mirrored(points: readonly CrossPoint[]): CrossPoint[] {
  return points.flatMap(([across, depth]) => [
    [across, depth],
    [-across, depth],
  ]);
}

export function sweptCrossSection(): CrossPoint[] {
  const { halfWidth, thickness } = DECK;
  return mirrored([
    [halfWidth, RAIL_TOP],
    [halfWidth, -thickness],
    [SPINE.halfWidth, ribBack(0)],
    [halfWidth, ribBack(halfWidth)],
    [CLEARANCE.halfWidth, 0],
    [CLEARANCE.halfWidth, CLEARANCE.height],
  ]);
}

export function sunkenPoints(): Vector3[] {
  const section = sweptCrossSection();
  const sunken: Vector3[] = [];
  for (let index = 0; index <= PIT.samples; index += 1) {
    const frame = rampFrame(index / PIT.samples);
    section.forEach(([across, depth]) => {
      const point = framePoint(frame, across, depth);
      if (point.y < RUNWAY_TOP + PIT.surface) sunken.push(point);
    });
  }
  return sunken;
}

export function rampPit(): Pit | null {
  const sunken = sunkenPoints();
  if (sunken.length === 0) return null;
  const xs = sunken.map((point) => point.x);
  const zs = sunken.map((point) => point.z);
  const lowest = Math.min(...sunken.map((point) => point.y));
  return {
    x: [Math.min(...xs) - PIT.margin, Math.max(...xs) + PIT.margin],
    z: [Math.min(...zs) - PIT.margin, Math.max(...zs) + PIT.margin],
    floor: lowest - PIT.floorMargin,
  };
}

export function insidePit(pit: Pit | null, x: number, z: number): boolean {
  if (!pit) return false;
  return x > pit.x[0] && x < pit.x[1] && z > pit.z[0] && z < pit.z[1];
}

export function groundLevel(pit: Pit | null): GroundLevel {
  return (x, z) => (pit && insidePit(pit, x, z) ? pit.floor : RUNWAY_TOP);
}
