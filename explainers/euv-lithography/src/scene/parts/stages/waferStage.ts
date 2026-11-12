import { CylinderGeometry } from 'three';
import type { Object3D } from 'three';
import { mesh } from '../context';
import type { PartContext } from '../context';
import { washerAlongX } from '../kit';
import { cableChain } from './chain';
import {
  CHUCK_DISC,
  SURFACE,
  WAFER_AT,
  WAFER_BASE,
  WAFER_CARRIAGE,
  WAFER_CHAIN,
  WAFER_ORIGIN,
  WAFER_THICK,
} from './dims';
import { addPieces, slab } from './pieces';
import type { Piece } from './pieces';

const SIDES = [-1, 1] as const;
const CHUCK_SIDES = 48;
const MIRROR_BAR = [0.012, 0.03, 0.3] as const;
const FACE_PANEL = [0.7, 0.06, 0.004] as const;
const TRIM_TALL = 0.008;

export interface WaferStageGroups {
  fixed: Object3D;
  carriage: Object3D;
  bend: Object3D;
}

function basePieces(): Piece[] {
  const { half, tall, margin } = WAFER_BASE;
  const span = half * 2;
  const top = tall + SURFACE.tall;
  const lines = Array.from({ length: Math.floor(span / SURFACE.pitch) - 1 }, (_, index) => {
    const offset = (index + 1) * SURFACE.pitch - half;
    return [
      slab('flange', [0, top + 0.001, offset], [span - margin, 0.002, SURFACE.line]),
      slab('flange', [offset, top + 0.001, 0], [SURFACE.line, 0.002, span - margin]),
    ];
  });
  const faces = SIDES.flatMap((side) => [
    slab('panelShade', [0, tall / 2, side * (half + 0.001)], [...FACE_PANEL], 0.002),
    slab(
      'panelShade',
      [side * (half + 0.001), tall / 2, 0],
      [FACE_PANEL[2], FACE_PANEL[1], FACE_PANEL[0]],
      0.002,
    ),
  ]);
  const rim = SIDES.flatMap((side) => [
    slab('frame', [0, tall + 0.002, side * (half - 0.01)], [span, 0.004, 0.02]),
    slab('frame', [side * (half - 0.01), tall + 0.002, 0], [0.02, 0.004, span - 0.04]),
  ]);
  return [
    slab('granite', [0, tall / 2, 0], [span, tall, span], 0.012),
    slab(
      'darkFrame',
      [0, tall + SURFACE.tall / 2, 0],
      [span - margin, SURFACE.tall, span - margin],
    ),
    ...lines.flat(),
    ...faces,
    ...rim,
  ];
}

function carriagePieces(): Piece[] {
  const { halfX, lowerBottom, lowerTop, midTop, shadeTop } = WAFER_CARRIAGE;
  const reach = halfX * 2;
  const feet = SIDES.flatMap((x) =>
    SIDES.map((z) =>
      slab(
        'darkFrame',
        [x * (halfX - 0.03), lowerBottom - 0.006, z * (halfX - 0.03)],
        [0.05, 0.012, 0.05],
        0.004,
      ),
    ),
  );
  const mirrors = SIDES.map((x) =>
    slab(
      'mirror',
      [x * (halfX - MIRROR_BAR[0] / 2 - 0.01), shadeTop + MIRROR_BAR[1] / 2, 0],
      [...MIRROR_BAR],
    ),
  );
  return [
    slab(
      'frame',
      [0, (lowerBottom + lowerTop) / 2, 0],
      [reach, lowerTop - lowerBottom, reach],
      0.016,
    ),
    slab(
      'panel',
      [0, (lowerTop + midTop) / 2, 0],
      [reach - 0.06, midTop - lowerTop, reach - 0.06],
      0.01,
    ),
    slab(
      'panelShade',
      [0, (midTop + shadeTop) / 2, 0],
      [reach - 0.12, shadeTop - midTop, reach - 0.12],
      0.006,
    ),
    slab(
      'accent',
      [0, (lowerTop + midTop) / 2, (reach - 0.06) / 2 + 0.002],
      [reach - 0.1, TRIM_TALL, 0.004],
    ),
    ...feet,
    ...mirrors,
  ];
}

export function buildWaferStage(context: PartContext, groups: WaferStageGroups): void {
  const chain = cableChain(WAFER_CHAIN);
  addPieces(context, 'waferStage', groups.fixed, [...basePieces(), ...chain.fixed], WAFER_ORIGIN);
  addPieces(context, 'waferStage', groups.bend, chain.bend, WAFER_ORIGIN);
  addPieces(
    context,
    'waferStage',
    groups.carriage,
    [...carriagePieces(), ...chain.moving],
    WAFER_ORIGIN,
  );
  const bottom = WAFER_CARRIAGE.shadeTop;
  const top = WAFER_AT[1] - WAFER_ORIGIN[1] - WAFER_THICK;
  const chuck = mesh(
    context,
    new CylinderGeometry(CHUCK_DISC.radius, CHUCK_DISC.radius, top - bottom, CHUCK_SIDES),
    'waferStage',
    'darkFrame',
  );
  chuck.position.set(WAFER_AT[0], WAFER_ORIGIN[1] + (top + bottom) / 2, WAFER_AT[2]);
  const ringHeight = top - bottom;
  const ring = mesh(
    context,
    washerAlongX(CHUCK_DISC.ringInner, CHUCK_DISC.ring, ringHeight).rotateZ(Math.PI / 2),
    'waferStage',
    'ceramic',
  );
  ring.position.copy(chuck.position);
  groups.carriage.add(chuck, ring);
}
