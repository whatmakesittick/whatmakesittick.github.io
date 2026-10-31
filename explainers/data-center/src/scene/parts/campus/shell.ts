import type { Extent } from '@core/scene/regions';
import type { Point } from '../../../ids';
import {
  AIR_HANDLERS,
  BUILDING,
  CUTAWAY_ROOF_X,
  ROOF_Y,
  ROOM_WALL_X,
  WALL_THICKNESS,
  boxSpan,
  spanning,
} from '../../../model';
import type { BoxSpec } from '../../../model';
import { ROOM_TRAY_STEEL } from './electricalRoom';
import { ROOF_STEEL } from './pipeRuns';
import {
  GRASS_Y,
  INNER_WALL,
  PAD_TOP_Y,
  PARAPET_M,
  ROOF_GIRDER,
  ROOF_GIRDER_TOP_Y,
  ROOF_GIRDER_X,
  ROOF_SLAB_Y,
} from './constants';

type MetalSurface = 'coping' | 'girder' | 'trim' | 'door' | 'blade';
type MassSurface = 'plinth' | 'floor' | 'roomWall' | 'roof';
export type ShellSurface = 'cladding' | 'rollUp' | MetalSurface | MassSurface;

export type ShellLayer = 'kept' | 'cut' | 'cap';

export interface ShellPiece {
  readonly surface: ShellSurface;
  readonly layer: ShellLayer;
  readonly box: BoxSpec;
}

type FaceId = 'north' | 'south' | 'west' | 'east';

interface WallFace {
  readonly across: 'x' | 'z';
  readonly plane: number;
  readonly outward: 1 | -1;
}

interface Fixture {
  readonly face: FaceId;
  readonly at: number;
}

const [WEST, EAST] = BUILDING.x;
const [NORTH, SOUTH] = BUILDING.z;
const PARAPET_TOP_Y = ROOF_Y + PARAPET_M;
const PLINTH = { top: 0.5, bottom: -0.3, proud: 0.05 } as const;
const COPING = { overhang: 0.05, height: 0.06 } as const;
const COPING_TOP_Y = PARAPET_TOP_Y + COPING.height;
const FLOOR_SLAB_M = 0.3;
const ROOM_WALL_M = 0.2;
const FLANGE_M = 0.025;
const WEB_M = 0.02;
const GIRDER_BOTTOM_Y = ROOF_GIRDER_TOP_Y - ROOF_GIRDER.depth;
const ROOM_WALL_TOP_Y = GIRDER_BOTTOM_Y + FLANGE_M / 2;
const CAP = { margin: 0.003, depth: 0.02, inset: 0.01 } as const;
const CUT_X = CUTAWAY_ROOF_X[1];
const GIRDER_OVERRUN_M = 0.3;
const GIRDER_LOADS = [...ROOF_STEEL, ...ROOM_TRAY_STEEL].map(boxSpan);
const FIXTURE_FOOT_Y = GRASS_Y - 0.03;

const PERSONNEL_DOOR = { width: 1.0, height: 2.2 } as const;
const LOADING_DOOR = { width: 4.0, height: 4.5, hood: 0.5, hoodDepth: 0.45 } as const;
const DOOR_FRAME = { side: 0.1, proud: 0.08, leafProud: 0.1 } as const;
const LOUVRE = { width: 2.0, y: [3.0, 4.4], proud: 0.03, bladeProud: [0.02, 0.08] } as const;
const BLADE = { height: 0.04, pitch: 0.12 } as const;

const FACES: Readonly<Record<FaceId, WallFace>> = {
  north: { across: 'z', plane: NORTH, outward: -1 },
  south: { across: 'z', plane: SOUTH, outward: 1 },
  west: { across: 'x', plane: WEST, outward: -1 },
  east: { across: 'x', plane: EAST, outward: 1 },
};

const PERSONNEL_DOORS: readonly Fixture[] = [
  { face: 'north', at: 22.5 },
  { face: 'west', at: 8 },
];
const LOADING_DOORS: readonly Fixture[] = [{ face: 'north', at: 28 }];
const LOUVRES: readonly Fixture[] = [
  { face: 'west', at: -11 },
  { face: 'west', at: 1.5 },
  { face: 'north', at: -30 },
  { face: 'south', at: -30 },
  ...AIR_HANDLERS.map(({ base }): Fixture => ({ face: 'east', at: base[2] })),
];

const INSIDE_Z: Extent = [INNER_WALL.north, INNER_WALL.south];

function extent(from: number, to: number): Extent {
  return from < to ? [from, to] : [to, from];
}

function around(centre: number, size: number): Extent {
  return [centre - size / 2, centre + size / 2];
}

function inside(x: Extent, y: Extent): BoxSpec {
  return spanning(x, y, INSIDE_Z);
}

function piece(surface: ShellSurface, box: BoxSpec, layer: ShellLayer = 'kept'): ShellPiece {
  return { surface, layer, box };
}

function mounted(surface: ShellSurface, fixture: Fixture, width: number, y: Extent, proud: Extent) {
  const { across, plane, outward } = FACES[fixture.face];
  const depth = extent(plane + outward * proud[0], plane + outward * proud[1]);
  const along = around(fixture.at, width);
  const box = across === 'z' ? spanning(along, y, depth) : spanning(depth, y, along);
  return piece(surface, box, fixture.face === 'south' ? 'cut' : 'kept');
}

function ring(surface: ShellSurface, y: Extent, grow: number, south: ShellLayer): ShellPiece[] {
  const spanX: Extent = [WEST - grow, EAST + grow];
  const sideZ: Extent = [INNER_WALL.north + grow, INNER_WALL.south - grow];
  return [
    piece(surface, spanning(spanX, y, [NORTH - grow, INNER_WALL.north + grow])),
    piece(surface, spanning(spanX, y, [INNER_WALL.south - grow, SOUTH + grow]), south),
    piece(surface, spanning([WEST - grow, INNER_WALL.west + grow], y, sideZ)),
    piece(surface, spanning([INNER_WALL.east - grow, EAST + grow], y, sideZ)),
  ];
}

function capOver(box: BoxSpec, axis: 0 | 2, sign: 1 | -1, inset: number = CAP.inset) {
  const { x, y, z } = boxSpan(box);
  const grown = [x, y, z].map(([from, to]): Extent => [from - CAP.margin, to + CAP.margin]);
  const face = sign > 0 ? grown[axis][1] - CAP.margin : grown[axis][0] + CAP.margin;
  grown[axis] = extent(face - sign * inset, face + sign * CAP.depth);
  return piece('trim', spanning(grown[0], grown[1], grown[2]), 'cap');
}

function girder(x: number, z: Extent, layer: ShellLayer): ShellPiece[] {
  const flange = (bottom: number) =>
    piece('girder', spanning(around(x, ROOF_GIRDER.width), [bottom, bottom + FLANGE_M], z), layer);
  const webY: Extent = [GIRDER_BOTTOM_Y + FLANGE_M, ROOF_GIRDER_TOP_Y - FLANGE_M];
  const web = piece('girder', spanning(around(x, WEB_M), webY, z), layer);
  return [flange(GIRDER_BOTTOM_Y), flange(ROOF_GIRDER_TOP_Y - FLANGE_M), web];
}

function roofGirder(x: number): ShellPiece[] {
  if (x >= CUT_X) return girder(x, INSIDE_Z, 'kept');
  const loads = GIRDER_LOADS.filter((load) => load.x[0] <= x && x <= load.x[1]);
  if (!loads.length) return girder(x, INSIDE_Z, 'cut');
  const end = Math.max(...loads.map((load) => load.z[1])) + GIRDER_OVERRUN_M;
  const kept: Extent = [INSIDE_Z[0], end];
  const outline = spanning(
    around(x, ROOF_GIRDER.width),
    [GIRDER_BOTTOM_Y, ROOF_GIRDER_TOP_Y],
    kept,
  );
  return [
    ...girder(x, kept, 'kept'),
    ...girder(x, [end, INSIDE_Z[1]], 'cut'),
    capOver(outline, 2, 1),
  ];
}

function personnelDoor(fixture: Fixture): ShellPiece[] {
  const { width, height } = PERSONNEL_DOOR;
  const top = PAD_TOP_Y + height;
  const framed = width + 2 * DOOR_FRAME.side;
  return [
    mounted(
      'trim',
      fixture,
      framed,
      [FIXTURE_FOOT_Y, top + DOOR_FRAME.side],
      [0, DOOR_FRAME.proud],
    ),
    mounted('door', fixture, width, [FIXTURE_FOOT_Y, top], [0, DOOR_FRAME.leafProud]),
  ];
}

function loadingDoor(fixture: Fixture): ShellPiece[] {
  const { width, height, hood, hoodDepth } = LOADING_DOOR;
  const top = PAD_TOP_Y + height;
  const framed = width + 2 * DOOR_FRAME.side;
  return [
    mounted('trim', fixture, framed, [FIXTURE_FOOT_Y, top], [0, DOOR_FRAME.proud]),
    mounted('rollUp', fixture, width, [FIXTURE_FOOT_Y, top], [0, DOOR_FRAME.leafProud]),
    mounted('coping', fixture, framed, [top, top + hood], [0, hoodDepth]),
  ];
}

function louvre(fixture: Fixture): ShellPiece[] {
  const [bottom, top] = LOUVRE.y;
  const blades = Math.floor((top - bottom) / BLADE.pitch);
  const margin = (top - bottom - (blades - 1) * BLADE.pitch - BLADE.height) / 2;
  const blade = (index: number): Extent =>
    around(bottom + margin + index * BLADE.pitch, BLADE.height);
  return [
    mounted('trim', fixture, LOUVRE.width, LOUVRE.y, [0, LOUVRE.proud]),
    ...Array.from({ length: blades }, (_, index) =>
      mounted('blade', fixture, LOUVRE.width - BLADE.height, blade(index), LOUVRE.bladeProud),
    ),
  ];
}

const SLAB_Y: Extent = [ROOF_SLAB_Y, ROOF_Y];
const KEPT_SLAB = inside([CUT_X, INNER_WALL.east], SLAB_Y);
const ROOM_WALL = inside(around(ROOM_WALL_X, ROOM_WALL_M), [PAD_TOP_Y, ROOM_WALL_TOP_Y]);
const SIDE_WALL_SECTIONS = [INNER_WALL.west, INNER_WALL.east].map((inner) =>
  inside(
    around(inner + Math.sign(inner) * (WALL_THICKNESS / 2), WALL_THICKNESS + 2 * COPING.overhang),
    [PLINTH.top, COPING_TOP_Y],
  ),
);

export const SHELL_PIECES: readonly ShellPiece[] = [
  ...ring('cladding', [PLINTH.top, PARAPET_TOP_Y], 0, 'cut'),
  ...ring('plinth', [PLINTH.bottom, PLINTH.top], PLINTH.proud, 'kept'),
  ...ring('coping', [PARAPET_TOP_Y, COPING_TOP_Y], COPING.overhang, 'cut'),
  piece('floor', inside([INNER_WALL.west, INNER_WALL.east], [PAD_TOP_Y - FLOOR_SLAB_M, PAD_TOP_Y])),
  piece('roomWall', ROOM_WALL),
  piece('roof', KEPT_SLAB),
  piece('roof', inside([INNER_WALL.west, CUT_X], SLAB_Y), 'cut'),
  ...ROOF_GIRDER_X.flatMap(roofGirder),
  ...PERSONNEL_DOORS.flatMap(personnelDoor),
  ...LOADING_DOORS.flatMap(loadingDoor),
  ...LOUVRES.flatMap(louvre),
  ...SIDE_WALL_SECTIONS.map((section) => capOver(section, 2, 1, COPING.overhang)),
  capOver(ROOM_WALL, 2, 1),
  capOver(KEPT_SLAB, 0, -1),
  capOver(inside([CUT_X - CAP.depth, INNER_WALL.east], SLAB_Y), 2, 1),
];

export const HALL_LABEL_POINT: Point = [ROOM_WALL_X, ROOF_Y, SOUTH];
