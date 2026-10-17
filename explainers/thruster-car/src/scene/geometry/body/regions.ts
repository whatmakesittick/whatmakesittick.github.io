import { BODY_X } from './profile';
import type { SegmentId } from './section';

export const BODY_REGIONS = [
  'paint',
  'roof',
  'doorRight',
  'doorLeft',
  'glass',
  'windowRight',
  'frame',
  'trim',
  'dark',
] as const;

export type BodyRegion = (typeof BODY_REGIONS)[number];

export type BodySide = 'right' | 'left';

export interface CellSpot {
  segment: SegmentId;
  row: number;
  x: number;
  side: BodySide;
}

export const VENT_ROWS = [2, 5] as const;

function within(x: number, from: number, to: number): boolean {
  return x >= Math.min(from, to) && x <= Math.max(from, to);
}

function inRows(row: number, [from, to]: readonly [number, number]): boolean {
  return row >= from && row < to;
}

function door(side: BodySide): BodyRegion {
  return side === 'right' ? 'doorRight' : 'doorLeft';
}

function isDoor(x: number): boolean {
  return within(x, BODY_X.doorRear, BODY_X.doorFront);
}

function sideRegion({ row, x, side }: CellSpot): BodyRegion {
  if (within(x, BODY_X.ventRear, BODY_X.ventFront) && inRows(row, VENT_ROWS)) return 'dark';
  return isDoor(x) ? door(side) : 'paint';
}

function glassRegion({ x, side }: CellSpot): BodyRegion {
  if (within(x, BODY_X.doorRear, BODY_X.windowRear)) return 'frame';
  if (!within(x, BODY_X.windowRear, BODY_X.cowl)) return 'paint';
  return side === 'right' ? 'windowRight' : 'glass';
}

function crownRegion({ x }: CellSpot): BodyRegion {
  if (within(x, BODY_X.headerFrame, BODY_X.cowlFrame)) return 'glass';
  if (within(x, BODY_X.roofRear, BODY_X.header)) return 'roof';
  if (within(x, BODY_X.rearGlass, BODY_X.rearHeaderFrame)) return 'glass';
  if (within(x, BODY_X.deck, BODY_X.cowl)) return 'frame';
  return 'paint';
}

export function classifyCell(spot: CellSpot): BodyRegion {
  switch (spot.segment) {
    case 'floor':
    case 'wellWall':
    case 'wellRoof':
      return 'dark';
    case 'sill':
      return 'trim';
    case 'side':
      return sideRegion(spot);
    case 'shoulder':
      return isDoor(spot.x) ? door(spot.side) : 'paint';
    case 'belt':
      return within(spot.x, BODY_X.doorRear, BODY_X.cowl) ? 'frame' : 'paint';
    case 'glass':
      return glassRegion(spot);
    case 'rail':
      return within(spot.x, BODY_X.deck, BODY_X.cowl) ? 'frame' : 'paint';
    case 'crown':
      return crownRegion(spot);
  }
}
