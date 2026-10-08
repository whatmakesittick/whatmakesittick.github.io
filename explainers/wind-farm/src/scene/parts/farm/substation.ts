import type { BufferGeometry, Group } from 'three';
import type { Point } from '../../../ids';
import { SUBSTATION } from '../../../model';
import { SUBSTATION_HEIGHT_M } from '../../constants';
import { groupMesh, label, namedGroup } from '../context';
import type { PartContext } from '../context';
import type { Finish } from '../../finishes';
import { mergeParts, slab } from './geometry';
import { groundRange } from './ground';
import { busbar, gantry, GANTRY, transformerPieces } from './yard';

const PART = 'substation';
const YARD_FINISHES = [
  'gravel',
  'concrete',
  'substation',
  'cooler',
  'gridSteel',
  'paintShade',
] as const satisfies readonly Finish[];

type YardFinish = (typeof YARD_FINISHES)[number];
const HALF_WIDTH = SUBSTATION.width / 2;
const HALF_DEPTH = SUBSTATION.depth / 2;
const PAD_RAISE_M = 0.3;
const PAD_SINK_M = 1.5;
const FENCE = { inset: 1, height: 2.4, thickness: 0.12, postPitch: 8, post: 0.22 } as const;
const BUILDING = { minX: -54, maxX: -32, minZ: 14, maxZ: 30, height: 5.5, eave: 0.6, roof: 0.5 };
const TRANSFORMER_SITES: readonly (readonly [number, number])[] = [
  [30, -14],
  [30, 14],
];
const GANTRY_XS = [-20, -6, 8] as const;
const GANTRY_HALF_SPAN = 18;
const BUSBAR_ZS = [-7, 0, 7] as const;
const BUSBAR_DROP_M = 2.5;
const EXIT_GANTRY_X = HALF_WIDTH - 6;
const EXIT_HALF_SPAN = 9;

export const SUBSTATION_RANGE = groundRange([SUBSTATION.x, SUBSTATION.z], HALF_WIDTH, HALF_DEPTH);
export const YARD_LEVEL = SUBSTATION_RANGE.high + PAD_RAISE_M;
export const LINE_EXIT: Point = [
  SUBSTATION.x + EXIT_GANTRY_X,
  YARD_LEVEL + GANTRY.height,
  SUBSTATION.z,
];
export const EXIT_HALF_SPAN_M = EXIT_HALF_SPAN;

function fence(): BufferGeometry[] {
  const x = HALF_WIDTH - FENCE.inset;
  const z = HALF_DEPTH - FENCE.inset;
  const half = FENCE.thickness / 2;
  const panels = [
    slab([-x, 0, -z - half], [x, FENCE.height, -z + half]),
    slab([-x, 0, z - half], [x, FENCE.height, z + half]),
    slab([-x - half, 0, -z], [-x + half, FENCE.height, z]),
    slab([x - half, 0, -z], [x + half, FENCE.height, z]),
  ];
  const corners: Point[] = [
    [-x, 0, -z],
    [x, 0, -z],
    [x, 0, z],
    [-x, 0, z],
  ];
  const posts = corners.flatMap((corner, index) => {
    const next = corners[(index + 1) % corners.length];
    const length = Math.hypot(next[0] - corner[0], next[2] - corner[2]);
    const count = Math.round(length / FENCE.postPitch);
    return Array.from({ length: count }, (_, step) => {
      const share = step / count;
      const postX = corner[0] + (next[0] - corner[0]) * share;
      const postZ = corner[2] + (next[2] - corner[2]) * share;
      const p = FENCE.post / 2;
      return slab([postX - p, 0, postZ - p], [postX + p, FENCE.height + p, postZ + p]);
    });
  });
  return [...panels, ...posts];
}

function building(): { walls: BufferGeometry; roof: BufferGeometry } {
  const { minX, maxX, minZ, maxZ, height, eave, roof } = BUILDING;
  return {
    walls: slab([minX, 0, minZ], [maxX, height, maxZ]),
    roof: slab([minX - eave, height, minZ - eave], [maxX + eave, height + roof, maxZ + eave]),
  };
}

function steelwork(): BufferGeometry[] {
  const portals = GANTRY_XS.flatMap((x) => gantry(x, GANTRY_HALF_SPAN));
  const exit = gantry(EXIT_GANTRY_X, EXIT_HALF_SPAN);
  const busbarY = GANTRY.height - BUSBAR_DROP_M;
  const bars = BUSBAR_ZS.map((z) =>
    busbar(GANTRY_XS[0], GANTRY_XS[GANTRY_XS.length - 1], busbarY, z),
  );
  return [...portals, ...exit, ...bars, ...fence()];
}

function pieces(): Record<YardFinish, BufferGeometry[]> {
  const transformers = TRANSFORMER_SITES.map(transformerPieces);
  const { walls, roof } = building();
  const pad = slab(
    [-HALF_WIDTH, SUBSTATION_RANGE.low - PAD_SINK_M - YARD_LEVEL, -HALF_DEPTH],
    [HALF_WIDTH, 0, HALF_DEPTH],
  );
  return {
    gravel: [pad],
    concrete: [walls, ...transformers.map((piece) => piece.plinth)],
    substation: transformers.flatMap((piece) => piece.body),
    cooler: transformers.flatMap((piece) => piece.fins),
    gridSteel: steelwork(),
    paintShade: [roof, ...transformers.flatMap((piece) => piece.bushings)],
  };
}

export function buildSubstation(context: PartContext): Group {
  const group = namedGroup(PART);
  group.position.set(SUBSTATION.x, YARD_LEVEL, SUBSTATION.z);
  const yard = pieces();
  YARD_FINISHES.forEach((finish) => {
    const mesh = groupMesh(context, mergeParts(yard[finish]), PART, finish);
    mesh.name = PART;
    group.add(mesh);
  });
  label(context, PART, group, [0, SUBSTATION_HEIGHT_M, 0]);
  return group;
}
