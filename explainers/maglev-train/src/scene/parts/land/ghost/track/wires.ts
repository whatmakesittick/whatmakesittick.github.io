import type { LineSegments } from 'three';
import { LINE_GROUP } from '../../../context';
import type { PartContext } from '../../../context';
import { WIRE_LINE } from '../finishes';
import { lineSegments, polyline } from '../geometry/lines';
import type { Point3 } from '../geometry/lines';
import { CATENARY, MAST, TRACK_PERIOD } from './constants';

export function sagAt(share: number, sag: number): number {
  return 4 * sag * share * (1 - share);
}

function spanPositions(start: number, end: number): number[] {
  const { contactY, messengerY, sag, sagSegments, dropperShares } = CATENARY;
  const x = (share: number) => start + (end - start) * share;
  const messenger = (share: number) => messengerY - sagAt(share, sag);
  const shares = Array.from({ length: sagSegments + 1 }, (_, index) => index / sagSegments);
  const sagging = polyline(shares.map((share): Point3 => [x(share), messenger(share), 0]));
  const droppers = dropperShares.flatMap((share) => [
    x(share),
    messenger(share),
    0,
    x(share),
    contactY,
    0,
  ]);
  return [...sagging, ...droppers, start, contactY, 0, end, contactY, 0];
}

export function catenaryPositions(slots: readonly number[]): number[] {
  const masts = slots.map((slot) => slot * TRACK_PERIOD + MAST.phase);
  return masts.slice(1).flatMap((end, index) => spanPositions(masts[index], end));
}

export function catenaryWires(context: PartContext, slots: readonly number[]): LineSegments {
  const wires = lineSegments(context, LINE_GROUP, catenaryPositions(slots), WIRE_LINE);
  wires.name = 'ghostCatenary';
  return wires;
}
