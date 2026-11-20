import type { AnchorId, PartId, Point, RegionId } from '../ids';
import { AXIS_HEIGHT_M, PERSON_HEIGHT_M, PERSON_POSITION, xAt } from './scale';

export interface PartSpan {
  from: number;
  to: number;
  radius: number;
}

export const PART_SPANS: Readonly<Record<Exclude<PartId, 'person'>, PartSpan>> = {
  nacelle: { from: 0, to: 1, radius: 2.35 },
  intakeLip: { from: 0, to: 0.04, radius: 2.35 },
  fanCase: { from: 0.04, to: 0.13, radius: 2 },
  fanBlades: { from: 0.05, to: 0.09, radius: 1.7 },
  spinner: { from: 0.03, to: 0.08, radius: 0.5 },
  guideVanes: { from: 0.13, to: 0.16, radius: 1.6 },
  splitter: { from: 0.13, to: 0.16, radius: 0.9 },
  booster: { from: 0.13, to: 0.24, radius: 0.85 },
  compressorRotor: { from: 0.24, to: 0.53, radius: 0.6 },
  compressorStator: { from: 0.24, to: 0.53, radius: 0.6 },
  compressor: { from: 0.24, to: 0.53, radius: 0.6 },
  outerShaft: { from: 0.13, to: 0.69, radius: 0.2 },
  innerShaft: { from: 0.05, to: 0.88, radius: 0.1 },
  gearbox: { from: 0.24, to: 0.46, radius: 0.35 },
  starter: { from: 0.46, to: 0.52, radius: 0.35 },
  diffuser: { from: 0.53, to: 0.56, radius: 0.7 },
  fuelNozzles: { from: 0.55, to: 0.57, radius: 0.6 },
  combustorLiner: { from: 0.55, to: 0.63, radius: 0.75 },
  combustor: { from: 0.53, to: 0.63, radius: 0.8 },
  hpTurbine: { from: 0.63, to: 0.69, radius: 0.8 },
  lpTurbine: { from: 0.69, to: 0.88, radius: 0.9 },
  bypassDuct: { from: 0.16, to: 0.88, radius: 1.9 },
  coldNozzle: { from: 0.88, to: 1, radius: 2 },
  hotNozzle: { from: 0.88, to: 1, radius: 0.6 },
  coldStream: { from: 0.16, to: 1, radius: 1.7 },
  hotStream: { from: 0.5, to: 1, radius: 0.6 },
  reverser: { from: 0.8, to: 0.95, radius: 2.3 },
  cascades: { from: 0.82, to: 0.92, radius: 2.2 },
};

export function partCentre(id: Exclude<PartId, 'person'>): Point {
  const { from, to, radius } = PART_SPANS[id];
  return [xAt((from + to) / 2), AXIS_HEIGHT_M + radius, 0];
}

export const PERSON_CENTRE: Point = [PERSON_POSITION[0], PERSON_HEIGHT_M / 2, PERSON_POSITION[2]];

export function partAnchorPoint(id: PartId): Point {
  return id === 'person' ? PERSON_CENTRE : partCentre(id);
}

function onAxis(fraction: number): Point {
  return [xAt(fraction), AXIS_HEIGHT_M, 0];
}

export const ANCHOR_POINTS: Readonly<Record<AnchorId, Point>> = {
  fanFace: onAxis(0.05),
  splitter: onAxis(0.14),
  compressorMid: onAxis(0.38),
  combustorMid: onAxis(0.58),
  hpTurbine: onAxis(0.66),
  lpTurbine: onAxis(0.78),
  nozzleExit: onAxis(1),
  reverserCascade: [xAt(0.87), AXIS_HEIGHT_M + 2.2, 0],
  person: PERSON_CENTRE,
  hotMarker: onAxis(0),
  coldMarker: [xAt(0), AXIS_HEIGHT_M + 1.4, 0],
};

export interface RegionBounds {
  min: Point;
  max: Point;
}

function span(from: number, to: number, radius: number): RegionBounds {
  return {
    min: [xAt(from), AXIS_HEIGHT_M - radius, -radius],
    max: [xAt(to), AXIS_HEIGHT_M + radius, radius],
  };
}

const PLUME_M = 1.2;
const ENGINE_FRAMING_RADIUS = 2.4;

export const REGION_BOUNDS: Readonly<Record<RegionId, RegionBounds>> = {
  fanFace: span(0, 0.13, ENGINE_FRAMING_RADIUS),
  compressor: span(0.13, 0.55, 0.95),
  combustor: span(0.5, 0.65, 0.95),
  turbines: span(0.6, 0.92, 1),
  engineSide: {
    min: [xAt(0) - PLUME_M, AXIS_HEIGHT_M - ENGINE_FRAMING_RADIUS, -ENGINE_FRAMING_RADIUS],
    max: [xAt(1) + PLUME_M, AXIS_HEIGHT_M + ENGINE_FRAMING_RADIUS, ENGINE_FRAMING_RADIUS],
  },
  rear: span(0.7, 1.15, ENGINE_FRAMING_RADIUS),
  all: {
    min: [PERSON_POSITION[0] - 1, 0, -ENGINE_FRAMING_RADIUS],
    max: [xAt(1) + PLUME_M, AXIS_HEIGHT_M + ENGINE_FRAMING_RADIUS, PERSON_POSITION[2] + 1],
  },
};
