import { CapsuleGeometry, Group } from 'three';
import type { BufferGeometry, ColorRepresentation } from 'three';
import { STRUCTURE_GROUP } from '@core/scene/materials';
import { HULL, LIFEBOAT, LIFEBOATS, SEGMENTS } from '../../constants';
import type { LifeboatSpec } from '../../constants';
import { PAINT } from '../../finishes';
import { barGeometry, rodGeometry } from '../../geometry/bars';
import { mergePainted } from '../../geometry/merge';
import { partMesh } from '../context';
import type { PartContext } from '../context';

type Painted = readonly [BufferGeometry, ColorRepresentation];

const QUARTER_TURN = Math.PI / 2;
const CAP_SEGMENTS = 4;
const RADIAL_SEGMENTS = 12;
const HATCH = { radius: 0.55, height: 0.5 } as const;
const KEEL_SHARE = 0.55;
const DAVIT_REACH = 0.4;

function hull(spec: LifeboatSpec, z: number): Painted[] {
  const { length, radius, height, hangY } = LIFEBOAT;
  const body = new CapsuleGeometry(radius, length - radius * 2, CAP_SEGMENTS, RADIAL_SEGMENTS);
  body.rotateZ(QUARTER_TURN);
  body.scale(1, height, 1);
  body.translate(spec.x, hangY, z);
  const keel = new CapsuleGeometry(
    radius * KEEL_SHARE,
    length * KEEL_SHARE,
    CAP_SEGMENTS,
    RADIAL_SEGMENTS,
  );
  keel.rotateZ(QUARTER_TURN);
  keel.scale(1, height, 1);
  keel.translate(spec.x, hangY - radius * height * KEEL_SHARE, z);
  const hatchTop = hangY + radius * height + HATCH.height;
  const hatch = rodGeometry([spec.x, hangY, z], [spec.x, hatchTop, z], HATCH.radius, SEGMENTS.pipe);
  return [
    [body, PAINT.orange],
    [keel, PAINT.white],
    [hatch, PAINT.orange],
  ];
}

function davits(spec: LifeboatSpec, z: number): Painted[] {
  const edge = spec.side * (HULL.deck.size / 2);
  const top = HULL.deck.top + LIFEBOAT.height * 3;
  return [-1, 1].map((end): Painted => {
    const x = spec.x + (end * LIFEBOAT.length) / 3;
    const arm = barGeometry(
      [x, HULL.deck.top, edge],
      [x, top, z + spec.side * DAVIT_REACH],
      LIFEBOAT.davit,
    );
    return [arm, PAINT.trim];
  });
}

export function createLifeboats(context: PartContext): Group {
  const object = new Group();
  const parts = LIFEBOATS.flatMap((spec) => {
    const z = spec.side * (HULL.deck.size / 2 + LIFEBOAT.outboard);
    return [...hull(spec, z), ...davits(spec, z)];
  });
  object.add(partMesh(context, mergePainted(parts), STRUCTURE_GROUP, 'lifeboat'));
  return object;
}
