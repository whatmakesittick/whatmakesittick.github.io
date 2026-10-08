import { Vector2 } from 'three';
import type { SweepCentre, SweepStation } from '../../geometry/sweep';
import { NACELLE, SHAFT_Y } from './constants';

const ARC_STEPS = 6;
const QUARTER = Math.PI / 2;

export const SHELL = {
  roofCorner: 0.62,
  floorCorner: 0.32,
  innerScale: 0.955,
  coolerFrontX: 4.0,
} as const;

export const SHELL_CENTRE: SweepCentre = { y: SHAFT_Y, z: 0 };

export const SHELL_STATIONS: readonly SweepStation[] = [
  { x: NACELLE.minX, scale: 0.84 },
  { x: NACELLE.minX + 0.22, scale: 0.92 },
  { x: NACELLE.minX + 0.6, scale: 0.975 },
  { x: NACELLE.minX + 1.2, scale: 1 },
  { x: NACELLE.maxX - 0.3, scale: 1 },
  { x: NACELLE.maxX, scale: 0.965 },
];

function arc(
  centreZ: number,
  centreY: number,
  radius: number,
  from: number,
  to: number,
): Vector2[] {
  return Array.from({ length: ARC_STEPS + 1 }, (_, step) => {
    const angle = from + ((to - from) * step) / ARC_STEPS;
    return new Vector2(centreZ + radius * Math.cos(angle), centreY + radius * Math.sin(angle));
  });
}

const W = NACELLE.halfWidth;
const TOP = NACELLE.maxY;
const BOTTOM = NACELLE.minY;
const R = SHELL.roofCorner;
const F = SHELL.floorCorner;

export const PANEL_PROFILES = {
  roofPlus: [new Vector2(0, TOP), ...arc(W - R, TOP - R, R, QUARTER, 0)],
  wallPlus: [new Vector2(W, TOP - R), new Vector2(W, BOTTOM + F)],
  floor: [
    ...arc(W - F, BOTTOM + F, F, 0, -QUARTER),
    ...arc(-W + F, BOTTOM + F, F, -QUARTER, -2 * QUARTER),
  ],
  wallMinus: [new Vector2(-W, BOTTOM + F), new Vector2(-W, TOP - R)],
  roofMinus: [...arc(-W + R, TOP - R, R, 2 * QUARTER, QUARTER), new Vector2(0, TOP)],
} as const satisfies Record<string, readonly Vector2[]>;

export type PanelId = keyof typeof PANEL_PROFILES;

const MERGE_DISTANCE = 1e-6;

export function perimeter(): Vector2[] {
  const points = Object.values(PANEL_PROFILES).flatMap((profile) => profile);
  return points.filter(
    (point, index) => point.distanceTo(points[(index + 1) % points.length]) > MERGE_DISTANCE,
  );
}
