import { CylinderGeometry, Group, Shape, Vector2 } from 'three';
import { SELECTOR, TRIGGER } from '../../model/layout';
import { SEGMENTS, SELECTOR_LEVER, TRIGGER_SHAPE } from '../constants';
import { FINISHES } from '../finishes';
import { boxPiece, piece, sidePiece, solidSide } from '../geometry/pieces';
import { addPiece, markDynamic } from './context';
import type { PartContext } from './context';

const QUARTER_TURN = Math.PI / 2;

type Outline = readonly (readonly [number, number])[];

const TRIGGER_OUTLINE: Outline = [
  [-3.5, 3],
  [60, 2.5],
  [60, 6.5],
  [64, 6.5],
  [64, 0],
  [6, -1.5],
  [5, -6],
  [2.5, -13],
  [2, -20],
  [2.5, -24.5],
  [4.5, -27.5],
  [1.5, -28.5],
  [-2.5, -25.5],
  [-4, -19],
  [-4.5, -12],
  [-4.5, -4],
];

const SELECTOR_OUTLINE: Outline = [
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

function outlineShape(points: Outline): Shape {
  return new Shape(points.map(([x, y]) => new Vector2(x, y)));
}

export class TriggerPart {
  readonly object = new Group();

  constructor(context: PartContext) {
    const { halfWidth, bevel } = TRIGGER_SHAPE;
    addPiece(
      context,
      this.object,
      solidSide(outlineShape(TRIGGER_OUTLINE), [-halfWidth, halfWidth], bevel),
      'trigger',
      context.looks.blued,
    );
    this.object.position.set(...TRIGGER.centre);
    markDynamic(this.object);
  }

  set(pull: number): void {
    this.object.rotation.z = (pull - 1) * TRIGGER.swing;
  }
}

export function createSelector(context: PartContext): Group {
  const group = new Group();
  const [x, y, surface] = SELECTOR.centre;
  const { thickness, bossRadius, bossHeight, autoAngle, tab } = SELECTOR_LEVER;
  const look = context.looks.steel;
  const ghost = FINISHES.ghost;
  addPiece(
    context,
    group,
    sidePiece(outlineShape(SELECTOR_OUTLINE), [surface, surface + thickness]),
    'selector',
    look,
    ghost,
  );
  const boss = new CylinderGeometry(bossRadius, bossRadius, bossHeight, SEGMENTS.knob);
  boss.rotateX(QUARTER_TURN).translate(0, 0, surface + bossHeight / 2);
  addPiece(context, group, piece(boss), 'selector', look, ghost);
  addPiece(
    context,
    group,
    boxPiece({ x: tab.x, y: tab.y, z: [surface, surface + tab.height] }),
    'selector',
    look,
    ghost,
  );
  group.position.set(x, y, 0);
  group.rotation.z = autoAngle;
  return group;
}
