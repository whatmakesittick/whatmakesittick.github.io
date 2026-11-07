import { describe, expect, it } from 'vitest';
import { Object3D, Vector3 } from 'three';
import {
  BLOW_MM,
  KEY,
  KEY_DIP_MM,
  KEY_LEVER,
  PLAYED_KEY,
  SHANK,
  SHIFT_MM,
  STRIKE_Z,
  STRING_Y,
  UPRIGHT,
  WIPPEN,
  keyX,
  mm,
} from '../model';
import {
  chaseTargetFor,
  damperHeadTop,
  hammerAngle,
  hammerHeadTop,
  jackAngle,
  jackRiseMm,
  keyAngle,
  keyFrontTop,
  repetitionAngle,
  uprightHammerAngle,
  wippenAngle,
} from './pose';

const DIGITS = 6;
const KEY_NUMBER = PLAYED_KEY.middle;

function rotatedAboutX(angle: number, point: [number, number, number]): Vector3 {
  const pivot = new Object3D();
  pivot.rotation.x = angle;
  const child = new Object3D();
  child.position.set(...point);
  pivot.add(child);
  pivot.updateMatrixWorld(true);
  return child.getWorldPosition(new Vector3());
}

describe('pose', () => {
  it('turns the key so its front goes down and its back end comes up', () => {
    const angle = keyAngle(KEY_DIP_MM);
    expect(rotatedAboutX(angle, [0, 0, KEY_LEVER.frontArm]).y).toBeCloseTo(-mm(KEY_DIP_MM), DIGITS);
    expect(rotatedAboutX(angle, [0, 0, -KEY_LEVER.capstanArm]).y).toBeGreaterThan(0);
  });

  it('turns the wippen so the jack end rises', () => {
    const lifted = rotatedAboutX(wippenAngle(KEY_DIP_MM), [0, 0, WIPPEN.jackArm]);
    expect(lifted.y).toBeCloseTo(mm(jackRiseMm(KEY_DIP_MM)), 4);
  });

  it('swings the hammer head up from below to the string', () => {
    expect(hammerAngle(BLOW_MM)).toBeGreaterThan(0);
    const top = hammerHeadTop(KEY_NUMBER, { hammerRiseMm: BLOW_MM, shiftMm: 0 });
    expect(top[1]).toBeCloseTo(STRING_Y, DIGITS);
    expect(top[2]).toBeCloseTo(STRIKE_Z, DIGITS);
    const rest = hammerHeadTop(KEY_NUMBER, { hammerRiseMm: 0, shiftMm: 0 });
    expect(rest[1]).toBeCloseTo(STRING_Y - mm(BLOW_MM), DIGITS);
  });

  it('moves the key, hammer and damper points with the una corda shift', () => {
    const shifted = { keyMm: 0, hammerRiseMm: 0, damperLiftMm: 0, shiftMm: SHIFT_MM };
    const x = keyX(KEY_NUMBER) + mm(SHIFT_MM);
    expect(keyFrontTop(KEY_NUMBER, shifted)[0]).toBeCloseTo(x, DIGITS);
    expect(hammerHeadTop(KEY_NUMBER, shifted)[0]).toBeCloseTo(x, DIGITS);
    expect(damperHeadTop(KEY_NUMBER, shifted)[0]).toBeCloseTo(x, DIGITS);
    expect(keyFrontTop(KEY_NUMBER, { keyMm: KEY_DIP_MM, shiftMm: 0 })[1]).toBeCloseTo(
      KEY.top - mm(KEY_DIP_MM),
      DIGITS,
    );
  });

  it('lifts the damper head by its lift', () => {
    const up = damperHeadTop(KEY_NUMBER, { damperLiftMm: 9, shiftMm: 0 });
    const down = damperHeadTop(KEY_NUMBER, { damperLiftMm: 0, shiftMm: 0 });
    expect(up[1] - down[1]).toBeCloseTo(mm(9), DIGITS);
  });

  it('tilts the jack out and keeps the repetition lever still at rest', () => {
    expect(jackAngle(0)).toBe(0);
    expect(jackAngle(1)).toBeGreaterThan(0);
    expect(repetitionAngle(1)).toBe(0);
    expect(repetitionAngle(0)).toBeLessThan(0);
  });

  it('swings the upright hammer toward its strings', () => {
    const head = rotatedAboutX(uprightHammerAngle(BLOW_MM), [0, UPRIGHT.shank, 0]);
    expect(head.z).toBeCloseTo(-mm(BLOW_MM), DIGITS);
  });

  it('chases the hammer head', () => {
    const pose = { hammerRiseMm: 20, shiftMm: 0 };
    expect(chaseTargetFor(KEY_NUMBER, pose)).toEqual({
      position: hammerHeadTop(KEY_NUMBER, pose),
      heading: 0,
      pitch: 0,
      roll: 0,
      span: SHANK,
    });
  });
});
