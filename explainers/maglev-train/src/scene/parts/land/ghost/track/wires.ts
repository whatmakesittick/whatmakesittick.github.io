import { BufferGeometry, Float32BufferAttribute, LineBasicMaterial, LineSegments } from 'three';
import { LINE_GROUP, registeredMaterial } from '../../../context';
import type { PartContext } from '../../../context';
import { WIRE_LINE } from '../finishes';
import { CATENARY, MAST, TRACK_PERIOD } from './constants';
import { sagAt, slotsOf } from './slots';
import type { SlotRange } from './slots';

const XYZ = 3;

function spanPositions(start: number, end: number): number[] {
  const { contactY, messengerY, sag, sagSegments, dropperShares } = CATENARY;
  const x = (share: number) => start + (end - start) * share;
  const messenger = (share: number) => messengerY - sagAt(share, sag);
  const sagging = Array.from({ length: sagSegments }, (_, index) => {
    const from = index / sagSegments;
    const to = (index + 1) / sagSegments;
    return [x(from), messenger(from), 0, x(to), messenger(to), 0];
  }).flat();
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

export function catenaryPositions(range: SlotRange): number[] {
  const masts = slotsOf(range).map((slot) => slot * TRACK_PERIOD + MAST.phase);
  return masts.slice(1).flatMap((end, index) => spanPositions(masts[index], end));
}

export function catenaryWires(context: PartContext, range: SlotRange): LineSegments {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(catenaryPositions(range), XYZ));
  const material = new LineBasicMaterial({ ...WIRE_LINE, transparent: true });
  const wires = new LineSegments(
    context.tracker.track(geometry),
    registeredMaterial(context, LINE_GROUP, material),
  );
  wires.name = 'ghostCatenary';
  return wires;
}
