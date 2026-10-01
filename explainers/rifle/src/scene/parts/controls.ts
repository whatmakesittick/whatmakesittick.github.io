import { CapsuleGeometry, CylinderGeometry, Group, Shape, Vector2 } from 'three';
import { CHARGING_HANDLE, SELECTOR, TRIGGER } from '../../model/layout';
import { CHARGING_KNOB, SEGMENTS, SELECTOR_LEVER, TRIGGER_SHAPE } from '../constants';
import { boxPiece, piece, sidePiece } from '../geometry/pieces';
import { addPiece } from './context';
import type { PartContext } from './context';

const QUARTER_TURN = Math.PI / 2;
const CAP_SEGMENTS = 6;

const TRIGGER_OUTLINE: readonly (readonly [number, number])[] = [
  [-3.5, 3],
  [3.5, 3],
  [4, -6],
  [2, -13],
  [3, -20],
  [5, -25],
  [7.5, -27.5],
  [4.5, -28.8],
  [1, -26],
  [-1.5, -20],
  [-2.8, -12],
  [-3.5, -4],
];

const SELECTOR_OUTLINE: readonly (readonly [number, number])[] = [
  [-3, -4.5],
  [78, -4],
  [80, -7],
  [88, -7],
  [90, -4],
  [90, 6.5],
  [86, 8.5],
  [10, 6],
  [-3, 4.5],
];

function outlineShape(points: readonly (readonly [number, number])[]): Shape {
  return new Shape(points.map(([x, y]) => new Vector2(x, y)));
}

export function createTrigger(context: PartContext): Group {
  const group = new Group();
  const { halfWidth, bevel } = TRIGGER_SHAPE;
  addPiece(
    context,
    group,
    sidePiece(outlineShape(TRIGGER_OUTLINE), [-halfWidth, halfWidth], bevel),
    'trigger',
    context.looks.blued,
  );
  group.position.set(...TRIGGER.centre);
  return group;
}

export function createSelector(context: PartContext): Group {
  const group = new Group();
  const [x, y, surface] = SELECTOR.centre;
  const { thickness, bossRadius, bossHeight, autoAngle, tab } = SELECTOR_LEVER;
  const look = context.looks.steel;
  addPiece(
    context,
    group,
    sidePiece(outlineShape(SELECTOR_OUTLINE), [surface, surface + thickness]),
    'selector',
    look,
  );
  const boss = new CylinderGeometry(bossRadius, bossRadius, bossHeight, SEGMENTS.knob);
  boss.rotateX(QUARTER_TURN).translate(0, 0, surface + bossHeight / 2);
  addPiece(context, group, piece(boss), 'selector', look);
  addPiece(
    context,
    group,
    boxPiece({ x: tab.x, y: tab.y, z: [surface, surface + tab.height] }),
    'selector',
    look,
  );
  group.position.set(x, y, 0);
  group.rotation.z = autoAngle;
  return group;
}

export function createChargingHandle(context: PartContext): Group {
  const group = new Group();
  const { radius, length, arm } = CHARGING_KNOB;
  const centreX = (CHARGING_HANDLE.x[0] + CHARGING_HANDLE.x[1]) / 2;
  const centreY = (CHARGING_HANDLE.y[0] + CHARGING_HANDLE.y[1]) / 2;
  const outer = CHARGING_HANDLE.z[1];
  const knobLength = length + 2 * radius;
  const knob = new CapsuleGeometry(radius, length, CAP_SEGMENTS, SEGMENTS.knob);
  knob.rotateX(QUARTER_TURN).translate(centreX, centreY, outer - knobLength / 2);
  const look = context.looks.bright;
  addPiece(context, group, piece(knob), 'chargingHandle', look);
  addPiece(
    context,
    group,
    boxPiece({
      x: [centreX - radius * 0.6, centreX + radius * 0.6],
      y: arm.y,
      z: [CHARGING_HANDLE.z[0] - 2, outer - knobLength / 2],
    }),
    'chargingHandle',
    look,
  );
  return group;
}
