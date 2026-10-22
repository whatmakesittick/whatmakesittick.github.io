import type { Extent, RegionSpec } from '@core/scene/regions';
import type { AnchorId, Point, RegionId } from '../ids';
import { CLEARANCE_MM, GAP_MM, GUIDE_GAP_MM, LINE_M, POLE_PITCH_M } from './constants';
import { mm } from './scale';

export const SIDE_SIGNS = [-1, 1] as const;

export const GUIDEWAY_TOP = 10.2;
export const STATOR_BOTTOM = 9.75;
export const BEAM_M = 24.8;
export const STATOR_PACK_M = 1.03;

export const PIER = { width: 1.8, depth: 1.8, height: 8.0 } as const;

const GIRDER_HEIGHT = 2.2;

export const GIRDER = {
  height: GIRDER_HEIGHT,
  topWidth: 2.8,
  cantileverDepth: 0.45,
  bottom: GUIDEWAY_TOP - GIRDER_HEIGHT,
} as const;

const STATOR_HEIGHT = 0.1;

export const STATOR = {
  sideZ: 1.25,
  width: 0.18,
  height: STATOR_HEIGHT,
  top: STATOR_BOTTOM + STATOR_HEIGHT,
} as const;

export const GUIDANCE_RAIL = { faceZ: 1.4, height: 0.3, centreY: 9.62 } as const;

function total(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0);
}

export const SECTION_LENGTHS = [27.0, 24.8, 24.8, 24.8, 24.8, 27.0] as const;
export const TRAIN_LENGTH = total(SECTION_LENGTHS);

export const TRAIN = {
  sectionLengths: SECTION_LENGTHS,
  length: TRAIN_LENGTH,
  width: 3.7,
  height: 4.2,
  noseX: TRAIN_LENGTH / 2,
  tailX: -TRAIN_LENGTH / 2,
  bodyBottom: GUIDEWAY_TOP + mm(CLEARANCE_MM),
  roof: GUIDEWAY_TOP + 3.4,
  armBottom: GUIDEWAY_TOP - 0.8,
} as const;

function sectionExtent(index: number): Extent {
  const front = TRAIN.noseX - total(SECTION_LENGTHS.slice(0, index));
  return [front - SECTION_LENGTHS[index], front];
}

export const SECTION_EXTENTS: readonly Extent[] = SECTION_LENGTHS.map((_, index) =>
  sectionExtent(index),
);

const SUPPORT_MAGNET_WIDTH = 0.22;

export const MAGNETS = {
  moduleLength: 3.1,
  support: {
    sideZ: STATOR.sideZ,
    top: STATOR_BOTTOM - mm(GAP_MM),
    height: 0.25,
    width: SUPPORT_MAGNET_WIDTH,
  },
  guidance: {
    faceZ: GUIDANCE_RAIL.faceZ + mm(GUIDE_GAP_MM),
    centreY: GUIDANCE_RAIL.centreY,
    height: GUIDANCE_RAIL.height,
    depth: 0.12,
  },
  eddyPerSection: 2,
} as const;

export const REST_GAP_MM = 30;
export const LIFT_TRAVEL_MM = REST_GAP_MM - GAP_MM;

export const SKIDS = {
  perSection: 4,
  stripZ: 1.1,
  height: mm(CLEARANCE_MM - LIFT_TRAVEL_MM),
  length: 0.9,
  width: 0.25,
} as const;

export const STATION_IDS = ['longyangRoad', 'airport'] as const;
export type StationId = (typeof STATION_IDS)[number];

export const STATIONS = {
  line: { longyangRoad: 0, airport: LINE_M },
  platformLength: 180,
  platformFloor: GUIDEWAY_TOP + 1.1,
} as const satisfies {
  line: Readonly<Record<StationId, number>>;
  platformLength: number;
  platformFloor: number;
};

export const VIEW_AHEAD_M = 1200;
export const VIEW_BEHIND_M = 600;
export const FIELD_PERIOD_M = 200;

export const SECTION_M = 1200;
export const SECTION_COUNT = 25;
export const SUBSTATIONS = [8000, 22000] as const;

export const INSET = {
  width: 3.4,
  height: 1.6,
  alongScale: 3,
  gapScale: 20,
  shownMetres: STATOR_PACK_M,
} as const;

const INSET_X = 52;
const ARM_ANCHOR_Y = 9.7;

export const INSET_CENTRE: Point = [INSET_X, 12.6, -4.2];
export const ARM_ANCHOR: Point = [INSET_X, ARM_ANCHOR_Y, -STATOR.sideZ];

export const CUT_X = 60;
export const LINE_UP_SPACING = 7.5;
export const GHOST_TRACK_Z = 14;

export const LINE_UP = {
  sliceLength: 6,
  plinthTop: GUIDEWAY_TOP,
  scmaglev: { width: 2.9, height: 3.1, gapMm: 100 },
} as const;

const FIELD_WAVELENGTH_M = 2 * POLE_PITCH_M;
const DRAWN_WAVELENGTH_STRETCH = 4;

export const WAVE_DRAWN_WAVELENGTH_M = DRAWN_WAVELENGTH_STRETCH * FIELD_WAVELENGTH_M;

const REAR_SECTION_COUNT = 2;
const CUT_FACE_DEPTH_M = 1;

const TRAIN_HEIGHT_SPAN: Extent = [TRAIN.armBottom, TRAIN.roof];
const TRAIN_WIDTH_SPAN: Extent = [-TRAIN.width / 2, TRAIN.width / 2];
const GUIDEWAY_HEIGHT_SPAN: Extent = [GIRDER.bottom, TRAIN.roof];
const LINE_UP_HALF_SPAN = LINE_UP_SPACING + TRAIN.width / 2;
const LEAD_SECTION = SECTION_EXTENTS[0];
const REAR_START = SECTION_EXTENTS[SECTION_EXTENTS.length - 1][0];
const REAR_END = SECTION_EXTENTS[SECTION_EXTENTS.length - REAR_SECTION_COUNT][1];

export const REGION_SPECS: Readonly<Record<RegionId, RegionSpec>> = {
  train: { x: [TRAIN.tailX, TRAIN.noseX], y: TRAIN_HEIGHT_SPAN, z: TRAIN_WIDTH_SPAN },
  front: { x: LEAD_SECTION, y: TRAIN_HEIGHT_SPAN, z: TRAIN_WIDTH_SPAN },
  arm: {
    x: [INSET_X - INSET.width / 2, INSET_X + INSET.width / 2],
    y: [TRAIN.armBottom, INSET_CENTRE[1] + INSET.height / 2],
    z: [INSET_CENTRE[2], -(MAGNETS.support.sideZ - MAGNETS.support.width / 2)],
  },
  crossSection: {
    x: [CUT_X - CUT_FACE_DEPTH_M, CUT_X],
    y: GUIDEWAY_HEIGHT_SPAN,
    z: TRAIN_WIDTH_SPAN,
  },
  rear: { x: [REAR_START, REAR_END], y: TRAIN_HEIGHT_SPAN, z: TRAIN_WIDTH_SPAN },
  lineUp: {
    x: [CUT_X - LINE_UP.sliceLength, CUT_X],
    y: GUIDEWAY_HEIGHT_SPAN,
    z: [-LINE_UP_HALF_SPAN, LINE_UP_HALF_SPAN],
  },
};

function middle([from, to]: Extent): number {
  return (from + to) / 2;
}

const BODY_MIDDLE_Y = middle([TRAIN.bodyBottom, TRAIN.roof]);

export const ANCHOR_POINTS: Readonly<Record<AnchorId, Point>> = {
  nose: [TRAIN.noseX, BODY_MIDDLE_Y, 0],
  tail: [TRAIN.tailX, BODY_MIDDLE_Y, 0],
  arm: ARM_ANCHOR,
  inset: INSET_CENTRE,
  cut: [CUT_X, middle(TRAIN_HEIGHT_SPAN), 0],
  lineUp: [CUT_X, middle(GUIDEWAY_HEIGHT_SPAN), 0],
};
