import type { BufferGeometry, Vector3Tuple } from 'three';
import { box } from '@core/scene/geometry/box';
import { SIDE_SIGNS } from '../../../../../model';
import { rod } from '../geometry/rod';
import { BODY, PANTOGRAPH } from './constants';
import { kneePoint } from './layout';
import type { Pantograph } from './layout';
import { roofHeightAt } from './section';

type Planar = readonly [number, number];

const { frame, head, horn } = PANTOGRAPH;
const FRAME_BOTTOM = BODY.top + PANTOGRAPH.standoff;
const FRAME_TOP = FRAME_BOTTOM + frame.thickness;

function baseFrame(x: number): BufferGeometry {
  return box({
    minX: x - frame.halfLength,
    maxX: x + frame.halfLength,
    minY: FRAME_BOTTOM,
    maxY: FRAME_TOP,
    minZ: -frame.halfWidth,
    maxZ: frame.halfWidth,
  });
}

function insulators(x: number): BufferGeometry[] {
  const { insulatorX, insulatorZ } = PANTOGRAPH;
  return SIDE_SIGNS.flatMap((end) =>
    SIDE_SIGNS.map((side) =>
      rod({
        from: [x + end * insulatorX, roofHeightAt(BODY, side * insulatorZ), side * insulatorZ],
        to: [x + end * insulatorX, FRAME_BOTTOM, side * insulatorZ],
        radius: PANTOGRAPH.insulatorRadius,
        sides: PANTOGRAPH.armSides,
      }),
    ),
  );
}

function headPoint(x: number, raised: boolean): Planar {
  const y = raised ? PANTOGRAPH.raisedHeadY : FRAME_TOP + PANTOGRAPH.foldedLift;
  return [x - PANTOGRAPH.headBack, y];
}

function arm(from: Planar, to: Planar, radius: number): BufferGeometry {
  return rod({ from: [...from, 0], to: [...to, 0], radius, sides: PANTOGRAPH.armSides });
}

function panHead([x, y]: Planar): BufferGeometry[] {
  const bar = box({
    minX: x - head.length / 2,
    maxX: x + head.length / 2,
    minY: y - head.height / 2,
    maxY: y + head.height / 2,
    minZ: -head.halfWidth,
    maxZ: head.halfWidth,
  });
  const horns = SIDE_SIGNS.map((side) => {
    const from: Vector3Tuple = [x, y, side * head.halfWidth];
    const to: Vector3Tuple = [x, y - horn.drop, side * (head.halfWidth + horn.spread)];
    return rod({ from, to, radius: horn.radius, sides: horn.sides });
  });
  return [bar, ...horns];
}

export function pantograph({ x, raised }: Pantograph): BufferGeometry[] {
  const hinge: Planar = [x - PANTOGRAPH.hingeBack, FRAME_TOP];
  const top = headPoint(x, raised);
  const knee = kneePoint(hinge, top, PANTOGRAPH.lowerArm, PANTOGRAPH.upperArm);
  return [
    baseFrame(x),
    ...insulators(x),
    arm(hinge, knee, PANTOGRAPH.armRadius.lower),
    arm(knee, top, PANTOGRAPH.armRadius.upper),
    ...panHead(top),
  ];
}
