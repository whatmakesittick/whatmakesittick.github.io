import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { lawOfCosines, solveTwoBone } from './ik';

const UPPER = 0.4;
const LOWER = 0.3;

describe('lawOfCosines', () => {
  it('gives the hypotenuse at a right angle and the sum when straight', () => {
    expect(lawOfCosines(UPPER, LOWER, Math.PI / 2)).toBeCloseTo(0.5, 12);
    expect(lawOfCosines(UPPER, LOWER, Math.PI)).toBeCloseTo(UPPER + LOWER, 12);
  });
});

describe('solveTwoBone', () => {
  const root = new Vector3(0, 0, 0);
  const pole = new Vector3(0, 0, 1);

  it('keeps both bone lengths and bends towards the pole', () => {
    const tip = new Vector3(0.5, 0, 0);
    const joint = solveTwoBone(root, tip, UPPER, LOWER, pole, new Vector3());
    expect(joint.distanceTo(root)).toBeCloseTo(UPPER, 10);
    expect(joint.distanceTo(tip)).toBeCloseTo(LOWER, 10);
    expect(joint.z).toBeGreaterThan(0);
  });

  it('clamps a target that is out of reach to a nearly straight limb', () => {
    const tip = new Vector3(2, 0, 0);
    const joint = solveTwoBone(root, tip, UPPER, LOWER, pole, new Vector3());
    expect(joint.distanceTo(root)).toBeCloseTo(UPPER, 10);
    expect(joint.x).toBeCloseTo(UPPER, 3);
  });
});
