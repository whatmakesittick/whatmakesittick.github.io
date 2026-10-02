import { Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { CAMERA_TWEEN_SECONDS } from './constants';
import { CameraTween } from './cameraTween';
import type { CameraPose } from './frameBox';

const FROM: CameraPose = { position: new Vector3(0, 3, 4), target: new Vector3(0, 0, 0) };
const TO: CameraPose = { position: new Vector3(6, 2, 0), target: new Vector3(1, 1, 0) };
const SHIFT = new Vector3(10, -2, 5);
const HALFWAY = CAMERA_TWEEN_SECONDS / 2;
const PIVOT = new Vector3(2, 0, 2);
const QUARTER_TURN = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI / 2);

function turned(point: Vector3): Vector3 {
  return point.clone().sub(PIVOT).applyQuaternion(QUARTER_TURN).add(PIVOT);
}

function expectCloseTo(actual: Vector3, expected: Vector3): void {
  expect(actual.distanceTo(expected)).toBeCloseTo(0);
}

describe('CameraTween', () => {
  it('moves the whole tween by a shift without changing its path', () => {
    const plain = new CameraTween(FROM, TO);
    const shifted = new CameraTween(FROM, TO);
    plain.advance(HALFWAY / 2);
    shifted.advance(HALFWAY / 2);
    shifted.shift(SHIFT);
    const expected = plain.advance(HALFWAY);
    const actual = shifted.advance(HALFWAY);
    expectCloseTo(actual.position, expected.position.clone().add(SHIFT));
    expectCloseTo(actual.target, expected.target.clone().add(SHIFT));
  });

  it('ends at the shifted pose', () => {
    const tween = new CameraTween(FROM, TO);
    tween.shift(SHIFT);
    const end = tween.advance(CAMERA_TWEEN_SECONDS);
    expect(tween.finished).toBe(true);
    expectCloseTo(end.position, TO.position.clone().add(SHIFT));
    expectCloseTo(end.target, TO.target.clone().add(SHIFT));
  });

  it('turns the whole tween about a pivot', () => {
    const plain = new CameraTween(FROM, TO);
    const spun = new CameraTween(FROM, TO);
    spun.turn(PIVOT, QUARTER_TURN);
    const expected = plain.advance(HALFWAY);
    const actual = spun.advance(HALFWAY);
    expectCloseTo(actual.position, turned(expected.position));
    expectCloseTo(actual.target, turned(expected.target));
  });

  it('leaves the poses it was given untouched', () => {
    const tween = new CameraTween(FROM, TO);
    tween.shift(SHIFT);
    expect(FROM.position.toArray()).toEqual([0, 3, 4]);
    expect(TO.target.toArray()).toEqual([1, 1, 0]);
  });
});
