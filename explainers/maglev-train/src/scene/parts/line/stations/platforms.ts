import { CylinderGeometry } from 'three';
import type { BufferGeometry } from 'three';
import { SIDE_SIGNS } from '../../../../model';
import {
  boxOver,
  evenlySpaced,
  extrudeAlongX,
  mergeParts,
  profileShape,
  sideProfile,
} from '../geometry';
import type { ProfilePoint } from '../geometry';
import { FLOOR, HALF_LENGTH, PLATFORM, SCREEN, SUPPORT } from './constants';

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
