import { describe, expect, it } from 'vitest';
import { InstancedMesh, Matrix4, Mesh, Vector3 } from 'three';
import type { Object3D } from 'three';
import { isShown } from '@core/scene/parts';
import type { PartId } from '../../../ids';
import {
  DAMPER_LIFT_MAX,
  HAMMER_TOP_REST_Y,
  KEY,
  KEY_DIP_MM,
  PLAYED_KEY,
  SHIFT_MM,
  STRING_Y,
  keyX,
  mm,
} from '../../../model';
import type { Frame, PartContext, Section } from '../context';
import { stateAt, testContext } from '../keyboard/testState';
import type { Choices } from '../keyboard/testState';
import { createAction } from './action';

const FRAME: Frame = { delta: 1 / 60, elapsed: 0, cameraDistance: 1 };
const SETTLE_FRAMES = 90;
const TRIANGLE_BUDGET = 60_000;
const DIGITS = 4;
const STRIKE_UNIT = 410;
const KEY_DOWN_UNIT = 600;
const PARTS: readonly PartId[] = [
  'key',
  'capstan',
  'wippen',
  'jack',
  'letOffButton',
  'repetitionLever',
  'knuckle',
  'hammer',
  'backCheck',
  'damper',
  'actions',
];

function build(units = 0, choices: Choices = {}) {
  const context = testContext();
  const section = createAction(context);
  section.setState(stateAt(units, choices));
  return { context, section };
}

function settle(section: Section): void {
  for (let frame = 0; frame < SETTLE_FRAMES; frame += 1) section.animate?.(FRAME, stateAt(0));
}

function world(context: PartContext, section: Section, id: 'key' | 'hammer' | 'jack' | 'damper') {
  section.root.updateMatrixWorld(true);
  const anchor = context.anchors[id];
  if (!anchor) throw new Error(`missing ${id}`);
  return anchor.getWorldPosition(new Vector3());
}

function isHidden(mesh: InstancedMesh, index: number): boolean {
  const matrix = new Matrix4();
  mesh.getMatrixAt(index, matrix);
  return new Vector3().setFromMatrixScale(matrix).lengthSq() === 0;
}

function named(root: Object3D, name: string): Object3D {
  const found = root.getObjectByName(name);
  if (!found) throw new Error(`missing ${name}`);
  return found;
}

function triangles(root: Object3D): number {
  let total = 0;
  root.traverse((node) => {
    if (!(node instanceof Mesh)) return;
    const { index, attributes } = node.geometry;
    const count = (index?.count ?? attributes.position.count) / 3;
    total += node instanceof InstancedMesh ? count * node.count : count;
  });
  return total;
}

describe('createAction', () => {
  it('labels its parts, sets its anchors and stays within budget', () => {
    const { context, section } = build();
    expect([...context.labels.keys()].sort()).toEqual([...PARTS].sort());
    expect(Object.keys(context.anchors).sort()).toEqual(['damper', 'hammer', 'jack', 'key']);
    expect(triangles(section.root)).toBeLessThan(TRIANGLE_BUDGET);
  });

  it('hides the played key copy and shows it again for another register', () => {
    const { section } = build();
    const rows: InstancedMesh[] = [];
    named(section.root, 'actionShift').traverse((node) => {
      if (node instanceof InstancedMesh) rows.push(node);
    });
    const middle = PLAYED_KEY.middle - 1;
    expect(rows.every((row) => isHidden(row, middle))).toBe(true);
    section.setState(stateAt(0, { register: 'bass' }));
    expect(rows.some((row) => isHidden(row, middle))).toBe(false);
    expect(rows.every((row) => isHidden(row, PLAYED_KEY.bass - 1))).toBe(true);
  });

  it('presses the key, swings the hammer to the string and lifts the damper', () => {
    const rest = build();
    expect(world(rest.context, rest.section, 'hammer').y).toBeCloseTo(HAMMER_TOP_REST_Y, DIGITS);
    const strike = build(STRIKE_UNIT);
    expect(world(strike.context, strike.section, 'hammer').y).toBeCloseTo(STRING_Y, 2);
    const held = build(KEY_DOWN_UNIT);
    expect(world(held.context, held.section, 'key').y).toBeCloseTo(
      KEY.top - mm(KEY_DIP_MM),
      DIGITS,
    );
    const lift =
      world(held.context, held.section, 'damper').y - world(rest.context, rest.section, 'damper').y;
    expect(lift).toBeGreaterThan(0);
  });

  it('slides the action with the una corda shift while the dampers stay', () => {
    const { context, section } = build();
    const damperX = world(context, section, 'damper').x;
    section.setState(stateAt(0, { pedal: 'unaCorda' }));
    expect(section.animate?.(FRAME, stateAt(0))).toBe(true);
    settle(section);
    expect(section.animate?.(FRAME, stateAt(0))).toBe(false);
    expect(world(context, section, 'key').x).toBeCloseTo(
      keyX(PLAYED_KEY.middle) + mm(SHIFT_MM),
      DIGITS,
    );
    expect(world(context, section, 'damper').x).toBeCloseTo(damperX, DIGITS);
  });

  it('raises every damper with the sustain pedal', () => {
    const { context, section } = build();
    const before = world(context, section, 'damper').y;
    section.setState(stateAt(0, { pedal: 'sustain' }));
    settle(section);
    expect(named(section.root, 'dampers').position.y).toBeCloseTo(DAMPER_LIFT_MAX, DIGITS);
    expect(world(context, section, 'damper').y - before).toBeCloseTo(DAMPER_LIFT_MAX, DIGITS);
  });

  it('drops the played damper in the treble and caps the rails at the cut', () => {
    const { section } = build(0, { register: 'treble' });
    expect(isShown(named(section.root, 'damperLift'))).toBe(false);
    expect(named(section.root, 'actionCap').visible).toBe(true);
    expect(named(section.root, 'damperCap').visible).toBe(false);
    section.setState(stateAt(0, { view: { cutaway: false } }));
    expect(named(section.root, 'actionCap').visible).toBe(false);
  });
});
