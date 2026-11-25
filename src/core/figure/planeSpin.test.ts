import { describe, expect, it } from 'vitest';
import { planeSpin } from './retarget';
import type { Hinge } from './retarget';
import { apply, fromAxisAngle, normalize, wrap } from './rotations';
import type { Mat, Vec } from './rotations';

const IDENTITY: Mat = fromAxisAngle([1, 0, 0], 0);
const REACH: Vec = [0.3, -0.35, 0.1];
const MIDDLE: Vec = [0.25, -0.05, 0.12];

function hinge(parent: Mat, middle: Vec): Hinge {
  return {
    parent,
    bone: [0.3, 0.01, -0.02],
    pre: fromAxisAngle([0, 1, 0], 0.2),
    next: [0.28, 0.02, 0.01],
    aim: [1, 0, 0],
    forward: [0, 0, 1],
    reach: apply(parent, REACH),
    middle: apply(parent, middle),
  };
}

describe('planeSpin', () => {
  it('follows the middle joint as it turns about the reach line', () => {
    const base = planeSpin(hinge(IDENTITY, MIDDLE));
    for (const turn of [-2.4, -0.7, 0.3, 1.9]) {
      const turned = apply(fromAxisAngle(normalize(REACH), turn), MIDDLE);
      expect(wrap(planeSpin(hinge(IDENTITY, turned)) - base - turn)).toBeCloseTo(0, 9);
    }
  });

  it('does not depend on how the parent joint is turned', () => {
    const parent = fromAxisAngle(normalize([0.4, -0.2, 0.9]), 1.3);
    expect(planeSpin(hinge(parent, MIDDLE))).toBeCloseTo(planeSpin(hinge(IDENTITY, MIDDLE)), 9);
  });
});
