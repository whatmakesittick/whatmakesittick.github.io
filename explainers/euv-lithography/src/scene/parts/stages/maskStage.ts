import type { Object3D } from 'three';
import { faceOf, studRow } from '../enclosure';
import type { PartContext } from '../context';
import type { Bin } from '../optics/geo';
import { slab } from '../optics/geo';
import { cableChain } from './chain';
import {
  CHUCK,
  MASK_AT,
  MASK_BLOCK,
  MASK_BRIDGE,
  MASK_CARRIAGE,
  MASK_CHAIN,
  MASK_CHAIN_SHELF,
  MASK_RAILS,
  MASK_TRACK,
  MASK_WALL_X,
  PLATE_HALF,
  PLATE_TOP,
} from './dims';

const PART = 'maskStage';
const SIDES = [-1, 1] as const;
const ROUND = 0.006;
const TIE_DEPTH = 0.05;
const TIE_RISE = 0.04;
const TIE_DROP = 0.04;
const BOLT_OUT = 0.004;
const BOLT_PITCH = 0.12;
const COVER = { halfX: 0.2, bottom: 0.04, top: 0.2, thick: 0.007 } as const;
const STRIPE = { bottom: 0.11, tall: 0.02, thick: 0.004 } as const;
const SIDE_COVER = { halfZ: 0.22, thick: 0.005 } as const;
const TOP_PLATE = { inset: 0.03, thick: 0.006 } as const;
const POCKETS = { columns: 3, rows: 2, halfZ: 0.2, gap: 0.02, rise: 0.002 } as const;
const CHUCK_INNER = 0.6;
const CLAMP_REACH = 0.004;
const RAILS_Z = SIDES.map((side) => side * MASK_RAILS.z);

export interface MaskStageGroups {
  fixed: Object3D;
  carriage: Object3D;
  bend: Object3D;
}

function addBridge(bin: Bin): void {
  const { min, max } = MASK_BRIDGE;
  bin.add('granite', slab(min, max, ROUND));
  const [wallLeft, wallRight] = MASK_WALL_X;
  const tie = (from: number, to: number) =>
    slab(
      [from, min[1] - TIE_DROP, min[2] - TIE_DEPTH],
      [to, max[1] + TIE_RISE, max[2] + TIE_DEPTH],
      ROUND,
    );
  bin.add('machined', tie(wallLeft, min[0]), tie(max[0], wallRight));
  SIDES.forEach((side) => {
    const face = faceOf(min, max, 'y', 1);
    studRow(
      bin,
      face,
      [min[0] + 0.1, side * (max[2] - 0.05)],
      [max[0] - 0.1, side * (max[2] - 0.05)],
      BOLT_OUT,
      BOLT_PITCH,
    );
  });
}

function addRails(bin: Bin): void {
  const [from, to] = MASK_RAILS.x;
  const top = MASK_BRIDGE.min[1];
  SIDES.forEach((side) => {
    const z = side * MASK_RAILS.z;
    bin.add(
      'rail',
      slab([from, MASK_RAILS.bottom, z - MASK_RAILS.half], [to, top, z + MASK_RAILS.half]),
    );
  });
  const track = MASK_TRACK;
  bin.add(
    'machined',
    slab([track.x[0], track.bottom, -track.halfZ], [track.x[1], top, track.halfZ], ROUND),
  );
}

function addShelf(bin: Bin): void {
  bin.add('frame', slab(MASK_CHAIN_SHELF.min, MASK_CHAIN_SHELF.max, ROUND));
}

function addCarriage(bin: Bin): void {
  const { halfX, halfZ, bottom, top } = MASK_CARRIAGE;
  const x = MASK_AT[0];
  bin.add('machined', slab([x - halfX, bottom, -halfZ], [x + halfX, top, halfZ], ROUND * 2));
  SIDES.forEach((side) => {
    const z = side * halfZ;
    const [near, far] = side > 0 ? [z, z + COVER.thick] : [z - COVER.thick, z];
    bin.add(
      'panel',
      slab(
        [x - COVER.halfX, bottom + COVER.bottom, near],
        [x + COVER.halfX, bottom + COVER.top, far],
        COVER.thick / 3,
      ),
    );
    const stripe = side > 0 ? [far, far + STRIPE.thick] : [near - STRIPE.thick, near];
    bin.add(
      'accent',
      slab(
        [x - COVER.halfX, bottom + STRIPE.bottom, stripe[0]],
        [x + COVER.halfX, bottom + STRIPE.bottom + STRIPE.tall, stripe[1]],
      ),
    );
    const edge = side * halfX;
    const [lo, hi] =
      side > 0 ? [x + edge, x + edge + SIDE_COVER.thick] : [x + edge - SIDE_COVER.thick, x + edge];
    bin.add(
      'panel',
      slab(
        [lo, bottom + COVER.bottom, -SIDE_COVER.halfZ],
        [hi, bottom + COVER.top, SIDE_COVER.halfZ],
        SIDE_COVER.thick / 3,
      ),
    );
  });
  RAILS_Z.forEach((z) =>
    [-MASK_BLOCK.offset, MASK_BLOCK.offset].forEach((offset) =>
      bin.add(
        'machined',
        slab(
          [x + offset - MASK_BLOCK.halfX, MASK_BLOCK.bottom, z - MASK_BLOCK.halfZ],
          [x + offset + MASK_BLOCK.halfX, MASK_BRIDGE.min[1], z + MASK_BLOCK.halfZ],
          ROUND / 2,
        ),
      ),
    ),
  );
}

function addTop(bin: Bin): void {
  const { halfX, halfZ, top } = MASK_CARRIAGE;
  const x = MASK_AT[0];
  const plateTop = top + TOP_PLATE.thick;
  const plateHalfX = halfX - TOP_PLATE.inset;
  const plateHalfZ = halfZ - TOP_PLATE.inset;
  bin.add(
    'panel',
    slab([x - plateHalfX, top, -plateHalfZ], [x + plateHalfX, plateTop, plateHalfZ], ROUND / 2),
  );
  const { columns, rows, gap, rise } = POCKETS;
  const width = (2 * (plateHalfX - gap) - gap * (columns - 1)) / columns;
  const depth = (2 * POCKETS.halfZ - gap * (rows - 1)) / rows;
  for (let column = 0; column < columns; column += 1) {
    for (let row = 0; row < rows; row += 1) {
      const left = x - plateHalfX + gap + column * (width + gap);
      const back = -POCKETS.halfZ + row * (depth + gap);
      bin.add(
        'machined',
        slab([left, plateTop, back], [left + width, plateTop + rise, back + depth], ROUND / 4),
      );
    }
  }
}

function addChuck(bin: Bin): void {
  const x = MASK_AT[0];
  const bottom = PLATE_TOP;
  const top = MASK_CARRIAGE.bottom;
  const half = CHUCK.half;
  bin.add('frame', slab([x - half, bottom, -half], [x + half, top, half], ROUND));
  const inner = half * CHUCK_INNER;
  bin.add(
    'machined',
    slab([x - inner, bottom - 0.002, -inner], [x + inner, top, inner], ROUND / 2),
  );
  SIDES.forEach((sx) =>
    SIDES.forEach((sz) => {
      const cx = x + sx * (PLATE_HALF - CHUCK.clampLong / 2);
      const outer = sz * (PLATE_HALF + CLAMP_REACH);
      const inner = sz * (PLATE_HALF - CHUCK.clampThick);
      bin.add(
        'flange',
        slab(
          [cx - CHUCK.clampLong / 2, PLATE_TOP - CHUCK.clampTall, Math.min(outer, inner)],
          [cx + CHUCK.clampLong / 2, PLATE_TOP, Math.max(outer, inner)],
        ),
      );
    }),
  );
}

export function buildMaskStage(context: PartContext, groups: MaskStageGroups): readonly Object3D[] {
  const chain = cableChain(MASK_CHAIN);
  const fixed = chain.fixed;
  addBridge(fixed);
  addRails(fixed);
  addShelf(fixed);
  const guides = fixed.build(context, PART, groups.fixed);
  chain.bend.build(context, PART, groups.bend);
  const moving = chain.moving;
  addCarriage(moving);
  addTop(moving);
  addChuck(moving);
  moving.build(context, PART, groups.carriage);
  return guides;
}
