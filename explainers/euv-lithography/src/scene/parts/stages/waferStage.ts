import { CylinderGeometry } from 'three';
import type { Object3D } from 'three';
import { mesh } from '../context';
import type { PartContext } from '../context';
import { washerAlongX } from '../kit';
import type { Bin } from '../optics/geo';
import { slab } from '../optics/geo';
import { cableChain } from './chain';
import {
  CHUCK_DISC,
  WAFER_AT,
  WAFER_BLOCK,
  WAFER_CARRIAGE,
  WAFER_CHAIN,
  WAFER_GRANITE,
  WAFER_RAILS,
  WAFER_THICK,
  WAFER_TRACK,
} from './dims';

const PART = 'waferStage';
const SIDES = [-1, 1] as const;
const ROUND = 0.004;
const CHUCK_SIDES = 48;
const STOP = { thick: 0.025, tall: 0.03, halfZ: 0.03 } as const;
const COVER_STRIPE = { bottom: 0.012, tall: 0.01, thick: 0.004 } as const;
const MIRROR_BAR = { thick: 0.012, tall: 0.026, halfZ: 0.15 } as const;

export interface WaferStageGroups {
  fixed: Object3D;
  carriage: Object3D;
  bend: Object3D;
}

function addBase(bin: Bin): void {
  const { min, max } = WAFER_GRANITE;
  bin.add('granite', slab(min, max, ROUND));
  const [from, to] = WAFER_RAILS.x;
  SIDES.forEach((side) => {
    const z = side * WAFER_RAILS.z;
    bin.add(
      'rail',
      slab(
        [from, WAFER_RAILS.bottom, z - WAFER_RAILS.half],
        [to, WAFER_RAILS.top, z + WAFER_RAILS.half],
      ),
    );
    [from, to].forEach((end) => {
      const [lo, hi] = end === from ? [end - STOP.thick, end] : [end, end + STOP.thick];
      bin.add(
        'machined',
        slab(
          [lo, WAFER_RAILS.bottom, z - STOP.halfZ],
          [hi, WAFER_RAILS.bottom + STOP.tall, z + STOP.halfZ],
          ROUND,
        ),
      );
    });
  });
  bin.add(
    'machined',
    slab(
      [WAFER_TRACK.x[0], WAFER_RAILS.bottom, -WAFER_TRACK.halfZ],
      [WAFER_TRACK.x[1], WAFER_TRACK.top, WAFER_TRACK.halfZ],
    ),
  );
}

function addCarriage(bin: Bin): void {
  const { halfX, halfZ, bottom, top, coverTop, coverHalf } = WAFER_CARRIAGE;
  const x = WAFER_AT[0];
  bin.add('machined', slab([x - halfX, bottom, -halfZ], [x + halfX, top, halfZ], ROUND));
  bin.add(
    'panelShade',
    slab([x - coverHalf, top, -coverHalf], [x + coverHalf, coverTop, coverHalf], ROUND / 2),
  );
  bin.add(
    'accent',
    slab(
      [x - coverHalf, bottom + COVER_STRIPE.bottom, halfZ],
      [x + coverHalf, bottom + COVER_STRIPE.bottom + COVER_STRIPE.tall, halfZ + COVER_STRIPE.thick],
    ),
  );
  SIDES.forEach((side) => {
    const edge = x + side * halfX;
    const [lo, hi] = side > 0 ? [edge - MIRROR_BAR.thick, edge] : [edge, edge + MIRROR_BAR.thick];
    bin.add(
      'mirror',
      slab([lo, top, -MIRROR_BAR.halfZ], [hi, top + MIRROR_BAR.tall, MIRROR_BAR.halfZ]),
    );
  });
  SIDES.forEach((side) =>
    [-WAFER_BLOCK.offset, WAFER_BLOCK.offset].forEach((offset) =>
      bin.add(
        'machined',
        slab(
          [
            x + offset - WAFER_BLOCK.halfX,
            WAFER_BLOCK.bottom,
            side * WAFER_RAILS.z - WAFER_BLOCK.halfZ,
          ],
          [
            x + offset + WAFER_BLOCK.halfX,
            WAFER_BLOCK.top,
            side * WAFER_RAILS.z + WAFER_BLOCK.halfZ,
          ],
          ROUND / 2,
        ),
      ),
    ),
  );
}

export function buildWaferStage(context: PartContext, groups: WaferStageGroups): void {
  const chain = cableChain(WAFER_CHAIN);
  addBase(chain.fixed);
  chain.fixed.build(context, PART, groups.fixed);
  chain.bend.build(context, PART, groups.bend);
  addCarriage(chain.moving);
  chain.moving.build(context, PART, groups.carriage);
  const bottom = WAFER_CARRIAGE.coverTop;
  const top = WAFER_AT[1] - WAFER_THICK;
  const height = top - bottom;
  const chuck = mesh(
    context,
    new CylinderGeometry(CHUCK_DISC.radius, CHUCK_DISC.radius, height, CHUCK_SIDES),
    PART,
    'machined',
  );
  chuck.position.set(WAFER_AT[0], (top + bottom) / 2, WAFER_AT[2]);
  const ring = mesh(
    context,
    washerAlongX(CHUCK_DISC.ringInner, CHUCK_DISC.ring, height).rotateZ(Math.PI / 2),
    PART,
    'ceramic',
  );
  ring.position.copy(chuck.position);
  groups.carriage.add(chuck, ring);
}
