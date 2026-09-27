import { Vector2 } from 'three';
import type { BufferGeometry } from 'three';
import { SEGMENTS } from '../constants';
import { latheUpright } from './lathe';

const SURFACE_STEPS = 10;
const EDGE_SHARE = 0.12;

function surface(radius: number, sag: number, edge: number, side: number): Vector2[] {
  return Array.from({ length: SURFACE_STEPS + 1 }, (_, index) => {
    const share = index / SURFACE_STEPS;
    return new Vector2(radius * share, side * (edge + sag * (1 - share * share)));
  });
}

function lensProfile(radius: number, bottomSag: number, topSag: number, edge: number): Vector2[] {
  const bottom = surface(radius, bottomSag, edge, -1);
  const top = surface(radius, topSag, edge, 1).reverse();
  return [...bottom, ...top];
}

export function biconvexLens(radius: number, thickness: number): BufferGeometry {
  const edge = (thickness * EDGE_SHARE) / 2;
  const sag = thickness / 2 - edge;
  return latheUpright(lensProfile(radius, sag, sag, edge), SEGMENTS.round);
}
