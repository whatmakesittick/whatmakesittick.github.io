import { BoxGeometry, CylinderGeometry, Matrix4 } from 'three';
import type { BufferGeometry, Object3D } from 'three';
import { SIDE_SIGNS } from '../../../model';
import { finishMesh } from '../context';
import type { PartContext } from '../context';
import { merged } from '../inset/strokes';
import { WHEEL_RAIL } from './constants';
import { instances } from './cut';
import { LINE_UP_FINISHES } from './finishes';

const PART = 'wheelRail';
const INSULATOR_SEGMENTS = 12;
const FRAME_HALF = { x: 0.55, a: 0.45 };
const ARM_THICKNESS = 0.05;
const HEAD_DEPTH = 0.08;
const HEAD_THICKNESS = 0.035;
const HEAD_OFFSET_X = 0.75;

const P = WHEEL_RAIL.pantograph;
const ROOF = WHEEL_RAIL.bottom + WHEEL_RAIL.outline.height;
const FRAME_Y = ROOF + P.insulatorHeight;

function slab(
  width: number,
  height: number,
  depth: number,
  x: number,
  y: number,
  z: number,
): BoxGeometry {
  const geometry = new BoxGeometry(width, height, depth);
  geometry.translate(x, y, z);
  return geometry;
}

function horn(side: number): BufferGeometry {
  const geometry = new BoxGeometry(HEAD_DEPTH, HEAD_THICKNESS, P.hornLength);
  geometry.rotateX(side * Math.atan2(P.hornDrop, P.hornLength));
  geometry.translate(
    P.x + HEAD_OFFSET_X,
    ROOF + P.headLift - P.hornDrop / 2,
    side * (P.headHalf + P.hornLength / 2),
  );
  return geometry;
}

function frameGeometry(): BufferGeometry {
  const parts = [
    slab(
      FRAME_HALF.x * 2,
      P.frameThickness,
      FRAME_HALF.a * 2,
      P.x,
      FRAME_Y + P.frameThickness / 2,
      0,
    ),
    slab(
      P.armLength,
      ARM_THICKNESS,
      ARM_THICKNESS,
      P.x - P.insulatorX + P.armLength / 2,
      ROOF + P.armLift,
      0,
    ),
    slab(HEAD_DEPTH, HEAD_THICKNESS, P.headHalf * 2, P.x + HEAD_OFFSET_X, ROOF + P.headLift, 0),
    ...SIDE_SIGNS.map((side) => horn(side)),
  ];
  return merged(parts);
}

export function buildPantograph(context: PartContext, parent: Object3D): void {
  const insulator = new CylinderGeometry(
    P.insulatorRadius,
    P.insulatorRadius,
    P.insulatorHeight,
    INSULATOR_SEGMENTS,
  );
  const matrices = SIDE_SIGNS.flatMap((along) =>
    SIDE_SIGNS.map((side) =>
      new Matrix4().makeTranslation(
        P.x + along * P.insulatorX,
        ROOF + P.insulatorHeight / 2,
        side * P.insulatorA,
      ),
    ),
  );
  parent.add(
    instances(context, insulator, PART, LINE_UP_FINISHES.insulator, matrices),
    finishMesh(context, frameGeometry(), PART, LINE_UP_FINISHES.pantograph),
  );
}
