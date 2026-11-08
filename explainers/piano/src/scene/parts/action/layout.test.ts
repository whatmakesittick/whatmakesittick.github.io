import { describe, expect, it } from 'vitest';
import type { ActionPose } from '../../../ids';
import {
  BLOW_MM,
  DAMPER,
  DAMPER_LIFT_MAX_MM,
  HAMMER,
  HAMMER_TOP_REST_Y,
  KEYS,
  LET_OFF_BUTTON,
  PLAYED_KEY,
  SHIFT_MM,
  STRINGS,
  STRING_Y,
  actionPoseAt,
  keyX,
  mm,
  stringPath,
  stringPlaneY,
} from '../../../model';
import { JACK_PIVOT, REPETITION_PIVOT } from './dimensions';
import {
  backCheckFaceZ,
  damperHead,
  damperLiftMm,
  detailedPose,
  hammerMassG,
  headSize,
} from './layout';

const DIGITS = 6;
const CYCLE_STEP = 25;
const CYCLE_UNITS = 1000;
const STRIKE_UNIT = 420;
const LET_OFF_UNIT = 380;
const RELEASE_UNIT = 400;
const REST: ActionPose = actionPoseAt(0, 'medium', 'none', 'middle');

function turned(angle: number, pivot: { y: number; z: number }, [y, z]: [number, number]) {
  const dy = y - pivot.y;
  const dz = z - pivot.z;
  return {
    y: pivot.y + dy * Math.cos(angle) - dz * Math.sin(angle),
    z: pivot.z + dy * Math.sin(angle) + dz * Math.cos(angle),
  };
}

describe('action layout', () => {
  it('scales the hammer heads from heavy bass to light treble', () => {
    expect(hammerMassG(1)).toBeGreaterThan(hammerMassG(KEYS));
    expect(headSize(1).depth).toBeGreaterThan(headSize(KEYS).depth);
    expect(headSize(PLAYED_KEY.middle).depth).toBeCloseTo(HAMMER.headDepth, DIGITS);
  });

  it('rests every head the blow under its own string plane', () => {
    expect(headSize(PLAYED_KEY.middle).top).toBeCloseTo(HAMMER_TOP_REST_Y, DIGITS);
    const bass = PLAYED_KEY.bass;
    expect(stringPlaneY(bass) - headSize(bass).top).toBeCloseTo(mm(BLOW_MM), DIGITS);
  });

  it('moves the head off the leftmost string with the una corda shift', () => {
    const half = headSize(PLAYED_KEY.middle).width / 2;
    const leftmost = -STRINGS.unisonSpacing;
    expect(-half).toBeLessThan(leftmost);
    expect(-half + mm(SHIFT_MM)).toBeGreaterThan(leftmost);
  });

  it('seats each damper on its own strings behind the strike line', () => {
    [PLAYED_KEY.bass, PLAYED_KEY.middle, 25].forEach((key) => {
      const head = damperHead(key);
      const { strike, back } = stringPath(key);
      const share = (DAMPER.z - strike[2]) / (back[2] - strike[2]);
      expect(head.x).toBeCloseTo(strike[0] + share * (back[0] - strike[0]), DIGITS);
      expect(head.y).toBe(stringPlaneY(key));
    });
    expect(damperHead(PLAYED_KEY.middle).x).toBeCloseTo(keyX(PLAYED_KEY.middle), DIGITS);
  });

  it('lifts the played damper with the key and fully with the pedal', () => {
    for (let unit = 0; unit < CYCLE_UNITS; unit += CYCLE_STEP) {
      const pose = actionPoseAt(unit, 'medium', 'none', 'middle');
      expect(damperLiftMm(pose.keyMm, 0)).toBeCloseTo(pose.damperLiftMm, DIGITS);
    }
    expect(damperLiftMm(0, 1)).toBe(DAMPER_LIFT_MAX_MM);
  });

  it('tips the jack top toward the player and drops its toe under the let-off button', () => {
    const escaped = detailedPose(actionPoseAt(LET_OFF_UNIT, 'medium', 'none', 'middle'), 0);
    const tail = turned(escaped.jack, JACK_PIVOT, [JACK_PIVOT.y + 0.012, LET_OFF_BUTTON.z]);
    const top = turned(escaped.jack, JACK_PIVOT, [JACK_PIVOT.y + 0.026, JACK_PIVOT.z]);
    expect(tail.y).toBeLessThan(JACK_PIVOT.y + 0.012);
    expect(top.z).toBeGreaterThan(JACK_PIVOT.z);
  });

  it('pushes the repetition lever tip down while the hammer flies', () => {
    const flying = detailedPose(actionPoseAt(RELEASE_UNIT, 'medium', 'none', 'middle'), 0);
    const tip = turned(flying.repetition, REPETITION_PIVOT, [REPETITION_PIVOT.y, -0.29]);
    expect(tip.y).toBeLessThan(REPETITION_PIVOT.y);
    expect(detailedPose(REST, 0).repetition).toBeCloseTo(0, DIGITS);
  });

  it('keeps the squashed felt crown on the string', () => {
    const pose = actionPoseAt(STRIKE_UNIT, 'hard', 'none', 'middle');
    expect(pose.feltSquashMm).toBeGreaterThan(0);
    const mapped = detailedPose(pose, 0);
    const size = headSize(PLAYED_KEY.middle);
    const crown = turned(mapped.hammer, { y: HAMMER.pivotY, z: HAMMER.pivotZ }, [
      size.top - mapped.feltSquash,
      size.centreZ,
    ]);
    expect(crown.y).toBeCloseTo(STRING_Y, 3);
  });

  it('keeps the back check behind the head in every register', () => {
    Object.values(PLAYED_KEY).forEach((key) => {
      expect(backCheckFaceZ(key)).toBeLessThan(headSize(key).centreZ - headSize(key).depth / 2);
    });
  });
});
