import { CylinderGeometry, Vector3 } from 'three';
import type { BufferGeometry } from 'three';
import { SIDE_SIGNS } from '../../../../model';
import {
  boxOver,
  cylinderBetween,
  evenlySpaced,
  extrudeAlongX,
  mergeParts,
  profileShape,
  sideProfile,
} from '../geometry';
import type { ProfilePoint } from '../geometry';
import { arcHeight } from './canopy';
import { CANOPY, FLOOR, FURNITURE, HALF_LENGTH, PLATFORM, SCREEN, SUPPORT } from './constants';

type Span = [number, number];

const RUN: Span = [-HALF_LENGTH, HALF_LENGTH];
const SLAB_BOTTOM = FLOOR - PLATFORM.slab;
const FINISH_BOTTOM = FLOOR - PLATFORM.finish;

function across(side: number, from: number, to: number): Span {
  return side > 0 ? [from, to] : [-to, -from];
}

const SLAB_PROFILE: readonly ProfilePoint[] = [
  [PLATFORM.edge, FINISH_BOTTOM],
  [PLATFORM.outer, FINISH_BOTTOM],
  [PLATFORM.outer, SLAB_BOTTOM],
  [PLATFORM.edge + PLATFORM.edgeChamfer, SLAB_BOTTOM],
  [PLATFORM.edge, SLAB_BOTTOM + PLATFORM.edgeChamfer],
];

function slab(side: number): BufferGeometry {
  return extrudeAlongX(profileShape(sideProfile(SLAB_PROFILE, side)), ...RUN);
}

function column(x: number, side: number): BufferGeometry[] {
  const z = side * SUPPORT.beamZ;
  const height = SLAB_BOTTOM - SUPPORT.beamDepth;
  const shaft = new CylinderGeometry(
    SUPPORT.columnRadius,
    SUPPORT.columnRadius,
    height,
    SUPPORT.segments,
    1,
    true,
  );
  shaft.translate(x, height / 2, z);
  const pad = SUPPORT.footing / 2;
  const footing = boxOver([x - pad, x + pad], [0, SUPPORT.footingHeight], [z - pad, z + pad]);
  return [shaft, footing];
}

function supportBeam(side: number): BufferGeometry {
  const half = SUPPORT.beamWidth / 2;
  const z = side * SUPPORT.beamZ;
  return boxOver(RUN, [SLAB_BOTTOM - SUPPORT.beamDepth, SLAB_BOTTOM], [z - half, z + half]);
}

function kerb(side: number): BufferGeometry {
  const z = across(side, PLATFORM.outer - PLATFORM.kerbWidth, PLATFORM.outer);
  return boxOver(RUN, [FLOOR, FLOOR + PLATFORM.kerbHeight], z);
}

export function platformStructure(): BufferGeometry {
  const columns = evenlySpaced(
    Math.round((2 * HALF_LENGTH) / SUPPORT.columnSpacing),
    -HALF_LENGTH,
    HALF_LENGTH,
  );
  return mergeParts(
    SIDE_SIGNS.flatMap((side) => [
      slab(side),
      supportBeam(side),
      kerb(side),
      ...columns.flatMap((x) => column(x, side)),
    ]),
  );
}

export function platformFloor(): BufferGeometry {
  return mergeParts(
    SIDE_SIGNS.map((side) =>
      boxOver(
        RUN,
        [FINISH_BOTTOM, FLOOR],
        across(side, PLATFORM.edge + PLATFORM.nosing, PLATFORM.outer),
      ),
    ),
  );
}

export function platformNosing(): BufferGeometry {
  return mergeParts(
    SIDE_SIGNS.map((side) =>
      boxOver(
        RUN,
        [FINISH_BOTTOM, FLOOR],
        across(side, PLATFORM.edge, PLATFORM.edge + PLATFORM.nosing),
      ),
    ),
  );
}

export function tactileStrips(): BufferGeometry {
  const from = PLATFORM.edge + PLATFORM.tactileOffset;
  return mergeParts(
    SIDE_SIGNS.map((side) =>
      boxOver(
        RUN,
        [FLOOR, FLOOR + PLATFORM.stripProud],
        across(side, from, from + PLATFORM.tactileWidth),
      ),
    ),
  );
}

export function screenGlass(): BufferGeometry {
  const top = FLOOR + PLATFORM.kerbHeight + SCREEN.height;
  return mergeParts(
    SIDE_SIGNS.map((side) =>
      boxOver(
        RUN,
        [FLOOR + PLATFORM.kerbHeight, top],
        across(side, SCREEN.z, SCREEN.z + SCREEN.thickness),
      ),
    ),
  );
}

export function screenFrame(): BufferGeometry {
  const bottom = FLOOR + PLATFORM.kerbHeight;
  const top = bottom + SCREEN.height;
  const count = Math.round((2 * HALF_LENGTH) / SCREEN.mullionSpacing);
  const mullions = [...evenlySpaced(count, -HALF_LENGTH, HALF_LENGTH), HALF_LENGTH, -HALF_LENGTH];
  const half = SCREEN.mullionWidth / 2;
  const depth: Span = [SCREEN.z - SCREEN.mullionDepth / 2, SCREEN.z + SCREEN.mullionDepth / 2];
  return mergeParts(
    SIDE_SIGNS.flatMap((side) => [
      boxOver(RUN, [top - SCREEN.railHeight, top + SCREEN.railHeight / 2], across(side, ...depth)),
      ...mullions.map((x) => boxOver([x - half, x + half], [bottom, top], across(side, ...depth))),
    ]),
  );
}

function bench(x: number, side: number): BufferGeometry[] {
  const { benchZ, benchLength, benchDepth, benchSeat, benchThickness, benchBack } = FURNITURE;
  const half = benchLength / 2;
  const along: Span = [x - half, x + half];
  const seat = across(side, benchZ - benchDepth / 2, benchZ + benchDepth / 2);
  const back = across(side, benchZ + benchDepth / 2 - benchThickness, benchZ + benchDepth / 2);
  const legs = [-1, 1].map((end) => {
    const legX = x + end * (half - benchThickness);
    return boxOver(
      [legX - benchThickness / 2, legX + benchThickness / 2],
      [FLOOR, FLOOR + benchSeat],
      seat,
    );
  });
  return [
    boxOver(along, [FLOOR + benchSeat - benchThickness, FLOOR + benchSeat], seat),
    boxOver(along, [FLOOR + benchSeat, FLOOR + benchSeat + benchBack], back),
    ...legs,
  ];
}

function supportSpots(every: number): number[] {
  const count = Math.round((2 * HALF_LENGTH) / SUPPORT.columnSpacing);
  return evenlySpaced(count, -HALF_LENGTH, HALF_LENGTH).filter((_, index) => index % every === 0);
}

export function benches(): BufferGeometry {
  return mergeParts(
    supportSpots(FURNITURE.benchEvery).flatMap((x) =>
      SIDE_SIGNS.flatMap((side) => bench(x + SUPPORT.columnSpacing / 2, side)),
    ),
  );
}

function signSpan(x: number, side: number, [bottom, top]: Span, thickness: number): BufferGeometry {
  const half = FURNITURE.signLength / 2;
  const z = side * FURNITURE.signZ;
  return boxOver([x - half, x + half], [bottom, top], [z - thickness / 2, z + thickness / 2]);
}

function signRods(x: number, side: number, top: number): BufferGeometry[] {
  const z = side * FURNITURE.signZ;
  const ceiling = arcHeight(FURNITURE.signZ) - CANOPY.glazing;
  const offset = FURNITURE.signLength / 2 - FURNITURE.signThickness;
  return [-1, 1].map((end) =>
    cylinderBetween(
      new Vector3(x + end * offset, top, z),
      new Vector3(x + end * offset, ceiling, z),
      [FURNITURE.rodRadius, FURNITURE.rodRadius],
      FURNITURE.rodSegments,
    ),
  );
}

export function signBoards(): BufferGeometry {
  const bottom = FLOOR + FURNITURE.signBottom;
  const top = bottom + FURNITURE.signHeight;
  return mergeParts(
    supportSpots(FURNITURE.signEvery).flatMap((x) =>
      SIDE_SIGNS.flatMap((side) => [
        signSpan(x, side, [bottom, top], FURNITURE.signThickness),
        ...signRods(x, side, top),
      ]),
    ),
  );
}

export function signBands(): BufferGeometry {
  const middle = FLOOR + FURNITURE.signBottom + FURNITURE.signHeight / 2;
  const span: Span = [middle - FURNITURE.signBand / 2, middle + FURNITURE.signBand / 2];
  const thickness = FURNITURE.signThickness + FURNITURE.bandProud * 2;
  return mergeParts(
    supportSpots(FURNITURE.signEvery).flatMap((x) =>
      SIDE_SIGNS.map((side) => signSpan(x, side, span, thickness)),
    ),
  );
}
