import type { Point } from '../../../ids';
import { INSET, JACK_ANCHOR_Y, JACK_Z, jackAnchor, keyX } from '../../../model';
import type { Planar } from '../ghosts/shapes';

const WINDOW_SHIFT: Planar = [-0.001, -0.006];
const PLACE = { across: -0.03, bottom: 0.95, front: -0.5 } as const;
const CLOSE_PLACE = { across: 0.708, y: 0.705, z: -0.449 } as const;

export type InsetPlace = 'open' | 'close';
const LABEL_INDENT = 0.015;

export const WINDOW = {
  y: JACK_ANCHOR_Y + WINDOW_SHIFT[0],
  z: JACK_Z + WINDOW_SHIFT[1],
  height: INSET.height / INSET.scale,
  width: INSET.width / INSET.scale,
} as const;

export const PANEL = {
  rim: 0.002,
  corner: 0.006,
  back: 0.003,
  ringRadius: 0.005,
  lift: 0.012,
} as const;

export function panelCentre(key: number, place: InsetPlace = 'open'): Point {
  if (place === 'close') return [keyX(key) + CLOSE_PLACE.across, CLOSE_PLACE.y, CLOSE_PLACE.z];
  return [keyX(key) + PLACE.across, PLACE.bottom + INSET.height / 2, PLACE.front - INSET.width / 2];
}

export function labelPoint([x, y, z]: Point, place: InsetPlace = 'open'): Point {
  const edge = place === 'close' ? INSET.width / 2 - LABEL_INDENT : LABEL_INDENT - INSET.width / 2;
  return [x, y + INSET.height / 2, z + edge];
}

export function drawnPoint([, centreY, centreZ]: Point, [y, z]: Planar): Planar {
  return [centreY + INSET.scale * (y - WINDOW.y), centreZ + INSET.scale * (z - WINDOW.z)];
}

export function clipBounds([, y, z]: Point): [
  minY: number,
  maxY: number,
  minZ: number,
  maxZ: number,
] {
  const halfHeight = INSET.height / 2 - PANEL.rim;
  const halfWidth = INSET.width / 2 - PANEL.rim;
  return [y - halfHeight, y + halfHeight, z - halfWidth, z + halfWidth];
}

export interface Leader {
  start: Point;
  end: Point;
  ring: Point;
}

export function leaderFor(key: number, place: InsetPlace = 'open'): Leader {
  const centre = panelCentre(key, place);
  const anchor = jackAnchor(key);
  const [, drawnZ] = drawnPoint(centre, [anchor[1], anchor[2]]);
  const start: Point = [centre[0] - INSET.depth / 2, centre[1] - INSET.height / 2, drawnZ];
  const ring: Point = [anchor[0] - PANEL.lift, anchor[1], anchor[2]];
  const dy = start[1] - ring[1];
  const dz = start[2] - ring[2];
  const reach = PANEL.ringRadius / Math.hypot(dy, dz);
  return { start, ring, end: [ring[0], ring[1] + dy * reach, ring[2] + dz * reach] };
}
