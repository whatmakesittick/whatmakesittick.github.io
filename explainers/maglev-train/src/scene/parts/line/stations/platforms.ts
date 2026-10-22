import { Vector3 } from 'three';
import type { BufferGeometry } from 'three';
import { SIDE_SIGNS } from '../../../../model';
import {
  around,
  boxOver,
  cylinderBetween,
  evenlySpaced,
  extrudeSide,
  mergeParts,
  sideSpan,
} from '../geometry';
import type { ProfilePoint, Span } from '../geometry';
import { arcHeight } from './canopy';
import {
  CANOPY,
  FLOOR,
  FURNITURE,
  HALF_LENGTH,
  PLATFORM,
  SCREEN,
  SUPPORT,
  onPlatform,
  platformRun,
} from './constants';

type Make = (x: number, side: number) => BufferGeometry[];

const ENDS = [-1, 1] as const;
const SLAB_BOTTOM = FLOOR - PLATFORM.slab;
const FINISH_BOTTOM = FLOOR - PLATFORM.finish;
const SURFACE: Span = [FINISH_BOTTOM, FLOOR];
const SCREEN_BOTTOM = FLOOR + PLATFORM.kerbHeight;
const SCREEN_TOP = SCREEN_BOTTOM + SCREEN.height;
const SCREEN_HEIGHT: Span = [SCREEN_BOTTOM, SCREEN_TOP];

const SLAB_PROFILE: readonly ProfilePoint[] = [
  [PLATFORM.edge, FINISH_BOTTOM],
  [PLATFORM.outer, FINISH_BOTTOM],
  [PLATFORM.outer, SLAB_BOTTOM],
  [PLATFORM.edge + PLATFORM.edgeChamfer, SLAB_BOTTOM],
  [PLATFORM.edge, SLAB_BOTTOM + PLATFORM.edgeChamfer],
];

function run(side: number, height: Span, inner: number, outer: number): BufferGeometry {
  return boxOver(platformRun(side), height, sideSpan(side, inner, outer));
}

function bothRuns(height: Span, inner: number, outer: number): BufferGeometry {
  return mergeParts(SIDE_SIGNS.map((side) => run(side, height, inner, outer)));
}

function supportSpots(every: number): number[] {
  const count = Math.round((2 * HALF_LENGTH) / SUPPORT.columnSpacing);
  return evenlySpaced(count, -HALF_LENGTH, HALF_LENGTH).filter((_, index) => index % every === 0);
}

function alongSides(spots: readonly number[], offset: number, make: Make): BufferGeometry[] {
  return SIDE_SIGNS.flatMap((side) =>
    spots
      .map((x) => x + offset)
      .filter((x) => onPlatform(x, side))
      .flatMap((x) => make(x, side)),
  );
}

function column(x: number, side: number): BufferGeometry[] {
  const z = side * SUPPORT.beamZ;
  const radius = SUPPORT.columnRadius;
  const top = new Vector3(x, SLAB_BOTTOM - SUPPORT.beamDepth, z);
  return [
    cylinderBetween(new Vector3(x, 0, z), top, [radius, radius], SUPPORT.segments),
    boxOver(around(x, SUPPORT.footing), [0, SUPPORT.footingHeight], around(z, SUPPORT.footing)),
  ];
}

export function platformStructure(): BufferGeometry {
  const beam = around(SUPPORT.beamZ, SUPPORT.beamWidth);
  const kerb = [PLATFORM.outer - PLATFORM.kerbWidth, PLATFORM.outer] as const;
  return mergeParts([
    ...SIDE_SIGNS.flatMap((side) => [
      extrudeSide(SLAB_PROFILE, side, ...platformRun(side)),
      run(side, [SLAB_BOTTOM - SUPPORT.beamDepth, SLAB_BOTTOM], ...beam),
      run(side, [FLOOR, FLOOR + PLATFORM.kerbHeight], ...kerb),
    ]),
    ...alongSides(supportSpots(1), 0, column),
  ]);
}

export function platformFloor(): BufferGeometry {
  return bothRuns(SURFACE, PLATFORM.edge + PLATFORM.nosing, PLATFORM.outer);
}

export function platformNosing(): BufferGeometry {
  return bothRuns(SURFACE, PLATFORM.edge, PLATFORM.edge + PLATFORM.nosing);
}

export function tactileStrips(): BufferGeometry {
  const from = PLATFORM.edge + PLATFORM.tactileOffset;
  return bothRuns([FLOOR, FLOOR + PLATFORM.stripProud], from, from + PLATFORM.tactileWidth);
}

function endScreens(side: number): BufferGeometry[] {
  const width = sideSpan(side, PLATFORM.edge + SCREEN.endGap, SCREEN.z);
  return platformRun(side).map((x) => boxOver(around(x, SCREEN.thickness), SCREEN_HEIGHT, width));
}

export function screenGlass(): BufferGeometry {
  return mergeParts(
    SIDE_SIGNS.flatMap((side) => [
      run(side, SCREEN_HEIGHT, SCREEN.z, SCREEN.z + SCREEN.thickness),
      ...endScreens(side),
    ]),
  );
}

function mullionSpots(side: number): number[] {
  const [from, to] = platformRun(side);
  const count = Math.round((to - from) / SCREEN.mullionSpacing);
  return [...evenlySpaced(count, from, to), from, to];
}

export function screenFrame(): BufferGeometry {
  const depth = around(SCREEN.z, SCREEN.mullionDepth);
  const rail: Span = [SCREEN_TOP - SCREEN.railHeight, SCREEN_TOP + SCREEN.railHeight / 2];
  const mullion = (x: number, side: number) =>
    boxOver(around(x, SCREEN.mullionWidth), SCREEN_HEIGHT, sideSpan(side, ...depth));
  return mergeParts(
    SIDE_SIGNS.flatMap((side) => [
      run(side, rail, ...depth),
      ...mullionSpots(side).map((x) => mullion(x, side)),
    ]),
  );
}

function bench(x: number, side: number): BufferGeometry[] {
  const { benchZ, benchLength, benchDepth, benchSeat, benchThickness, benchBack } = FURNITURE;
  const along = around(x, benchLength);
  const seat = sideSpan(side, ...around(benchZ, benchDepth));
  const backEdge = benchZ + benchDepth / 2;
  const back = sideSpan(side, backEdge - benchThickness, backEdge);
  const seatTop = FLOOR + benchSeat;
  const legReach = benchLength / 2 - benchThickness;
  const legs = ENDS.map((end) =>
    boxOver(around(x + end * legReach, benchThickness), [FLOOR, seatTop], seat),
  );
  return [
    boxOver(along, [seatTop - benchThickness, seatTop], seat),
    boxOver(along, [seatTop, seatTop + benchBack], back),
    ...legs,
  ];
}

export function benches(): BufferGeometry {
  return mergeParts(
    alongSides(supportSpots(FURNITURE.benchEvery), SUPPORT.columnSpacing / 2, bench),
  );
}

function signSpan(x: number, side: number, height: Span, thickness: number): BufferGeometry {
  return boxOver(
    around(x, FURNITURE.signLength),
    height,
    around(side * FURNITURE.signZ, thickness),
  );
}

function signRods(x: number, side: number, top: number): BufferGeometry[] {
  const z = side * FURNITURE.signZ;
  const ceiling = arcHeight(FURNITURE.signZ) - CANOPY.glazing;
  const reach = FURNITURE.signLength / 2 - FURNITURE.signThickness;
  const radius = FURNITURE.rodRadius;
  return ENDS.map((end) =>
    cylinderBetween(
      new Vector3(x + end * reach, top, z),
      new Vector3(x + end * reach, ceiling, z),
      [radius, radius],
      FURNITURE.rodSegments,
    ),
  );
}

function alongSigns(make: Make): BufferGeometry {
  return mergeParts(alongSides(supportSpots(FURNITURE.signEvery), 0, make));
}

export function signBoards(): BufferGeometry {
  const bottom = FLOOR + FURNITURE.signBottom;
  const top = bottom + FURNITURE.signHeight;
  return alongSigns((x, side) => [
    signSpan(x, side, [bottom, top], FURNITURE.signThickness),
    ...signRods(x, side, top),
  ]);
}

export function signBands(): BufferGeometry {
  const middle = FLOOR + FURNITURE.signBottom + FURNITURE.signHeight / 2;
  const thickness = FURNITURE.signThickness + FURNITURE.bandProud * 2;
  return alongSigns((x, side) => [
    signSpan(x, side, around(middle, FURNITURE.signBand), thickness),
  ]);
}
