import type { Extent, RegionSpec } from '@core/scene/regions';
import type { AnchorId, Point, RegionId } from '../ids';
import { POWER_SHELVES, RACKS_PER_ROW } from './constants';

export interface Dimensions {
  width: number;
  height: number;
  depth: number;
}

export interface BoxSpec {
  base: Point;
  size: Point;
}

export type Facing = -1 | 1;

export interface RowSpec {
  index: number;
  block: number;
  z: number;
  startX: number;
  facing: Facing;
}

export interface RackSpec {
  row: number;
  slot: number;
  base: Point;
  facing: Facing;
}

export type FixedAnchorId = Exclude<AnchorId, 'joule'>;

function middle([from, to]: Extent): number {
  return (from + to) / 2;
}

function around(centre: number, size: number): Extent {
  return [centre - size / 2, centre + size / 2];
}

function count(length: number): number[] {
  return Array.from({ length }, (_, index) => index);
}

export function standing(base: Point, { width, height, depth }: Dimensions): BoxSpec {
  return { base, size: [width, height, depth] };
}

export function spanning(x: Extent, y: Extent, z: Extent): BoxSpec {
  return { base: [middle(x), y[0], middle(z)], size: [x[1] - x[0], y[1] - y[0], z[1] - z[0]] };
}

export function boxCentre({ base: [x, y, z], size }: BoxSpec): Point {
  return [x, y + size[1] / 2, z];
}

export function boxTop({ base: [x, y, z], size }: BoxSpec): Point {
  return [x, y + size[1], z];
}

export function boxSpan({ base: [x, y, z], size: [width, height, depth] }: BoxSpec): RegionSpec {
  return { x: around(x, width), y: [y, y + height], z: around(z, depth) };
}

export const GROUND_Y = 0;

export const GRID_LINE = {
  fromX: -110,
  toX: -72,
  y: 12,
  z: -4,
  conductors: 3,
  conductorGap: 1.5,
} as const;

export const GANTRY: BoxSpec = standing([GRID_LINE.toX, GROUND_Y, GRID_LINE.z], {
  width: 0.6,
  height: 13,
  depth: 6,
});

export const SUBSTATION_YARD: BoxSpec = standing([-62, GROUND_Y, -4], {
  width: 18,
  height: 2.4,
  depth: 16,
});

export const TRANSFORMER: Dimensions = { width: 5, height: 4.5, depth: 4 };

export const TRANSFORMERS: readonly BoxSpec[] = [-8, 0].map((z) =>
  standing([-62, GROUND_Y, z], TRANSFORMER),
);

export const GENERATOR_COUNT = 12;
export const GENSET: Dimensions = { width: 7.0, height: 3.0, depth: 2.34 };
export const GENERATOR_ROW_Z = [-21.5, -26.5] as const;

const GENERATOR_FIRST_X = -27;
const GENERATOR_PITCH_X = 9;
const GENERATORS_PER_ROW = GENERATOR_COUNT / GENERATOR_ROW_Z.length;

export const GENSETS: readonly BoxSpec[] = GENERATOR_ROW_Z.flatMap((z) =>
  count(GENERATORS_PER_ROW).map((column) =>
    standing([GENERATOR_FIRST_X + column * GENERATOR_PITCH_X, GROUND_Y, z], GENSET),
  ),
);

export const BUILDING = { x: [-36, 36], z: [-15, 15] } as const satisfies {
  x: Extent;
  z: Extent;
};
export const WALL_THICKNESS = 0.3;
export const CEILING_Y = 6.0;
export const ROOF_Y = 7.0;
export const ROOM_WALL_X = -24;

export const ELECTRICAL_ROOM = { x: [BUILDING.x[0], ROOM_WALL_X], z: BUILDING.z } as const;
export const HALL = { x: [ROOM_WALL_X, BUILDING.x[1]], z: BUILDING.z } as const;

export const CABINET_HEIGHT = 2.2;

const CABINET_X: Extent = [-34, -27];
const CABINET_Y: Extent = [GROUND_Y, CABINET_HEIGHT];

export const UPS: BoxSpec = spanning(CABINET_X, CABINET_Y, [-12, -6]);
export const BATTERIES: BoxSpec = spanning(CABINET_X, CABINET_Y, [-4, 4]);
export const SWITCHGEAR: BoxSpec = spanning(CABINET_X, CABINET_Y, [6, 12]);
export const MV_ENTRY: Point = [BUILDING.x[0], 0.5, -4];
export const ROOM_TRAY_Y = 2.6;

export const RACK: Dimensions = { width: 0.6, height: 2.24, depth: 1.068 };
export const CDU: Dimensions = { width: 0.75, height: 2.0, depth: 1.2 };
export const NETWORK_RACK: Dimensions = { width: 0.6, height: 2.0, depth: RACK.depth };

export const AISLE = { cold: 1.2, hot: 0.9 } as const;
export const BLOCK_START_X = [-12.0, 12.0] as const;
export const ROW_Z = [-7.338, -5.37, -3.102, -1.134, 1.134, 3.102, 5.37, 7.338] as const;
export const ROWS_PER_BLOCK = ROW_Z.length;
export const RACK_RUN_M = RACKS_PER_ROW * RACK.width;
export const ROW_LENGTH_M = RACK_RUN_M + CDU.width + NETWORK_RACK.width;

function facingOf(rowInBlock: number): Facing {
  return rowInBlock % 2 === 0 ? -1 : 1;
}

export const ROWS: readonly RowSpec[] = BLOCK_START_X.flatMap((startX, block) =>
  ROW_Z.map((z, rowInBlock) => ({
    index: block * ROWS_PER_BLOCK + rowInBlock,
    block,
    z,
    startX,
    facing: facingOf(rowInBlock),
  })),
);

export function rackBase(row: RowSpec, slot: number): Point {
  return [row.startX + (slot + 0.5) * RACK.width, GROUND_Y, row.z];
}

export function behind(row: RowSpec, offset: number): number {
  return row.z - row.facing * offset;
}

export const HALL_RACKS: readonly RackSpec[] = ROWS.flatMap((row) =>
  count(RACKS_PER_ROW).map((slot) => ({
    row: row.index,
    slot,
    base: rackBase(row, slot),
    facing: row.facing,
  })),
);

export const CDUS: readonly BoxSpec[] = ROWS.map((row) =>
  standing([row.startX + RACK_RUN_M + CDU.width / 2, GROUND_Y, row.z], CDU),
);

export const LEAF_RACKS: readonly BoxSpec[] = ROWS.map((row) =>
  standing(
    [row.startX + RACK_RUN_M + CDU.width + NETWORK_RACK.width / 2, GROUND_Y, row.z],
    NETWORK_RACK,
  ),
);

export const SUBJECT_ROW_INDEX = 4;
export const SUBJECT_SLOT = 0;
export const SUBJECT_ROW: RowSpec = ROWS[SUBJECT_ROW_INDEX];
export const SUBJECT_RACK: Point = rackBase(SUBJECT_ROW, SUBJECT_SLOT);
export const SUBJECT_RACK_BOX: BoxSpec = standing(SUBJECT_RACK, RACK);
export const SUBJECT_CDU: BoxSpec = CDUS[SUBJECT_ROW_INDEX];
export const SUBJECT_LEAF: BoxSpec = LEAF_RACKS[SUBJECT_ROW_INDEX];

export const RACK_STACK = {
  base: [GROUND_Y, 0.1],
  lowerShelves: [0.1, 0.34],
  lowerCompute: [0.34, 0.82],
  switchTrays: [0.82, 1.3],
  upperCompute: [1.3, 1.9],
  upperShelves: [1.9, 2.14],
} as const satisfies Record<string, Extent>;

export const SHELVES_PER_GROUP = POWER_SHELVES / 2;
export const LOWER_COMPUTE_TRAYS = 8;
export const UPPER_COMPUTE_TRAYS = 10;
export const COMPUTE_TRAY_PITCH = 0.06;
export const SUBJECT_TRAY_INDEX = 5;
export const SUBJECT_TRAY_Y = 1.6;

export const BUSBAR = { z: 1.6, lower: [0.1, 1.1], upper: [1.3, 2.14] } as const satisfies {
  z: number;
  lower: Extent;
  upper: Extent;
};

const MANIFOLD_SIDE_M = 0.22;

export const MANIFOLD = {
  z: 1.62,
  supplyX: SUBJECT_RACK[0] - MANIFOLD_SIDE_M,
  returnX: SUBJECT_RACK[0] + MANIFOLD_SIDE_M,
} as const;

export const CHIP_ANCHOR: Point = [SUBJECT_RACK[0], 1.62, 1.0];

export const INSET = { width: 2.0, height: 1.2, depth: 0.05, shownWidth: 0.2 } as const;
export const INSET_SCALE = 10;
export const INSET_CENTRE: Point = [-13.6, 3.3, 1.1];
export const INSET_NORMAL: Point = [-1, 0, 0];

export const BUSWAY = { mainY: 4.2, mainZ: 0, endX: -12.3, rowY: 3.0 } as const;
export const TAP_BOX: Point = [SUBJECT_RACK[0], BUSWAY.rowY, SUBJECT_RACK[2]];

export const ROW_PIPE = { y: 2.6, z: MANIFOLD.z } as const;

export const RISER = {
  x: SUBJECT_CDU.base[0],
  z: MANIFOLD.z,
  bottom: CDU.height,
  top: ROOF_Y,
} as const;

export const ROOF_PIPE_Y = 7.5;

export const CHILLER: BoxSpec = standing([2, ROOF_Y, -9], { width: 10, height: 2.6, depth: 3 });

export const DRY_COOLER: Dimensions = { width: 4.4, height: 2.2, depth: 2.4 };
export const DRY_COOLER_ROW_Z = [-8, 4] as const;
export const DRY_COOLER_X: Extent = [12, 34];
export const DRY_COOLERS_PER_ROW = 5;

export const DRY_COOLERS: readonly BoxSpec[] = DRY_COOLER_ROW_Z.flatMap((z) =>
  count(DRY_COOLERS_PER_ROW).map((column) =>
    standing([DRY_COOLER_X[0] + (column + 0.5) * DRY_COOLER.width, ROOF_Y, z], DRY_COOLER),
  ),
);

export const ROOF_HEADER_Z = middle(DRY_COOLER_ROW_Z);
export const DRY_COOLER_BANK_CENTRE: Point = [
  middle(DRY_COOLER_X),
  ROOF_Y + DRY_COOLER.height / 2,
  ROOF_HEADER_Z,
];
export const PLUME_TOP: Point = [middle(DRY_COOLER_X), 16, ROOF_HEADER_Z];

export const AIR_HANDLER: Dimensions = { width: 1.0, height: 2.2, depth: 2.6 };
export const AIR_HANDLER_X = 34.5;
export const AIR_HANDLER_Z: Extent = [-12, 12];
export const AIR_HANDLER_COUNT = 6;

const AIR_HANDLER_PITCH = (AIR_HANDLER_Z[1] - AIR_HANDLER_Z[0]) / (AIR_HANDLER_COUNT - 1);

export const AIR_HANDLERS: readonly BoxSpec[] = count(AIR_HANDLER_COUNT).map((index) =>
  standing([AIR_HANDLER_X, GROUND_Y, AIR_HANDLER_Z[0] + index * AIR_HANDLER_PITCH], AIR_HANDLER),
);

export const AIR_CEILING_Y = 5.6;
export const HOT_AISLE_Z = behind(SUBJECT_ROW, RACK.depth / 2 + AISLE.hot / 2);
export const WALL_PIPE_X = 35.6;

export const FIBRE_ENTRY: Point = [4, 0.3, BUILDING.z[1]];
export const SPINE_RACKS: readonly BoxSpec[] = [-1.134, 1.134].map((z) =>
  standing([2.3, GROUND_Y, z], NETWORK_RACK),
);
export const CABLE_TRAY_Y = 2.8;

export const DESK: BoxSpec = standing([-14.2, GROUND_Y, -0.4], {
  width: 1.2,
  height: 0.75,
  depth: 0.6,
});
export const LAPTOP: BoxSpec = standing(boxTop(DESK), { width: 0.3, height: 0.02, depth: 0.21 });

export const CUTAWAY_ROOF_X: Extent = [BUILDING.x[0], 12];

function midpoint(from: Point, to: Point): Point {
  return [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, (from[2] + to[2]) / 2];
}

export const ANCHOR_POINTS: Readonly<Record<FixedAnchorId, Point>> = {
  subjectRack: boxCentre(SUBJECT_RACK_BOX),
  inset: INSET_CENTRE,
  chip: CHIP_ANCHOR,
  cdu: boxCentre(SUBJECT_CDU),
  roof: DRY_COOLER_BANK_CENTRE,
  lineUp: midpoint(boxCentre(SUBJECT_RACK_BOX), boxTop(DESK)),
};

const RACK_SPAN = boxSpan(SUBJECT_RACK_BOX);
const DESK_SPAN = boxSpan(DESK);
const NORTH_GENSET_Z = Math.min(...GENSETS.map((box) => boxSpan(box).z[0]));
const INSET_Z = around(INSET_CENTRE[2], INSET.width);
const SPINE_Z = Math.min(...SPINE_RACKS.map((box) => boxSpan(box).z[0]));
const CHILLER_SPAN = boxSpan(CHILLER);
const COOLER_SOUTH_Z = Math.max(...DRY_COOLERS.map((box) => boxSpan(box).z[1]));

export const REGION_SPECS: Readonly<Record<RegionId, RegionSpec>> = {
  campus: {
    x: [boxSpan(GANTRY).x[0], BUILDING.x[1]],
    y: [GROUND_Y, PLUME_TOP[1]],
    z: [NORTH_GENSET_Z, BUILDING.z[1]],
  },
  powerYard: {
    x: [boxSpan(SUBSTATION_YARD).x[0], ROOM_WALL_X],
    y: [GROUND_Y, ROOF_Y],
    z: [NORTH_GENSET_Z, BUILDING.z[1]],
  },
  rack: {
    x: [INSET_CENTRE[0] - INSET.depth / 2, RACK_SPAN.x[1]],
    y: [GROUND_Y, INSET_CENTRE[1] + INSET.height / 2],
    z: [Math.min(INSET_Z[0], RACK_SPAN.z[0]), Math.max(INSET_Z[1], RACK_SPAN.z[1])],
  },
  networkRow: {
    x: [SUBJECT_ROW.startX, FIBRE_ENTRY[0]],
    y: [GROUND_Y, BUSWAY.rowY],
    z: [SPINE_Z, FIBRE_ENTRY[2]],
  },
  coolingPlant: {
    x: [SUBJECT_ROW.startX, BUILDING.x[1]],
    y: [GROUND_Y, PLUME_TOP[1]],
    z: [CHILLER_SPAN.z[0], COOLER_SOUTH_Z],
  },
  lineUp: {
    x: [DESK_SPAN.x[0], RACK_SPAN.x[1]],
    y: [GROUND_Y, RACK.height],
    z: [DESK_SPAN.z[0], RACK_SPAN.z[1]],
  },
};
