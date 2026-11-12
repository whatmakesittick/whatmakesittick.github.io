import type { Matrix4 } from 'three';
import type { Object3D } from 'three';
import type { Point } from '../../../ids';
import { boltHead, instanced, placement } from '../kit';
import type { PartContext } from '../context';
import { STRUCTURE_GROUP } from '@core/scene/materials';
import { cableChain } from './chain';
import { CARRIAGE, CHUCK, FRAME, MASK_CHAIN, MASK_ORIGIN, PLATE_TOP, RAIL } from './dims';
import { addPieces, rod, slab } from './pieces';
import type { Piece } from './pieces';

const SIDES = [-1, 1] as const;
const BOLT_ROWS = [-1, 1] as const;
const RECESS_FLOOR = 0.001;

export interface MaskStageGroups {
  fixed: Object3D;
  carriage: Object3D;
  bend: Object3D;
}

function railPieces(): Piece[] {
  const length = RAIL.halfLength * 2;
  const centre = (RAIL.bottom + RAIL.top) / 2;
  return SIDES.flatMap((side) => [
    slab(
      'darkFrame',
      [0, centre, side * RAIL.z],
      [length, RAIL.top - RAIL.bottom, RAIL.width],
      0.008,
    ),
    slab(
      'rubber',
      [0, RAIL.top + 0.004, side * RAIL.z],
      [length - 0.1, RAIL.trackTop - RAIL.top, RAIL.width - 0.02],
    ),
    ...SIDES.map((edge) =>
      slab(
        'flange',
        [0, RAIL.trackTop + 0.002, side * RAIL.z + edge * RAIL.stripeInset],
        [length - 0.1, RAIL.stripeTop - RAIL.trackTop, 0.005],
      ),
    ),
  ]);
}

function framePieces(): Piece[] {
  const height = 0.6;
  const reach = FRAME.postZ * 2;
  const posts = SIDES.flatMap((x) =>
    SIDES.map((z) =>
      slab(
        'darkFrame',
        [x * FRAME.postX, height / 2, z * FRAME.postZ],
        [FRAME.post, height, FRAME.post],
        0.006,
      ),
    ),
  );
  const crossAt = (RAIL.bottom + RAIL.top) / 2;
  const cross = SIDES.map((x) =>
    slab('darkFrame', [x * FRAME.postX, crossAt, 0], [FRAME.post, FRAME.crossHeight, reach], 0.006),
  );
  const topY = height - FRAME.topBeam / 2;
  const topLong = SIDES.map((z) =>
    slab(
      'darkFrame',
      [0, topY, z * FRAME.postZ],
      [FRAME.postX * 2, FRAME.topBeam, FRAME.post],
      0.005,
    ),
  );
  const topCross = SIDES.map((x) =>
    slab('darkFrame', [x * FRAME.postX, topY, 0], [FRAME.post, FRAME.topBeam, reach], 0.005),
  );
  const bumpers = SIDES.flatMap((x) =>
    SIDES.map((z) =>
      slab(
        'safety',
        [x * (FRAME.postX - FRAME.post / 2 - 0.02), crossAt + 0.09, z * RAIL.z],
        [0.04, 0.05, 0.07],
        0.008,
      ),
    ),
  );
  const backY = RAIL.bottom - 0.01 + (height - RAIL.bottom) / 2 - 0.02;
  const back = [
    slab(
      'panel',
      [0, backY, -FRAME.postZ - 0.01],
      [FRAME.postX * 2 - FRAME.post, height - RAIL.bottom - 0.04, FRAME.backPanel],
      0.004,
    ),
    ...[-0.4, 0, 0.4].map((x) =>
      slab(
        'darkFrame',
        [x, backY, -FRAME.postZ - 0.027],
        [0.02, height - RAIL.bottom - 0.08, 0.006],
      ),
    ),
  ];
  return [...posts, ...cross, ...topLong, ...topCross, ...bumpers, ...back];
}

function boltMatrices(): Matrix4[] {
  const count = Math.floor((FRAME.postX * 2) / FRAME.boltPitch);
  const top = 0.6;
  return BOLT_ROWS.flatMap((row) =>
    Array.from({ length: count }, (_, index) => {
      const x = -FRAME.postX + (index + 0.5) * FRAME.boltPitch;
      const at: Point = [x, top + 0.003, row * FRAME.postZ];
      return placement(at);
    }),
  );
}

function carriagePieces(): Piece[] {
  const { halfX, halfZ, bodyBottom, bodyTop, shadeTop, recessBottom } = CARRIAGE;
  const body = slab(
    'panel',
    [0, (bodyBottom + bodyTop) / 2, 0],
    [halfX * 2, bodyTop - bodyBottom, halfZ * 2],
    0.012,
  );
  const shade = slab(
    'panelShade',
    [0, (bodyTop + shadeTop) / 2, 0],
    [halfX * 2 - 0.06, shadeTop - bodyTop, halfZ * 2 - 0.06],
    0.01,
  );
  const trim = slab(
    'accent',
    [0, (bodyBottom + bodyTop) / 2, halfZ + 0.002],
    [halfX * 2 - 0.04, 0.012, 0.004],
  );
  const arms = SIDES.flatMap((side) => {
    const reach = RAIL.z - RAIL.width / 2 - halfZ;
    const y = (CARRIAGE.armBottom + CARRIAGE.armTop) / 2;
    return [
      slab(
        'frame',
        [0, y, side * (halfZ + reach / 2)],
        [halfX * 1.6, CARRIAGE.armTop - CARRIAGE.armBottom, reach],
        0.006,
      ),
      slab('accent', [0, y, side * (halfZ + reach / 2)], [halfX * 1.2, 0.03, reach + 0.004]),
    ];
  });
  return [body, shade, trim, ...arms, ...recessPieces(recessBottom)];
}

function recessPieces(bottom: number): Piece[] {
  const { recessHalf: half, recessWall: wall } = CARRIAGE;
  const tall = CARRIAGE.bodyBottom - bottom;
  const y = bottom + tall / 2;
  const long = half * 2;
  const walls = SIDES.flatMap((side) => [
    slab('frame', [0, y, side * (half - wall / 2)], [long, tall, wall]),
    slab('frame', [side * (half - wall / 2), y, 0], [wall, tall, long - wall * 2]),
  ]);
  const floor = slab(
    'laserCase',
    [0, CARRIAGE.bodyBottom - RECESS_FLOOR / 2, 0],
    [long - wall * 2, RECESS_FLOOR, long - wall * 2],
  );
  return [...walls, floor];
}

function chuckPosts(): Piece[] {
  const from = PLATE_TOP + CHUCK.tall;
  const length = CARRIAGE.bodyBottom - from;
  return SIDES.flatMap((x) =>
    SIDES.map((z) =>
      rod(
        'flange',
        [x * (CHUCK.half - 0.015), from + length / 2, z * (CHUCK.half - 0.015)],
        CHUCK.post,
        length,
        'y',
      ),
    ),
  );
}

export function buildMaskStage(context: PartContext, groups: MaskStageGroups): void {
  const chain = cableChain(MASK_CHAIN);
  addPieces(
    context,
    STRUCTURE_GROUP,
    groups.fixed,
    [...railPieces(), ...framePieces()],
    MASK_ORIGIN,
  );
  const bolts = instanced(
    context,
    boltHead(FRAME.boltSize),
    STRUCTURE_GROUP,
    'bolt',
    boltMatrices(),
  );
  bolts.position.set(...MASK_ORIGIN);
  groups.fixed.add(bolts);
  addPieces(context, 'maskStage', groups.fixed, chain.fixed, MASK_ORIGIN);
  addPieces(context, 'maskStage', groups.bend, chain.bend, MASK_ORIGIN);
  addPieces(
    context,
    'maskStage',
    groups.carriage,
    [...carriagePieces(), ...chain.moving, ...chuckPosts()],
    MASK_ORIGIN,
  );
}
